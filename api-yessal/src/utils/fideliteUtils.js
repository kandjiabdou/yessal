const prisma = require('./prismaClient');

/**
 * Génère un numéro de carte de fidélité unique
 * Format: TH + 5 chiffres uniques + 3 premières lettres du nom en majuscules
 * Exemple: TH23468KASS
 * 
 * @param {string} nom - Le nom du client
 * @returns {Promise<string>} - Le numéro de carte de fidélité généré
 */
const genererNumeroCarteFidelite = async (nom) => {
  if (!nom || typeof nom !== 'string') {
    throw new Error('Le nom est requis pour générer le numéro de carte');
  }

  // Extraire les 3 premières lettres du nom en majuscules
  const troisLettresNom = nom.replace(/[^A-Za-z]/g, '')
                            .substring(0, 3)
                            .toUpperCase()
                            .padEnd(3, 'X'); // Remplir avec X si moins de 3 lettres

  let numeroUnique;
  let tentatives = 0;
  const maxTentatives = 100;

  do {
    // Générer 5 chiffres aléatoirement
    const cinqChiffres = Math.floor(10000 + Math.random() * 90000).toString();
    
    // Construire le numéro complet
    numeroUnique = `TH${cinqChiffres}${troisLettresNom}`;
    
    // Vérifier l'unicité dans la base de données
    const existeDeja = await prisma.fidelite.findUnique({
      where: { numeroCarteFidelite: numeroUnique }
    });
    
    tentatives++;
    
    if (!existeDeja) {
      return numeroUnique;
    }
    
    if (tentatives >= maxTentatives) {
      throw new Error('Impossible de générer un numéro de carte unique après plusieurs tentatives');
    }
  } while (true);
};

/**
 * Valide le format d'un numéro de carte de fidélité
 * @param {string} numeroCarte - Le numéro à valider
 * @returns {boolean} - True si le format est valide
 */
const validerFormatNumeroCarte = (numeroCarte) => {
  if (!numeroCarte || typeof numeroCarte !== 'string') {
    return false;
  }
  
  // Format: TH + 5 chiffres + 3 lettres
  const regex = /^TH\d{5}[A-Z]{3}$/;
  return regex.test(numeroCarte);
};

/**
 * Extrait les informations d'un numéro de carte de fidélité
 * @param {string} numeroCarte - Le numéro de carte
 * @returns {Object} - Les informations extraites
 */
const extraireInfosNumeroCarte = (numeroCarte) => {
  if (!validerFormatNumeroCarte(numeroCarte)) {
    throw new Error('Format de numéro de carte invalide');
  }
  
  return {
    ville: numeroCarte.substring(0, 2), // TH
    numero: numeroCarte.substring(2, 7), // 5 chiffres
    lettresNom: numeroCarte.substring(7, 10) // 3 lettres
  };
};

module.exports = {
  genererNumeroCarteFidelite,
  validerFormatNumeroCarte,
  extraireInfosNumeroCarte
}; 