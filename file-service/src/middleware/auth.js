import jwt from 'jsonwebtoken';

/**
 * Middleware d'authentification par API Key
 * Vérifie que la requête provient d'une application autorisée
 */
export const authenticateApiKey = (req, res, next) => {
  const apiKey = req.headers['x-api-key'];
  
  if (!apiKey) {
    return res.status(401).json({
      success: false,
      message: 'API Key manquante'
    });
  }
  
  const validKeys = [
    process.env.API_KEY_MANAGER,
    process.env.API_KEY_ASSOCIE
  ];
  
  if (!validKeys.includes(apiKey)) {
    return res.status(403).json({
      success: false,
      message: 'API Key invalide'
    });
  }
  
  // Identifier la source de la requête
  if (apiKey === process.env.API_KEY_MANAGER) {
    req.source = 'manager';
  } else if (apiKey === process.env.API_KEY_ASSOCIE) {
    req.source = 'associe';
  }
  
  next();
};

/**
 * Middleware pour vérifier le token de téléchargement
 */
export const verifyDownloadToken = (req, res, next) => {
  const token = req.query.token;
  
  if (!token) {
    return res.status(401).json({
      success: false,
      message: 'Token de téléchargement manquant'
    });
  }
  
  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET);
    
    // Vérifier que le token correspond au fichier demandé
    if (payload.fileId !== req.params.fileId) {
      return res.status(403).json({
        success: false,
        message: 'Token invalide pour ce fichier'
      });
    }
    
    req.tokenPayload = payload;
    next();
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({
        success: false,
        message: 'Token expiré'
      });
    }
    
    return res.status(403).json({
      success: false,
      message: 'Token invalide'
    });
  }
};
