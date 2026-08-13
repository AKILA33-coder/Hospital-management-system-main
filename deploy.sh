#!/bin/bash

# Hospital Management System - AWS Quick Deploy Script
# Run this on your EC2 instance after SSH connection

set -e

echo "🏥 Hospital Management System - AWS Deployment"
echo "================================================"

# Update system
echo "📦 Updating system packages..."
sudo yum update -y

# Install Node.js
echo "📦 Installing Node.js..."
sudo yum install nodejs npm git -y

# Install global packages
echo "📦 Installing PM2 and other tools..."
sudo npm install -g pm2

# Clone repository (replace with your repo URL)
echo "📂 Cloning repository..."
cd /home/ec2-user
if [ ! -d "Hospital-management-system-main" ]; then
    git clone https://github.com/YOUR_USERNAME/Hospital-management-system-main.git
fi

# Install backend dependencies
echo "📦 Installing backend dependencies..."
cd Hospital-management-system-main/backend
npm install

# Create .env file
echo "🔐 Creating .env file..."
cat > .env << EOF
NODE_ENV=production
PORT=5000
DB_HOST=${DB_HOST:-your-rds-endpoint.amazonaws.com}
DB_USER=${DB_USER:-admin}
DB_PASSWORD=${DB_PASSWORD:-change-me}
DB_NAME=hms_db
JWT_SECRET=${JWT_SECRET:-change-this-to-random-string}
FRONTEND_URL=${FRONTEND_URL:-http://localhost:3000}
EOF

echo "✅ .env file created. Update it with your actual credentials:"
echo "   nano .env"

# Start backend with PM2
echo "🚀 Starting backend server..."
pm2 start server.js --name "hms-backend"
pm2 startup
pm2 save

# Install and start Nginx (optional)
read -p "Install Nginx reverse proxy? (y/n) " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    echo "📦 Installing Nginx..."
    sudo yum install nginx -y
    
    # Backup original config
    sudo cp /etc/nginx/nginx.conf /etc/nginx/nginx.conf.bak
    
    # Update Nginx config
    sudo tee /etc/nginx/nginx.conf > /dev/null << 'EOF'
user nginx;
worker_processes auto;
error_log /var/log/nginx/error.log;
pid /run/nginx.pid;

events {
    worker_connections 1024;
}

http {
    log_format main '$remote_addr - $remote_user [$time_local] "$request" '
                    '$status $body_bytes_sent "$http_referer" '
                    '"$http_user_agent" "$http_x_forwarded_for"';
    
    access_log /var/log/nginx/access.log main;
    
    sendfile on;
    tcp_nopush on;
    tcp_nodelay on;
    keepalive_timeout 65;
    types_hash_max_size 2048;
    
    include /etc/nginx/mime.types;
    default_type application/octet-stream;
    
    server {
        listen 80 default_server;
        listen [::]:80 default_server;
        server_name _;
        
        location / {
            proxy_pass http://localhost:5000;
            proxy_http_version 1.1;
            proxy_set_header Upgrade $http_upgrade;
            proxy_set_header Connection 'upgrade';
            proxy_set_header Host $host;
            proxy_set_header X-Real-IP $remote_addr;
            proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
            proxy_set_header X-Forwarded-Proto $scheme;
            proxy_cache_bypass $http_upgrade;
        }
    }
}
EOF
    
    sudo systemctl start nginx
    sudo systemctl enable nginx
    echo "✅ Nginx configured and started"
fi

echo ""
echo "================================================"
echo "✅ Deployment Complete!"
echo "================================================"
echo ""
echo "📋 Next Steps:"
echo "1. Update .env file with your RDS credentials"
echo "2. Get your EC2 Public IP from AWS Console"
echo "3. Test backend: curl http://YOUR_PUBLIC_IP/health"
echo "4. Deploy frontend to S3"
echo ""
echo "📊 Check logs:"
echo "   pm2 logs hms-backend"
echo ""
echo "🔄 Restart server:"
echo "   pm2 restart hms-backend"
