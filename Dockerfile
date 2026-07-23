FROM node:24.18.0-alpine3.23 AS build-stage

WORKDIR /app

ARG VITE_API_URL
ENV VITE_API_URL=$VITE_API_URL

COPY package.json package-lock.json ./
RUN npm install --global npm@12.0.1 \
    && npm ci

COPY . .
RUN npm run build

FROM nginx:1.31.3

COPY --from=build-stage /app/dist/ /usr/share/nginx/html

COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY nginx-backend-not-found.conf /etc/nginx/extra-conf.d/backend-not-found.conf
