# 🏥 MedCore Hospital Management System
## Complete Setup Guide — VS Code + MySQL + Node.js + React

---

## 📁 Project Structure

```
hms/
├── database/
│   └── schema.sql          ← Run this FIRST in MySQL
├── backend/
│   ├── config/
│   │   └── db.js           ← MySQL connection pool
│   ├── controllers/
│   │   └── index.js        ← All API logic
│   ├── middleware/
│   │   └── auth.js         ← JWT protection
│   ├── routes/
│   │   └── index.js        ← All API routes
│   ├── .env                ← Your DB credentials
│   ├── package.json
│   └── server.js           ← Express entry point
└── frontend/
    ├── src/
    │   ├── components/
    │   │   └── Layout.js   ← Sidebar + topbar
    │   ├── pages/
    │   │   ├── Login.js
    │   │   ├── Dashboard.js
    │   │   ├── Patients.js
    │   │   ├── Appointments.js
    │   │   ├── Doctors.js
    │   │   ├── Beds.js
    │   │   └── OtherPages.js (Billing, Pharmacy, Lab)
    │   ├── utils/
    │   │   └── api.js      ← Axios with JWT
    │   ├── App.js
    │   ├── index.js
    │   └── index.css
    └── package.json
```

---

## 🖥️ Prerequisites — Install These First

| Tool | Version | Download |
|------|---------|----------|
| Node.js | 18+ LTS | https://nodejs.org |
| MySQL  | 8.0+    | https://dev.mysql.com/downloads/mysql/ |
| VS Code | Latest  | https://code.visualstudio.com |
| Git    | Any     | https://git-scm.com |

---

## 🔌 VS Code Extensions (Install All)

Open VS Code → press `Ctrl+Shift+X` → search and install:

1. **ESLint** — `dbaeumer.vscode-eslint`
2. **Prettier** — `esbenp.prettier-vscode`
3. **MySQL** — `cweijan.vscode-mysql-client2`  ← view DB visually
4. **Thunder Client** — `rangav.vscode-thunder-client`  ← test APIs
5. **GitLens** — `eamodio.gitlens`
6. **Auto Rename Tag** — `formulahendry.auto-rename-tag`
7. **Path IntelliSense** — `christian-kohler.path-intellisense`
8. **Error Lens** — `usernamehw.errorlens`

---

## 🗄️ STEP 1 — Setup MySQL Database

### Option A: MySQL Workbench (GUI)
1. Open **MySQL Workbench**
2. Connect to your local MySQL server
3. Go to **File → Open SQL Script**
4. Open `hms/database/schema.sql`
5. Press **Ctrl+Shift+Enter** to run all
6. You should see: `hms_db` database with all tables + seed data

### Option B: Command Line
```bash
# Open terminal (or VS Code terminal: Ctrl+`)
mysql -u root -p

# Enter your MySQL root password when prompted
# Then paste:
source /full/path/to/hms/database/schema.sql

# Or in one command:
mysql -u root -p < /path/to/hms/database/schema.sql
```

### Option C: VS Code MySQL Extension
1. Install **MySQL** extension (cweijan)
2. Click the database icon in VS Code sidebar
3. Add connection: host=localhost, user=root, password=your_password
4. Right-click connection → **New Query**
5. Paste the entire `schema.sql` content → Run

### ✅ Verify Database
```sql
USE hms_db;
SHOW TABLES;          -- Should show 12 tables
SELECT COUNT(*) FROM patients;     -- Should return 10
SELECT COUNT(*) FROM doctors;      -- Should return 8
SELECT COUNT(*) FROM medicines;    -- Should return 10
```

---

## ⚙️ STEP 2 — Configure Backend

### 2a. Open project in VS Code
```bash
# In terminal
cd hms
code .
```

### 2b. Edit backend/.env
Open `backend/.env` and set your MySQL password:
```env
DB_HOST=localhost
DB_PORT=3306
DB_USER=root
DB_PASSWORD=YOUR_MYSQL_PASSWORD_HERE   ← change this
DB_NAME=hms_db

JWT_SECRET=hms_jwt_super_secret_2025
JWT_EXPIRES_IN=8h

PORT=5000
NODE_ENV=development
```

### 2c. Install backend dependencies
```bash
# In VS Code terminal (Ctrl+`) 
cd backend
npm install
```

### 2d. Start backend server
```bash
npm run dev
```

You should see:
```
✅ MySQL connected: hms_db
🏥  HMS API →  http://localhost:5000
📋  Env     →  development
```

### 2e. Test the API (optional)
Open Thunder Client in VS Code or your browser:
- `GET http://localhost:5000/health` → should return `{"status":"ok"}`
- `POST http://localhost:5000/api/auth/login` with body:
  ```json
  { "username": "admin", "password": "Admin@123" }
  ```
  → returns JWT token

---

## ⚛️ STEP 3 — Setup Frontend

Open a **second terminal** in VS Code (`Ctrl+Shift+~` or click `+` in terminal panel):

```bash
cd frontend
npm install
npm start
```

The browser will auto-open at **http://localhost:3000**

---

## 🔐 Login Credentials

| Field    | Value       |
|----------|-------------|
| Username | `admin`     |
| Password | `Admin@123` |

---

## 🚀 Running the Full Application

You need **2 terminals** running simultaneously:

### Terminal 1 — Backend
```bash
cd hms/backend
npm run dev
# Runs on: http://localhost:5000
```

### Terminal 2 — Frontend
```bash
cd hms/frontend
npm start
# Opens at: http://localhost:3000
```

---

## 🔒 Duplicate Prevention — How It Works

| Module        | What's Prevented | How |
|---------------|-----------------|-----|
| Patients      | Same phone number | `UNIQUE KEY uq_patient_phone (phone)` + backend check with clear error |
| Patients      | Same email        | Backend check before INSERT |
| Appointments  | Same doctor, same time slot | `UNIQUE KEY uq_appt_slot (doctor_id, appt_datetime)` |
| Appointments  | Same patient + doctor same day | Backend query check |
| Doctors       | Same employee code | `UNIQUE KEY uq_emp_code (emp_code)` |
| Medicines     | Same medicine code | `UNIQUE KEY uq_med_code (med_code)` |
| Medicines     | Same medicine name | `UNIQUE KEY uq_med_name (med_name)` |
| Bills         | Same bill number   | `UNIQUE KEY uq_bill_number (bill_number)` |
| Beds          | Admit to occupied bed | Backend status check before INSERT |
| Admissions    | Admit already-admitted patient | Backend active admission check |
| Departments   | Same dept name     | `UNIQUE KEY uq_dept_name (dept_name)` |

**All errors return HTTP 409 Conflict with a clear message.**

---

## 🛠️ VS Code Workspace Settings

Create `.vscode/settings.json` in the `hms/` folder:
```json
{
  "editor.formatOnSave": true,
  "editor.defaultFormatter": "esbenp.prettier-vscode",
  "editor.tabSize": 2,
  "emmet.includeLanguages": { "javascript": "javascriptreact" },
  "files.exclude": {
    "**/node_modules": true
  },
  "terminal.integrated.cwd": "${workspaceFolder}"
}
```

---

## 🐛 Common Errors & Fixes

### ❌ `ER_ACCESS_DENIED_ERROR`
**Fix:** Wrong MySQL password in `.env`
```env
DB_PASSWORD=your_correct_password
```

### ❌ `ER_BAD_DB_ERROR: Unknown database 'hms_db'`
**Fix:** You haven't run schema.sql yet. Run it in MySQL first.

### ❌ `ECONNREFUSED` on port 5000
**Fix:** Backend not running. Start it with `npm run dev` in `backend/` folder.

### ❌ React shows blank page / CORS error
**Fix:** Make sure `"proxy": "http://localhost:5000"` is in `frontend/package.json` and backend is running.

### ❌ `Cannot find module 'mysql2'`
**Fix:**
```bash
cd backend
npm install
```

### ❌ JWT token errors after long idle
**Fix:** Log out and log back in. Token expires after 8 hours.

### ❌ `ER_DUP_ENTRY` in console
This is **expected behaviour** when duplicate data is submitted. The API catches it and returns a 409 error with a user-friendly message displayed in the form.

---

## 📊 Database Schema Quick Reference

```
departments (9 rows)
    ↓
doctors (8 rows) ─────────────────────────────┐
    ↓                                           │
patients (10 rows)                             │
    ↓                    ↓           ↓         │
admissions ──→ beds   appointments  lab_reports│
    ↓          wards                           │
bills                                          │
    ↓                                          │
bill_items                                     │
                                               │
medicines                                      │
lab_tests ──────────────────────────────────── ┘
users (login)
```

---

## 🏗️ API Endpoints Reference

```
POST   /api/auth/login
GET    /api/auth/me

GET    /api/dashboard/summary

GET    /api/patients               ?search= &page= &limit=
GET    /api/patients/:id
POST   /api/patients               ← duplicate phone/email check
PUT    /api/patients/:id
DELETE /api/patients/:id

GET    /api/appointments           ?date= &status= &doctor_id=
POST   /api/appointments           ← slot conflict check
PATCH  /api/appointments/:id/status
DELETE /api/appointments/:id       (cancels, not hard-delete)

GET    /api/doctors
POST   /api/doctors                ← duplicate emp_code/email check
PATCH  /api/doctors/:id/status

GET    /api/admissions
POST   /api/admissions             ← active-admission + bed-status check
PATCH  /api/admissions/:id/discharge
GET    /api/beds                   ?status=

GET    /api/medicines              ?search= &low_stock=true
POST   /api/medicines              ← duplicate code/name check
PATCH  /api/medicines/:id/restock
DELETE /api/medicines/:id

GET    /api/billing                ?status=
GET    /api/billing/summary
GET    /api/billing/:id
POST   /api/billing                ← duplicate bill check
PATCH  /api/billing/:id/payment

GET    /api/lab-reports
POST   /api/lab-reports
GET    /api/lab-tests
GET    /api/departments
```

---

## ✅ Feature Checklist

- [x] JWT Login / Logout
- [x] Dashboard with live stats, bar chart, pie chart
- [x] Patient Registration with duplicate phone/email prevention
- [x] Patient search, filter by status, View detail modal
- [x] Appointment booking with slot-conflict prevention
- [x] Doctor management with status toggle
- [x] Ward/Bed management with admit & discharge
- [x] Billing with invoice generation and payment tracking
- [x] Pharmacy with stock levels, restock, and low-stock alerts
- [x] Lab reports with status (normal/abnormal/critical)
- [x] MySQL Triggers for automatic bed status updates
- [x] Stored Procedures for safe operations
- [x] Database Views for common queries
- [x] All 409 Conflict errors shown as user-friendly messages

---

## 🔄 Resetting Data

To reset the database to seed data:
```bash
mysql -u root -p < hms/database/schema.sql
```

This drops and recreates all tables with fresh seed data.
