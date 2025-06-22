const express = require('express');
const { createProxyMiddleware } = require('http-proxy-middleware');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const { PrismaClient } = require('@prisma/client');
const cookieParser = require('cookie-parser');

const app = express();
const prisma = new PrismaClient();

// Configuration
const ADMIN_PORT = process.env.ADMIN_PORT || 3001;
const STUDIO_PORT = process.env.STUDIO_PORT || 5555;
const JWT_SECRET = process.env.JWT_SECRET_ADMIN || 'your-secret-key';

app.use(express.json());
app.use(cookieParser());
app.use(express.static('public'));

// Middleware d'authentification
const authenticateAdmin = async (req, res, next) => {
  // Essayer d'abord le cookie, puis le header
  const token = req.cookies.adminToken || req.headers.authorization?.split(' ')[1];
  
  if (!token) {
    // Si c'est une requête vers /admin/studio, rediriger vers la page de connexion
    if (req.path.startsWith('/admin/studio')) {
      return res.redirect('/admin');
    }
    return res.status(401).json({ error: 'Token d\'authentification requis' });
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    const user = await prisma.user.findUnique({
      where: { id: decoded.id },
      select: { id: true, role: true, email: true }
    });

    if (!user || user.role !== 'Manager') {
      return res.status(403).json({ error: 'Accès non autorisé' });
    }

    req.user = user;
    next();
  } catch (error) {
    // Si c'est une requête vers /admin/studio, rediriger vers la page de connexion
    if (req.path.startsWith('/admin/studio')) {
      return res.redirect('/admin');
    }
    return res.status(401).json({ error: 'Token invalide' });
  }
};

// Route de connexion admin
app.post('/admin/login', async (req, res) => {
  const { email, password } = req.body;

  try {
    const user = await prisma.user.findUnique({
      where: { email },
      select: { id: true, role: true, email: true, motDePasseHash: true }
    });

    if (!user || user.role !== 'Manager') {
      return res.status(401).json({ error: 'Identifiants invalides' });
    }

    const isValidPassword = await bcrypt.compare(password, user.motDePasseHash);
    if (!isValidPassword) {
      return res.status(401).json({ error: 'Identifiants invalides' });
    }

    const token = jwt.sign(
      { id: user.id, role: user.role },
      JWT_SECRET,
      { expiresIn: '24h' }
    );

    // Définir le cookie sécurisé
    res.cookie('adminToken', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 24 * 60 * 60 * 1000 // 24 heures
    });

    res.json({
      token,
      user: { id: user.id, email: user.email, role: user.role }
    });
  } catch (error) {
    console.error('Erreur de connexion:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// Page de connexion
app.get('/admin', (req, res) => {
  res.send(`
    <!DOCTYPE html>
    <html>
    <head>
        <title>Administration Yessal</title>
        <style>
            body { font-family: Arial, sans-serif; max-width: 400px; margin: 100px auto; padding: 20px; }
            .form-group { margin-bottom: 15px; }
            input { width: 100%; padding: 10px; border: 1px solid #ddd; border-radius: 4px; }
            button { width: 100%; padding: 12px; background: #007bff; color: white; border: none; border-radius: 4px; cursor: pointer; }
            button:hover { background: #0056b3; }
            .error { color: red; margin-top: 10px; }
        </style>
    </head>
    <body>
        <h2>Connexion Administration</h2>
        <form id="loginForm">
            <div class="form-group">
                <input type="email" id="email" placeholder="Email" required>
            </div>
            <div class="form-group">
                <input type="password" id="password" placeholder="Mot de passe" required>
            </div>
            <button type="submit">Se connecter</button>
        </form>
        <div id="error" class="error"></div>

        <script>
            document.getElementById('loginForm').addEventListener('submit', async (e) => {
                e.preventDefault();
                const email = document.getElementById('email').value;
                const password = document.getElementById('password').value;
                
                try {
                    const response = await fetch('/admin/login', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ email, password })
                    });
                    
                    const data = await response.json();
                    
                    if (response.ok) {
                        // Le token est maintenant dans un cookie, pas besoin de localStorage
                        window.location.href = '/admin/studio';
                    } else {
                        document.getElementById('error').textContent = data.error;
                    }
                } catch (error) {
                    document.getElementById('error').textContent = 'Erreur de connexion';
                }
            });
        </script>
    </body>
    </html>
  `);
});

// Route vers Prisma Studio sécurisée
app.use('/admin/studio', authenticateAdmin, createProxyMiddleware({
  target: `http://localhost:${STUDIO_PORT}`,
  changeOrigin: true,
  pathRewrite: {
    '^/admin/studio': ''
  }
}));

// Vérification du token pour les requêtes AJAX
app.get('/admin/verify', authenticateAdmin, (req, res) => {
  res.json({ valid: true, user: req.user });
});

// Déconnexion
app.post('/admin/logout', (req, res) => {
  res.clearCookie('adminToken');
  res.json({ message: 'Déconnecté avec succès' });
});

// Route de déconnexion GET pour plus de facilité
app.get('/admin/logout', (req, res) => {
  res.clearCookie('adminToken');
  res.redirect('/admin');
});

// Démarrage du serveur
app.listen(ADMIN_PORT, () => {
  console.log(`🔒 Serveur d'administration sécurisé sur http://localhost:${ADMIN_PORT}/admin`);
  console.log(`📊 Prisma Studio accessible via http://localhost:${ADMIN_PORT}/admin/studio`);
});

module.exports = app; 