# Étape 1 : Builder l’application
FROM node:22-alpine AS builder
WORKDIR /app

# Copier les fichiers de configuration et installer les dépendances
COPY package.json package-lock.json* ./
RUN npm install

# Copier l’ensemble du code
COPY . .

# Build de l’application (client et serveur)
RUN npm run build

# Étape 2 : Construire l’image de production
FROM node:22-alpine
WORKDIR /app

# Copier le build depuis l'étape builder
COPY --from=builder /app .

# Installer les dépendances de production et cross-env
RUN npm install --production
RUN npm install cross-env

# Exposer le port utilisé
EXPOSE 4000

# Lancer l’application en production
CMD ["npm", "start"]