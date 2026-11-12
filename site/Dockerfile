FROM node:24-alpine AS build
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --no-audit --no-fund
COPY . .
# URL de l'API qui reçoit les demandes de démo.
ARG VITE_API_URL
# Adresse publique du site (balises canoniques, sitemap) et identifiant du site dans Umami.
ARG VITE_SITE_URL
ARG VITE_UMAMI_WEBSITE_ID
RUN npm run build

FROM nginx:1.27-alpine
COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/dist /usr/share/nginx/html
EXPOSE 80
