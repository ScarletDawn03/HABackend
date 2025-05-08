# Use Node.js base image
FROM node:18

# Create app directory
WORKDIR /usr/src/app

# Copy files
COPY package*.json ./
RUN npm install

COPY . .

EXPOSE 8080
CMD [ "node", "src/server.js" ]
