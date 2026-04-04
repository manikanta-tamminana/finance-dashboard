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
