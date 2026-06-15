#!/bin/bash

# Exit immediately if any command fails
set -e

echo "🚀 Starting deployment process..."

# Define backup variables
BACKUP_DIR="./backups"
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
BACKUP_FILE="$BACKUP_DIR/data_backup_$TIMESTAMP.tar.gz"

# 1. Backup the database/data volume
echo "📦 Backing up ./data to $BACKUP_FILE..."
mkdir -p "$BACKUP_DIR"
tar -czf "$BACKUP_FILE" ./data
echo "✅ Backup complete."

# 2. Pull the latest code
echo "📥 Pulling latest code from git..."
git pull

# 3. Spin down current containers
echo "🛑 Stopping current containers..."
docker compose down

# 4 & 5. Build and bring containers back up in detached mode
echo "🏗️ Building and starting new containers..."
docker compose up --build -d

# Clean up dangling images to save disk space (Optional but recommended)
echo "🧹 Cleaning up old Docker images..."
docker image prune -f

echo "🎉 Deployment successful!"


# RUNNING: 
# to make sure it has permissions: chmod +x deploy.sh
# ./deploy.sh