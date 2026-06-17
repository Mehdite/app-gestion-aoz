FROM node:20-alpine
WORKDIR /app

RUN apk add --no-cache openssl

COPY package*.json ./
RUN npm install

COPY . .
RUN npx prisma generate
RUN npm run build
RUN ls -la dist/

ENV NODE_ENV=production
EXPOSE 3001
CMD ["node", "dist/main"]
