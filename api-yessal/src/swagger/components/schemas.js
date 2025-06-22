/**
 * @swagger
 * components:
 *   schemas:
 *     Error:
 *       type: object
 *       properties:
 *         success:
 *           type: boolean
 *         message:
 *           type: string
 *     Login:
 *       type: object
 *       properties:
 *         email:
 *           type: string
 *           format: email
 *           description: User email
 *         telephone:
 *           type: string
 *           description: User phone number
 *         password:
 *           type: string
 *           format: password
 *           description: User password
 *       oneOf:
 *         - required: ['email', 'password']
 *         - required: ['telephone', 'password']
 *     UserCreate:
 *       type: object
 *       required: ['role', 'nom', 'prenom', 'password']
 *       properties:
 *         role:
 *           type: string
 *           enum: ['Client', 'Manager']
 *           description: User role
 *         nom:
 *           type: string
 *           description: User last name
 *         prenom:
 *           type: string
 *           description: User first name
 *         email:
 *           type: string
 *           format: email
 *           description: User email (unique)
 *         telephone:
 *           type: string
 *           description: User phone number (unique)
 *         password:
 *           type: string
 *           format: password
 *           minLength: 6
 *           description: User password
 *         adresseText:
 *           type: string
 *           description: User address
 *         latitude:
 *           type: number
 *           description: User address latitude
 *         longitude:
 *           type: number
 *           description: User address longitude
 *         typeClient:
 *           type: string
 *           enum: ['Standard', 'Premium']
 *           description: Client type (only for Client role)
 *         siteLavagePrincipalGerantId:
 *           type: integer
 *           description: Primary laundry site ID (only for Manager role)
 *     LivreurCreate:
 *       type: object
 *       required: ['nom', 'prenom']
 *       properties:
 *         nom:
 *           type: string
 *           example: "Diallo"
 *         prenom:
 *           type: string
 *           example: "Mamadou"
 *         email:
 *           type: string
 *           format: email
 *           example: "mamadou.diallo@example.com"
 *         telephone:
 *           type: string
 *           example: "+221777777777"
 *         adresseText:
 *           type: string
 *           example: "123 Rue de la Livraison, Dakar"
 *         moyenLivraison:
 *           type: string
 *           example: "Moto"
 *         statutDisponibilite:
 *           type: boolean
 *           default: true
 *           example: true
 *     LivreurUpdate:
 *       type: object
 *       properties:
 *         nom:
 *           type: string
 *           example: "Diallo"
 *         prenom:
 *           type: string
 *           example: "Mamadou"
 *         email:
 *           type: string
 *           format: email
 *           example: "mamadou.diallo@example.com"
 *         telephone:
 *           type: string
 *           example: "+221777777777"
 *         adresseText:
 *           type: string
 *           example: "123 Rue de la Livraison, Dakar"
 *         moyenLivraison:
 *           type: string
 *           example: "Moto"
 *         statutDisponibilite:
 *           type: boolean
 *           example: true
 *     OrderCreate:
 *       type: object
 *       required: ['siteLavageId', 'masseClientIndicativeKg', 'formuleCommande']
 *       properties:
 *         clientUserId:
 *           type: integer
 *           example: 1
 *         clientInvite:
 *           type: object
 *           properties:
 *             nom:
 *               type: string
 *               example: "Sow"
 *             telephone:
 *               type: string
 *               example: "+221777777777"
 *             email:
 *               type: string
 *               example: "client@example.com"
 *         siteLavageId:
 *           type: integer
 *           example: 1
 *         estEnLivraison:
 *           type: boolean
 *           default: false
 *           example: true
 *         adresseLivraison:
 *           type: object
 *           properties:
 *             adresseText:
 *               type: string
 *               example: "456 Avenue de la Livraison, Dakar"
 *             latitude:
 *               type: number
 *               example: 14.7167
 *             longitude:
 *               type: number
 *               example: -17.4677
 *         masseClientIndicativeKg:
 *           type: number
 *           minimum: 6
 *           example: 8.5
 *         formuleCommande:
 *           type: string
 *           enum: ['Standard', 'Abonnement', 'AuKilo', 'Premium', 'Detail']
 *           example: "Standard"
 *         options:
 *           type: object
 *           properties:
 *             aOptionRepassage:
 *               type: boolean
 *               default: false
 *               example: true
 *             aOptionSechage:
 *               type: boolean
 *               default: false
 *               example: true
 *     OrderUpdate:
 *       type: object
 *       properties:
 *         masseVerifieeKg:
 *           type: number
 *           minimum: 6
 *           example: 8.5
 *         statut:
 *           type: string
 *           enum: ['PrisEnCharge', 'LavageEnCours', 'Repassage', 'Collecte', 'Livraison', 'Livre']
 *           example: "LavageEnCours"
 *         livreurId:
 *           type: integer
 *           example: 1
 *         gerantReceptionUserId:
 *           type: integer
 *           example: 2
 *         modePaiement:
 *           type: string
 *           enum: ['Espece', 'MobileMoney', 'Autre']
 *           example: "MobileMoney"
 *         options:
 *           type: object
 *           properties:
 *             aOptionRepassage:
 *               type: boolean
 *               example: true
 *             aOptionSechage:
 *               type: boolean
 *               example: true
 */