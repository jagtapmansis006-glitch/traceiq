FROM node:22-slim
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
RUN npm run setup
ENV PORT=8090
ENV HMEM_DIR=/data
EXPOSE 8090
CMD ["npx", "tsx", "server.ts"]
