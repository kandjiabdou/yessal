# Étape 1 : Builder l'application
FROM node:22-alpine AS builder
WORKDIR /app

# Copier les fichiers de configuration et installer les dépendances
COPY package.json package-lock.json* ./
RUN npm install

# Copier le code source
COPY . .

# Générer le client Prisma
RUN npx prisma generate

# Étape 2 : Construire l'image de production
FROM node:22-alpine
WORKDIR /app

# Installer les dépendances système nécessaires pour Prisma
RUN apk add --no-cache openssl

# Copier les fichiers depuis l'étape builder
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package.json ./package.json
COPY --from=builder /app/package-lock.json ./package-lock.json
COPY . .

# Générer le client Prisma en production
RUN npx prisma generate

# Créer un utilisateur non-root pour la sécurité
RUN addgroup -g 1001 -S nodejs
RUN adduser -S nodejs -u 1001

# Changer la propriété des fichiers
RUN chown -R nodejs:nodejs /app
USER nodejs

# Exposer le port utilisé par l'API
EXPOSE 4520

# Lancer l'application
CMD ["npm", "start"] 