require('dotenv').config();
const app = require('./src/app');
const logger = require('./src/utils/logger');
const config = require('./src/config/config');

const port = config.port;

app.listen(port, () => {
  logger.info(`Server is running on port ${port}`);
});
