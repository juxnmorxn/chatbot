FROM node:22-alpine AS builder

WORKDIR /app

# Copiar manifiestos
COPY package.json package-lock.json* bun.lock* ./
RUN npm install --legacy-peer-deps

# Copiar todo el código y compilar tanto el chatbot como olt-manager
COPY . .
RUN npm run build

# Imagen final ligera de producción
FROM node:22-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production

# Instalar dependencias necesarias
COPY package.json package-lock.json* bun.lock* ./
RUN npm install --omit=dev --legacy-peer-deps

# Copiar dist y configuraciones
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/server.js ./server.js
COPY --from=builder /app/data ./data
COPY --from=builder /app/olt-manager/config ./dist/config
COPY --from=builder /app/olt-manager/public ./public
COPY --from=builder /app/olt-manager/public ./dist/public
COPY --from=builder /app/olt-manager/public ./olt-manager/public

EXPOSE 3000
EXPOSE 3001

# Script de arranque para ambos procesos (Chatbot en 3000 y OLT Manager en 3001)
CMD ["sh", "-c", "node dist/olt-server.js & node dist/server.js"]
