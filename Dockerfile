# syntax=docker/dockerfile:1

# ---------- build ----------
FROM node:22-alpine AS builder
WORKDIR /app

# O lock entra no build: `npm ci` instala exatamente o que foi testado.
COPY package.json package-lock.json ./
RUN npm ci

COPY . .
RUN npm run build
RUN test -f dist/src/main.js || (echo "Erro: dist/src/main.js não encontrado após build" && exit 1)

# ---------- runtime ----------
FROM node:22-alpine
ENV NODE_ENV=production
WORKDIR /app

COPY package.json package-lock.json ./
# Só dependências de produção, a partir do lock.
RUN npm ci --omit=dev && npm cache clean --force

COPY --from=builder /app/dist ./dist

# Não roda como root.
RUN chown -R node:node /app
USER node

EXPOSE 3000

# Liveness (`GET /health`): o processo responde. A readiness (`/health/ready`) é do balanceador.
HEALTHCHECK --interval=30s --timeout=5s --start-period=40s --retries=3 \
  CMD node -e "fetch('http://127.0.0.1:'+(process.env.PORT||3000)+'/health').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"

# Variáveis de ambiente vêm de `docker run -e`/`--env-file` (nunca da imagem).
CMD ["node", "dist/src/main.js"]
