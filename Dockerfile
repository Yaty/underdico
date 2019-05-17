FROM node:10-alpine
WORKDIR /usr/src/app

# Install app dependencies
COPY package*.json tsconfig*.json ./
RUN npm install

# Bundle app source
COPY . .
RUN npm run build

EXPOSE 8080
CMD ["node", "."]
