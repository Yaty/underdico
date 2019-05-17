FROM node:10-alpine
WORKDIR /usr/src/app

# Install app dependencies
COPY package*.json ./
RUN npm install

# Bundle app source
COPY . .
RUN npm run build

# For testing
ENV MONGOMS_DOWNLOAD_DIR=/usr/src/app/node_modules/mongodb-memory-server-core

EXPOSE 8080
CMD ["node", "."]
