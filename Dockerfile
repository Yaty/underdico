FROM node:10-alpine
WORKDIR /usr/src/app

# Install app dependencies
COPY package*.json ./
RUN npm install

# Bundle app source
COPY . .
RUN npm run build && npm prune --production && rm -rf src test config

EXPOSE 8080
CMD ["node", "."]
