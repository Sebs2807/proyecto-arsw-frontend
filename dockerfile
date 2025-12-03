# Dockerfile
# Base image
FROM node:24-alpine

# Carpeta de trabajo
WORKDIR /app

# Copiar package.json y lockfile primero (para cachear dependencias)
COPY package*.json ./

# Instalar dependencias
RUN npm install

# Copiar todo el proyecto
COPY . .

# Exponer el puerto (Vite default)
EXPOSE 5173

# Argumento para ambiente
ARG ENV=local
ENV NODE_ENV=$ENV

# Comando por defecto para desarrollo (sobre el host)
CMD ["npm", "run", "dev"]
