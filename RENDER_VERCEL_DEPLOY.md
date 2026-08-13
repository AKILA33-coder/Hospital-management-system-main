# Hospital Management System - Render & Vercel Deployment

## Quick Deploy Guide (5 Minutes)

### **Step 1: Deploy Backend on Render** (2 mins)

1. Go to: **[render.com](https://render.com)**
2. Click **Sign up with GitHub** (use AKILA33-coder)
3. Grant GitHub access to your repositories
4. Click **New +** → **Web Service**
5. Select: `Hospital-management-system-main`
6. **Name**: `hospital-management-api`
7. **Branch**: `main`
8. **Root Directory**: `backend`
9. **Runtime**: Node
10. **Build Command**: `npm install`
11. **Start Command**: `npm start`
12. Add Environment Variables:
    - `NODE_ENV` = `production`
    - `DB_HOST` = (Your MySQL host - we'll use PlanetScale for free)
    - `DB_USER` = `admin`
    - `DB_PASSWORD` = (Your password)
    - `DB_NAME` = `hms_db`
    - `JWT_SECRET` = (Generate random: `openssl rand -base64 32`)
    - `FRONTEND_URL` = (Will update after frontend deployed)
13. Click **Create Web Service**
14. Wait ~3 minutes for deployment
15. Copy the **URL** (looks like: `https://hospital-management-api.onrender.com`)

---

### **Step 2: Setup Free MySQL (PlanetScale)** (2 mins)

1. Go to: **[planetscale.com](https://planetscale.com)**
2. Click **Sign up** (free tier)
3. Create a database: `hms_db`
4. Copy connection string
5. Run your `schema.sql` to create tables:
   ```sql
   -- Connect with PlanetScale connection string and run:
   -- Contents of database/schema.sql
   ```

---

### **Step 3: Deploy Frontend on Vercel** (2 mins)

1. Go to: **[vercel.com](https://vercel.com)**
2. Click **Sign up with GitHub**
3. Grant access to repository
4. Click **Import Project**
5. Select: `Hospital-management-system-main`
6. **Root Directory**: `frontend`
7. Add Environment Variable:
   - `REACT_APP_API_URL` = `https://hospital-management-api.onrender.com/api`
8. Click **Deploy**
9. Wait ~2 minutes
10. Copy your **Vercel URL** (looks like: `https://hospital-management-system.vercel.app`)

---

### **Step 4: Update Backend Environment** (1 min)

1. Go back to **Render Dashboard**
2. Click your `hospital-management-api` service
3. Click **Environment**
4. Update: `FRONTEND_URL` = Your Vercel URL
5. Redeploy automatically

---

## **✅ Your App is LIVE!**

- **Backend**: `https://hospital-management-api.onrender.com`
- **Frontend**: `https://hospital-management-system.vercel.app`
- **Database**: PlanetScale (free)

---

## **Total Cost: $0** 🎉
- Render free tier: unlimited
- Vercel free tier: unlimited
- PlanetScale free tier: 5GB storage

---

## **Auto-Deploy on Every Push**
Every time you push code to GitHub:
- Backend updates automatically on Render
- Frontend updates automatically on Vercel
- No manual deployment needed!

---

## **Troubleshooting**

**Backend shows error?**
- Check Render logs: Dashboard → Service → Logs
- Verify all environment variables are set
- Check database connection

**Frontend shows blank?**
- Check browser console for errors
- Verify `REACT_APP_API_URL` is correct
- Check CORS is enabled in backend

**Can't connect frontend to backend?**
- Make sure `FRONTEND_URL` is set in backend
- Verify backend `CORS` middleware allows frontend URL
