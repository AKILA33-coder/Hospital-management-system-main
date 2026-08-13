# Hospital Management System - AWS Deployment Guide

## AWS Free Tier Benefits (12 months)
- **EC2**: 750 hours/month (t2.micro)
- **RDS**: 750 hours/month (db.t2.micro, 20GB storage)
- **S3**: 5GB storage, 20,000 GET requests, 2,000 PUT requests
- **CloudFront**: 50GB data transfer out per month
- **Total**: Completely free for 12 months for this application!

---

## Complete Deployment Steps

### **Step 1: Create AWS Account**
1. Go to [aws.amazon.com](https://aws.amazon.com)
2. Click "Create AWS Account"
3. Provide email, password, and billing info
4. Verify email and complete setup

---

### **Step 2: Deploy MySQL Database (RDS)**

#### 2.1 Create RDS Instance
1. Go to **RDS Dashboard** → **Create database**
2. **Engine**: MySQL 8.0
3. **DB Instance Identifier**: `hms-db`
4. **Master username**: `admin`
5. **Master password**: Create strong password (save it!)
6. **Instance class**: `db.t2.micro` (Free tier eligible)
7. **Storage**: `20 GB` (Free tier eligible)
8. **Public accessibility**: YES
9. **Backup retention**: 7 days
10. **Click Create Database** (takes 5-10 minutes)

#### 2.2 Get Connection Details
After database is created:
1. Click on your database
2. Copy **Endpoint** (looks like: `hms-db.xxxxx.us-east-1.rds.amazonaws.com`)
3. Note: **Username**: admin, **Password**: (your password)

#### 2.3 Create Security Group Rule
1. In RDS dashboard, click your database
2. Under **Security group rules**, click the security group
3. Go to **Inbound rules** → **Edit**
4. Add rule:
   - Type: MySQL/Aurora
   - Protocol: TCP
   - Port: 3306
   - Source: 0.0.0.0/0 (allows all IPs)
5. Click Save

#### 2.4 Initialize Database
1. Download MySQL Workbench or use any MySQL client
2. Connect using:
   ```
   Host: hms-db.xxxxx.us-east-1.rds.amazonaws.com
   Port: 3306
   User: admin
   Password: (your password)
   ```
3. Run `schema.sql` from your project to create tables

---

### **Step 3: Deploy Backend (Node.js on EC2)**

#### 3.1 Launch EC2 Instance
1. Go to **EC2 Dashboard** → **Launch Instance**
2. **Name**: `hms-backend`
3. **AMI**: Amazon Linux 2 (Free tier eligible)
4. **Instance type**: `t2.micro` (Free tier)
5. **Key pair**: Create new key pair → Download `.pem` file (SAVE THIS!)
6. **Security group**:
   - Inbound Rule 1: SSH, Port 22, Source: 0.0.0.0/0
   - Inbound Rule 2: HTTP, Port 80, Source: 0.0.0.0/0
   - Inbound Rule 3: Custom TCP, Port 5000, Source: 0.0.0.0/0
7. **Storage**: 30 GB (Free tier eligible)
8. Click **Launch Instance**

#### 3.2 Connect to EC2
Windows Command Prompt:
```bash
cd Downloads
# Change permissions (one-time)
icacls "your-key.pem" /inheritance:r /grant:r "%username%:F"

# Connect
ssh -i "your-key.pem" ec2-user@your-ec2-public-ip
```

#### 3.3 Install Node.js & Dependencies
```bash
sudo yum update -y
sudo yum install nodejs npm git -y

# Verify installation
node --version
npm --version
```

#### 3.4 Deploy Backend Code
```bash
cd /home/ec2-user
git clone https://github.com/your-username/your-repo.git
cd Hospital-management-system-main/backend
npm install
```

#### 3.5 Create Production Environment File
```bash
sudo nano .env
```

Add:
```
NODE_ENV=production
PORT=5000
DB_HOST=hms-db.xxxxx.us-east-1.rds.amazonaws.com
DB_USER=admin
DB_PASSWORD=your-rds-password
DB_NAME=hms_db
JWT_SECRET=your-super-secret-key-change-this
FRONTEND_URL=https://your-frontend-domain.com
```

Save: `Ctrl+X` → `Y` → `Enter`

#### 3.6 Install PM2 (Process Manager)
```bash
sudo npm install -g pm2
pm2 start server.js --name "hms-backend"
pm2 startup
pm2 save
```

#### 3.7 (Optional) Setup Nginx as Reverse Proxy
```bash
sudo yum install nginx -y
sudo nano /etc/nginx/nginx.conf
```

Replace server block with:
```nginx
server {
    listen 80;
    server_name _;

    location / {
        proxy_pass http://localhost:5000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
```

Start Nginx:
```bash
sudo systemctl start nginx
sudo systemctl enable nginx
```

---

### **Step 4: Deploy Frontend (React on S3 + CloudFront)**

#### 4.1 Build React App
```bash
cd frontend
npm run build
# Creates a 'build' folder
```

#### 4.2 Create S3 Bucket
1. Go to **S3 Dashboard** → **Create bucket**
2. **Bucket name**: `hms-frontend-yourname` (must be globally unique)
3. **Region**: us-east-1
4. **Block Public Access**: Uncheck all boxes
5. Click **Create bucket**

#### 4.3 Upload Build Files
1. Open your bucket
2. Click **Upload** → Select all files from `frontend/build` folder
3. Upload complete folder structure

#### 4.4 Enable Static Website Hosting
1. Click bucket → **Properties**
2. Scroll to **Static website hosting** → **Edit**
3. Enable → **Host a static website**
4. **Index document**: `index.html`
5. **Error document**: `index.html`
6. Save

#### 4.5 Update Bucket Policy
1. Click **Permissions** → **Bucket policy** → **Edit**
2. Paste:
```json
{
    "Version": "2012-10-17",
    "Statement": [
        {
            "Sid": "PublicReadGetObject",
            "Effect": "Allow",
            "Principal": "*",
            "Action": "s3:GetObject",
            "Resource": "arn:aws:s3:::hms-frontend-yourname/*"
        }
    ]
}
```

#### 4.6 Setup CloudFront (CDN)
1. Go to **CloudFront** → **Create distribution**
2. **Origin domain**: Select your S3 bucket
3. **Origin access**: Legacy access (for public access)
4. **Viewer protocol policy**: Redirect HTTP to HTTPS
5. **Default root object**: `index.html`
6. **Create distribution** (takes 5-10 minutes)
7. Copy **Distribution domain name** (e.g., `d123.cloudfront.net`)

#### 4.7 Update Frontend API URL
Before rebuilding, update `frontend/src/utils/api.js`:
```javascript
const API_BASE = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';
const api = axios.create({ baseURL: API_BASE });
```

Create `.env` file in `frontend/`:
```
REACT_APP_API_URL=http://your-ec2-public-ip:5000/api
```

Rebuild and redeploy to S3.

---

### **Step 5: Setup Custom Domain (Optional)**

#### Using Route 53 (AWS DNS)
1. Go to **Route 53** → **Hosted zones** → **Create hosted zone**
2. Enter your domain name
3. Add nameservers to your domain registrar
4. Create A record pointing to CloudFront distribution

---

## Testing Checklist

- [ ] Database connection working
- [ ] Can login to application
- [ ] Can create/read/update/delete records
- [ ] API calls return correct data
- [ ] Frontend loads properly
- [ ] No CORS errors in browser console

---

## Cost Monitoring

1. Set up **AWS Billing Alerts**:
   - Go to **Billing Dashboard**
   - Click **Billing Preferences**
   - Enable "Receive Billing Alerts"
   - Set limit to $5 (safety net)

2. Use **AWS Cost Calculator** to estimate costs

---

## Troubleshooting

### Backend won't start
```bash
pm2 logs hms-backend
```

### Database connection refused
- Check security group allows inbound on port 3306
- Verify endpoint, username, password
- Check RDS instance is running

### Frontend shows blank page
- Check CloudFront distribution status
- Clear browser cache
- Check browser console for errors

### CORS errors
- Verify `FRONTEND_URL` environment variable
- Check backend CORS configuration

---

## Commands Reference

**EC2 SSH Connection:**
```bash
ssh -i "key.pem" ec2-user@your-public-ip
```

**View Backend Logs:**
```bash
pm2 logs hms-backend
```

**Stop/Start Backend:**
```bash
pm2 stop hms-backend
pm2 start hms-backend
```

**Update Frontend (after new build):**
```bash
aws s3 sync frontend/build s3://hms-frontend-yourname --delete
```

---

## Next Steps

1. ✅ Setup AWS Account
2. ✅ Deploy RDS MySQL Database
3. ✅ Deploy EC2 Backend
4. ✅ Deploy S3 + CloudFront Frontend
5. ✅ Test all features
6. ✅ Setup Route 53 custom domain
7. ✅ Monitor costs and performance

---

**Total Monthly Cost**: ~$0 (Free tier for 12 months)
