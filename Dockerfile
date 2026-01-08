# Use Node.js
FROM node:18

# Set working directory
WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm install

# Copy rest of code
COPY . .

# Expose backend port
EXPOSE 3000

# Start the app
CMD ["node", "server.js"]
