FROM node:22-alpine

WORKDIR /app

COPY package*.json ./
RUN npm install --omit=dev

COPY . .

ENV NODE_ENV=production
ENV SERVICE_NAME=auth-service

HEALTHCHECK --interval=10s --timeout=5s --retries=3 --start-period=20s CMD node -e "const http=require('node:http');const port=process.env.PORT||4000;const req=http.get({host:'127.0.0.1',port,path:'/health',timeout:3000},res=>process.exit(res.statusCode<400?0:1));req.on('error',()=>process.exit(1));req.on('timeout',()=>{req.destroy();process.exit(1);});"

CMD ["sh", "-c", "node ${SERVICE_NAME}/server.js"]
