/**
 * Configuration centralisée des variables d'environnement
 * Utilise les variables d'environnement Vite avec des valeurs par défaut
 */

interface AppConfig {
  api: {
    baseUrl: string;
  };
  app: {
    name: string;
    version: string;
  };
  dev: {
    mode: boolean;
    logLevel: 'debug' | 'info' | 'warn' | 'error';
    port: number;
  };
}

/**
 * Récupère une variable d'environnement avec une valeur par défaut
 */
function getEnvVar(key: string, defaultValue: string): string {
  const value = import.meta.env[key];
  if (value === undefined || value === null || value === '') {
    return defaultValue;
  }
  return value;
}

/**
 * Récupère une variable d'environnement booléenne
 */
function getEnvBool(key: string, defaultValue: boolean): boolean {
  const value = import.meta.env[key];
  if (value === undefined || value === null || value === '') {
    return defaultValue;
  }
  return value.toLowerCase() === 'true';
}

/**
 * Récupère une variable d'environnement numérique
 */
function getEnvNumber(key: string, defaultValue: number): number {
  const value = import.meta.env[key];
  if (value === undefined || value === null || value === '') {
    return defaultValue;
  }
  const parsed = parseInt(value, 10);
  return isNaN(parsed) ? defaultValue : parsed;
}

/**
 * Configuration de l'application
 */
export const config: AppConfig = {
  api: {
    baseUrl: getEnvVar('VITE_API_URL', 'http://localhost:4520/api'),
  },
  app: {
    name: getEnvVar('VITE_APP_NAME', 'Yessal Manager'),
    version: getEnvVar('VITE_APP_VERSION', '1.0.0'),
  },
  dev: {
    mode: getEnvBool('VITE_DEV_MODE', true),
    logLevel: getEnvVar('VITE_LOG_LEVEL', 'debug') as 'debug' | 'info' | 'warn' | 'error',
    port: getEnvNumber('VITE_DEV_PORT', 4510),
  },
};

/**
 * URL de base de l'API (raccourci pour faciliter l'utilisation)
 */
export const API_URL = config.api.baseUrl;

/**
 * Validation de la configuration au démarrage
 */
function validateConfig(): void {
  if (!config.api.baseUrl) {
    throw new Error('VITE_API_URL is required');
  }

  // Vérifier que l'URL de l'API est valide
  try {
    new URL(config.api.baseUrl);
  } catch (error) {
    throw new Error(`Invalid API URL: ${config.api.baseUrl}`);
  }

  // Log de la configuration en mode développement
  if (config.dev.mode && config.dev.logLevel === 'debug') {
    console.log('🔧 Configuration loaded:', {
      apiUrl: config.api.baseUrl,
      appName: config.app.name,
      version: config.app.version,
      devMode: config.dev.mode,
    });
  }
}

// Valider la configuration au chargement du module
validateConfig();

export default config; 