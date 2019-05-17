FROM node:10-alpine
WORKDIR /usr/src/app

# Install app dependencies
COPY package*.json ./
RUN npm install

# Bundle app source
COPY . .
RUN npm run build

# For testing
RUN apk add wget && wget -q "https://fastdl.mongodb.org/linux/mongodb-linux-x86_64-4.0.9.tgz" && tar zxvf "mongodb-linux-x86_64-4.0.9.tgz" && rm "mongodb-linux-x86_64-4.0.9.tgz"
ENV MONGOMS_SYSTEM_BINARY="/usr/src/app/mongodb-linux-x86_64-4.0.9/bin/mongod"
RUN find "./mongodb-linux-x86_64-4.0.9/bin"

EXPOSE 8080
CMD ["node", "."]
