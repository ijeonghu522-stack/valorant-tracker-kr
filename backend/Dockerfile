FROM node:22-alpine
WORKDIR /app
COPY package*.json ./
RUN npm install --omit=dev --no-audit --no-fund
COPY server.js admin.html ./
RUN mkdir -p data
EXPOSE 8787
CMD ["node", "server.js"]
