FROM node:22-alpine

WORKDIR /app

COPY package*.json ./
RUN npm install --omit=dev

COPY . .

ENV NODE_ENV=production
ENV SERVICE_NAME=auth-service

CMD ["sh", "-c", "node ${SERVICE_NAME}/server.js"]
