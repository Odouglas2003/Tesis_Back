# ===========================================
# Node Base
# ===========================================
FROM node:24-alpine AS base

# Suprimir warnings de deprecación
ENV NODE_OPTIONS="--no-deprecation"

WORKDIR /app

# Copiamos solo los archivos de dependencias
COPY package.json package-lock.json* ./


# ===========================================
# Stage 2: Dependencies
# ===========================================
FROM base AS dependencies

# Desactivar Husky en Docker
ENV HUSKY=0

# Instalar solo dependencias de producción usando npm
RUN npm ci --only=production

# Copiar el resto del código fuente
COPY . .


# ===========================================
# Stage 3: Build
# ===========================================
FROM base AS build

# Instalar TODAS las dependencias (incluyendo dev) para generar la documentación
COPY package.json package-lock.json* ./
RUN npm ci

# Copiar el resto del código
COPY . .

# Construir documentación u otros artefactos de build
RUN npm run build-docs


# ===========================================
# Stage 4: Production
# ===========================================
FROM base AS production

WORKDIR /app

# Copiar aplicación construida desde la etapa build
COPY --from=build /app .

# Copiar node_modules de producción desde la etapa dependencies
COPY --from=dependencies /app/node_modules/ ./node_modules/

# Crear usuario no root por seguridad
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nestjs -u 1001 && \
    chown -R nestjs:nodejs /app

# Cambiar a usuario no root
USER nestjs

EXPOSE 3000

# Comando de arranque
CMD ["sh", "-c", "printf '========================================\\n🏭 Starting in PRODUCTION mode\\n========================================\\n' && npm run start:prod"]
