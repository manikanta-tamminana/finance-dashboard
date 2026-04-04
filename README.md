# 💰 Finance Dashboard

A full-stack finance dashboard built with **FastAPI, MongoDB, and React**.  
It supports authentication, role-based access control (RBAC), and financial data management.

---

## 🚀 Features

- 🔐 JWT Authentication (Login/Register)
- 👥 Role-Based Access Control (Admin, Analyst, Viewer)
- 📊 Dashboard with income, expenses, and balance
- 📁 Financial records (CRUD operations)
- 👤 User management (Admin only)

---

## 🛠️ Tech Stack

- **Backend:** FastAPI, MongoDB
- **Frontend:** React, Tailwind CSS
- **Auth:** JWT (httpOnly cookies)

---

## ⚙️ Setup Instructions

### 1. Clone Repository
```bash
git clone <your-repo-link>
cd finance-dashboard
```

---

### 2. Backend Setup
```bash
cd backend
pip install -r requirements.txt
uvicorn server:app --reload
```

---

### 3. Frontend Setup
```bash
cd frontend
npm install --legacy-peer-deps
npm start
```

---
## 🌍 Environment Variables

Create `.env` files in both backend and frontend:

### Backend `.env`
```
MONGO_URL=your_mongodb_url
DB_NAME=finance_db
JWT_SECRET=your_secret
FRONTEND_URL=http://localhost:3000
ADMIN_EMAIL=admin@example.com
ADMIN_PASSWORD=admin123
```

### Frontend `.env`
```
REACT_APP_BACKEND_URL=http://localhost:8000
```

---

### 4. Access Application

Open in browser:

http://localhost:3000/login

---

## 🔑 Demo Credentials

- **Admin:** admin@example.com / admin123  
- **Analyst:** analyst@example.com / analyst123  
- **Viewer:** viewer@example.com / viewer123  

---

## 🧪 Testing

The application was manually tested for:

- Authentication  
- CRUD operations  
- Dashboard functionality  

---

## 📝 Notes

- This is a prototype project  
- Not production-ready  
- Built for assignment/demo purposes  
