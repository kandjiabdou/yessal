# Étape 1 : Builder l'application
FROM node:22-alpine AS builder
WORKDIR /app

# Copier les fichiers de configuration et installer les dépendances
COPY package.json package-lock.json* ./
RUN npm install

# Copier le code source
COPY . .

# Variables d'environnement pour le build
ARG VITE_API_URL=https://api.yessal.sn/api
ARG VITE_DEV_PORT=4510
ARG VITE_APP_NAME="Yessal Manager"
ARG VITE_APP_VERSION="1.0.0"
ARG VITE_DEV_MODE=false
ARG VITE_LOG_LEVEL=error

ENV VITE_API_URL=$VITE_API_URL
ENV VITE_DEV_PORT=$VITE_DEV_PORT
ENV VITE_APP_NAME=$VITE_APP_NAME
ENV VITE_APP_VERSION=$VITE_APP_VERSION
ENV VITE_DEV_MODE=$VITE_DEV_MODE
ENV VITE_LOG_LEVEL=$VITE_LOG_LEVEL

# Build de l'application
RUN npm run build

# Étape 2 : Serveur de production avec Nginx
FROM nginx:alpine
WORKDIR /usr/share/nginx/html

# Supprimer les fichiers par défaut de Nginx
RUN rm -rf ./*

# Copier les fichiers buildés depuis l'étape builder
COPY --from=builder /app/dist .

# Copier la configuration Nginx personnalisée
COPY nginx.conf /etc/nginx/nginx.conf

# Créer un utilisateur non-root pour la sécurité
RUN addgroup -g 1001 -S nginx
RUN adduser -S nginx -u 1001

# Exposer le port 80
EXPOSE 80

# Lancer Nginx
CMD ["nginx", "-g", "daemon off;"] 