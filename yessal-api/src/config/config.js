require('dotenv').config();

const config = {
  // Server configuration
  port: process.env.PORT || 4520,
  nodeEnv: process.env.NODE_ENV || 'development',
  
  // JWT configuration
  jwt: {
    secret: process.env.JWT_SECRET || 'your-secret-key',
    expiresIn: '1d',
    refreshSecret: process.env.JWT_REFRESH_SECRET || 'your-refresh-secret-key',
    refreshExpiresIn: '7d'
  },
  
  // Database configuration
  database: {
    url: process.env.DATABASE_URL || 'mysql://user:password@localhost:3306/yessal'
  },
  
  // Logging configuration
  logging: {
    level: process.env.LOG_LEVEL || 'info'
  },
  
  // Business rules
  business: {
    minOrderWeightKg: 6,
    fidelityStandardFreeWashEvery: 10,
    fidelityDetailedFreeKgEvery: 70, 
    fidelityDetailedFreeKgAmount: 6,
    premium: {
      monthlyLimitKg: 50 // Default monthly limit for premium clients
    }
  },
  
  // SMS configuration
  sms: {
    apiKey: process.env.SMS_API_KEY,
    apiUrl: process.env.SMS_API_URL
  },

  google: {
    clientId: process.env.GOOGLE_CLIENT_ID
  }
};

module.exports = config;
