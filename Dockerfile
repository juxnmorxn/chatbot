# ==========================================
# Dockerfile para Chatbot ISP en Hostinger VPS
# ==========================================
FROM node:22-alpine AS builder

WORKDIR /app

# Copiar manifiestos e instalar dependencias
COPY package.json package-lock.json* bun.lock* ./
RUN npm install --legacy-peer-deps

# Copiar código fuente y compilar
COPY . .
RUN npm run build

# ==========================================
# Imagen final de producción
# ==========================================
FROM node:22-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production
ENV PORT=3000

# Instalar sólo dependencias de producción
COPY package.json package-lock.json* bun.lock* ./
RUN npm install --omit=dev --legacy-peer-deps

# Copiar bundle compilado y archivos necesarios
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/server.js ./server.js
COPY --from=builder /app/data ./data

# Puerto expuesto
EXPOSE 3000

# Comando de inicio
CMD ["node", "dist/server.js"]
