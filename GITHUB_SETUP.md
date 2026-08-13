# GitHub Setup Instructions

## Prerequisites
1. **Git** - Download from [git-scm.com](https://git-scm.com)
2. **GitHub Account** - Sign up at [github.com](https://github.com)
3. **GitHub Personal Access Token (PAT)**

---

## Step 1: Create GitHub Repository

1. Go to [github.com/new](https://github.com/new)
2. **Repository name**: `Hospital-management-system-main`
3. **Description**: Hospital Management System with Node.js, React, MySQL
4. **Public** or **Private** (your choice)
5. Click **Create Repository**
6. Copy the HTTPS URL (e.g., `https://github.com/yourname/Hospital-management-system-main.git`)

---

## Step 2: Generate GitHub Personal Access Token

1. Go to GitHub → Settings → Developer settings → **Personal access tokens**
2. Click **Generate new token**
3. **Token name**: `Hospital-HMS-Deploy`
4. **Expiration**: 90 days (or your preference)
5. **Select scopes**: Check `repo` (full control of private repositories)
6. Click **Generate token**
7. **COPY the token immediately** (you won't see it again!)

---

## Step 3: Configure Git Locally

Open PowerShell and run:

```powershell
# Set your GitHub username and email
git config --global user.name "Your Name"
git config --global user.email "your.email@example.com"

# Verify
git config --global --list
```

---

## Step 4: Push to GitHub

In PowerShell, navigate to your project:

```powershell
cd c:\Users\aplus\Documents\project\Hospital-management-system-main

# Initialize git (if not already initialized)
git init

# Add all files (respecting .gitignore)
git add .

# Create initial commit
git commit -m "Initial commit: Hospital Management System with backend, frontend, and database schema"

# Add GitHub remote (replace YOUR_USERNAME and REPO_NAME)
git remote add origin https://github.com/YOUR_USERNAME/Hospital-management-system-main.git

# Set main branch
git branch -M main

# Push to GitHub
git push -u origin main
```

When prompted for password:
- **Username**: Your GitHub username
- **Password**: Paste your Personal Access Token (NOT your actual password)

---

## Step 5: Verify on GitHub

1. Go to your repository on GitHub
2. You should see all your files uploaded
3. Check the `.gitignore` is working (no `node_modules/` or `.env` files)

---

## Useful Git Commands

```powershell
# Check status
git status

# View commit history
git log --oneline

# Create and switch to new branch
git checkout -b feature-branch

# Push new branch
git push origin feature-branch

# View all branches
git branch -a

# Pull latest changes
git pull origin main
```

---

## If You Get Errors

**Error: "fatal: not a git repository"**
```powershell
git init
```

**Error: "fatal: 'origin' does not appear to be a 'git' repository"**
```powershell
git remote add origin https://github.com/YOUR_USERNAME/Hospital-management-system-main.git
```

**Error: "Authentication failed"**
- Make sure you're using Personal Access Token, not password
- Token should have `repo` scope

---

## CI/CD Setup (Optional - GitHub Actions)

Once pushed to GitHub, you can add automatic testing/deployment. Let me know if you want to set that up!
