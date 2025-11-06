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
