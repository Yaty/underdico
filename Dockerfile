FROM node:10-alpine
WORKDIR /usr/src/app

# Install app dependencies
COPY package*.json ts-config*.json ./
RUN npm install

# Bundle app source
COPY src .
RUN npm run build

# Remove dev dependencies
RUN npm prune --production && rm -rf src

EXPOSE 8080
CMD ["node", "."]
