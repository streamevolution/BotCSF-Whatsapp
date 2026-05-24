FROM node:18-slim

# Instala el navegador Chromium oficial y limpia la basura
RUN apt-get update && apt-get install -y chromium \
    --no-install-recommends \
    && rm -rf /var/lib/apt/lists/*

# Configura la carpeta de trabajo
WORKDIR /app

# Copia los archivos e instala tu bot
COPY package.json ./
RUN npm install

# Copia todo el código y lo enciende
COPY . .
CMD ["node", "index.js"]
