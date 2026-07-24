FROM node:24.18.0-alpine3.23@sha256:595398b0081eacda8e1c4c5b97b76cd1020e4d58a8ebcb4843b9bca1e79e7436 AS build-stage

WORKDIR /app

ARG VITE_API_URL
ENV VITE_API_URL=$VITE_API_URL
ARG VITE_ML_API_URL
ENV VITE_ML_API_URL=$VITE_ML_API_URL

COPY package.json package-lock.json ./
RUN npm install --global npm@12.0.1 \
    && npm ci

COPY . .
RUN npm run build

FROM nginx:1.31.3@sha256:5a88c9c45479443d7be2eadc894b4ed0a9801bae03d97a5760ae13b5c2005942

COPY --from=build-stage /app/dist/ /usr/share/nginx/html

COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY nginx-backend-not-found.conf /etc/nginx/extra-conf.d/backend-not-found.conf
