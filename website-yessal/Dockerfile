# Étape 1 : Builder l'application
FROM node:22-alpine AS builder
WORKDIR /app
COPY package.json package-lock.json* ./
RUN npm install
COPY . .
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
RUN npm run build

# Étape 2 : Serveur de production avec Nginx
FROM nginx:alpine
WORKDIR /usr/share/nginx/html
RUN rm -rf ./*
COPY --from=builder /app/dist .
# Les 2 lignes ajoutées :
COPY nginx/manager.yessal.sn.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]