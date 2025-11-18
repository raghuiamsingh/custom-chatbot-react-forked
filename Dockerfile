# ---------- Frontend build ----------
    FROM node:18 AS build-frontend
    WORKDIR /app
    COPY package*.json ./
    RUN npm ci
    COPY . .
    RUN npm run build
    
    # ---------- Backend runtime ----------
    FROM node:18 AS runtime
    WORKDIR /app
    
    # copy server dependencies
    COPY server/package*.json ./server/
    WORKDIR /app/server
    RUN npm ci --omit=dev
    WORKDIR /app
    
    # copy server source
    COPY server ./server
    
    # copy built frontend into server/public
    COPY --from=build-frontend /app/dist ./server/public
    
    ENV NODE_ENV=production
    ENV PORT=3001
    EXPOSE 3001
    
    # BotDojo API credentials must be provided in request body as initData field (encrypted or plain JSON) for each API request
    
    WORKDIR /app/server
    CMD ["node", "server.js"]
    