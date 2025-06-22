require('dotenv').config();
const app = require('./src/app');
const config = require('./src/config/config');

const port = config.port;

app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});
