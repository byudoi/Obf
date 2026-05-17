FROM node:16-bullseye-slim

# Instalar Lua para correr Hercules
RUN apt-get update && apt-get install -y lua5.3 && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Copiar package files
COPY package*.json ./

# Instalar dependencias
RUN npm install

# Copiar todo el proyecto
COPY . .

# Compilar TypeScript
RUN npm run build

CMD ["npm", "start"]
