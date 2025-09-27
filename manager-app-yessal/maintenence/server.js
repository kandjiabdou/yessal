const express = require("express");
const path = require("path");

const app = express();
const PORT = process.env.PORT || 4510;

// Sert les fichiers statiques depuis le dossier public
app.use(express.static(path.join(__dirname, "public")));

app.listen(PORT, () => {
  console.log(`🚧 Site de maintenance disponible sur http://localhost:${PORT}`);
});
