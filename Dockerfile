Dockerfile

# Base image with Node.js 18
FROM node:18  

# Create a working directory
WORKDIR /app

# Copy package.json and package-lock.json (if exists)
COPY package*.json ./

# Install dependencies
RUN npm install

# Copy your application code (if not using package.json scripts)
# COPY . .

# Expose port (adjust if needed)
EXPOSE 3000

# Start the application (replace with your command)
CMD ["npm", "start"]