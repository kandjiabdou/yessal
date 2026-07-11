require('dotenv').config();
const app = require('./src/app');
const config = require('./src/config/config');
const sessionService = require('./src/services/sessionService');

const port = config.port;

app.listen(port, () => {
  console.log(`Server is running on port ${port}`);

  // Initialise la persistance des sessions de travail (best-effort).
  // En l'absence de Redis, les sessions restent en mémoire (comportement historique).
  sessionService.init().catch((err) => {
    console.warn('Initialisation des sessions ignorée:', err.message);
  });
});
