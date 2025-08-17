FROM node:22-alpine

WORKDIR /app

COPY package*.json ./
# Install all dependencies including dev for building
RUN npm ci

COPY . .
RUN npm run build

# Remove dev dependencies after build
RUN npm prune --production

EXPOSE 3000

CMD ["node", "dist/index.js"]