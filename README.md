# 🎟️ Eventum: Advanced Event Management System

**Micro Project for Go Programming (Assignment-1)**

Eventum is a **high-performance full-stack event management platform** built with **Go (Golang)** and **React**.
It provides secure authentication, modern UI, real-time event capacity management, and advanced event features such as **RSVP tracking, QR entry passes, and waitlist handling**.

---

# 🚀 Project Overview

**Domain:** Client-Server & Database-Oriented Applications
**Backend:** Go (Golang) + Chi Router
**Frontend:** React + TypeScript + Vite
**Styling:** Tailwind CSS
**Database:** MongoDB Atlas

---

# ✨ Features

## Core Features

• Full **CRUD operations** for events
• **JWT Authentication** (Signup/Login)
• **Role-Based Access Control (RBAC)** for Admin actions
• **Secure Password Hashing** using Bcrypt
• **MongoDB Atlas** cloud database integration

---

## Event Features

• Event **image posters**
• Event **category filtering** (Tech, Music, Workshop, Sports)
• **Countdown timer** until event start
• **Real-time RSVP system** with capacity control
• **Mutex-protected booking** to prevent race conditions

---

## Advanced Features

### 📊 User Dashboard

Users can view all events they have RSVP’d to.

Example:

My Events
✔ Hackathon 2026
✔ Music Festival
✔ AI Workshop

---

### 🎫 QR Code Entry System

Each RSVP generates a **QR Code entry pass**.

QR code contains:

eventID + userID

This allows **quick check-in scanning at event entry**.

---

### ⏳ Event Waitlist System

If an event reaches capacity:

• New users are added to **waitlist**
• If a participant cancels, the **next waitlist user automatically gets the seat**

---

### 🎨 Modern UI

• Dark / Light / System theme switching
• Smooth animations with Framer Motion
• Responsive design using Tailwind CSS

---

# 🛠️ Tech Stack

| Component         | Technology      |
| ----------------- | --------------- |
| Language          | Go (Golang)     |
| Frontend          | React 19 + Vite |
| Styling           | Tailwind CSS    |
| Database          | MongoDB Atlas   |
| Authentication    | JWT             |
| Backend Router    | Chi             |
| QR Code Generator | go-qrcode       |

---

# 📂 Project Structure

```
Event_Management_Macro
│
├── main.go                # Go backend server
├── server.ts              # Node dev server
├── package.json           # Frontend dependencies
├── src/                   # React frontend
│   ├── components/
│   ├── pages/
│   └── App.tsx
│
├── index.html
├── tailwind.config.js
└── README.md
```

---

# ⚙️ Installation & Setup

## 1️⃣ Prerequisites

Install the following:

• Go (1.20+)
• Node.js
• MongoDB Atlas account

---

## 2️⃣ Clone Repository

```bash
git clone https://github.com/pruthvimax/Event_Management_Macro.git
cd Event_Management_Macro
```

---

## 3️⃣ Install Frontend Dependencies

```bash
npm install
```

---

## 4️⃣ Backend Setup

Initialize Go modules if needed:

```bash
go mod init event-management
go mod tidy
```

Run backend server:

```bash
go run main.go
```

Backend runs on:

```
http://localhost:8080
```

---

## 5️⃣ Start Frontend Development Server

```bash
npm run dev
```

Frontend runs on:

```
http://localhost:3000
```

---

# 🔐 Environment Variables

Create a `.env` file:

```
MONGO_URI=your_mongodb_connection_string
JWT_SECRET=your_secret_key
```

---

# 📡 API Endpoints

### Authentication

POST /api/signup
POST /api/login

---

### Events

GET /api/events
POST /api/events
DELETE /api/events/{id}

---

### RSVP

POST /api/events/{id}/rsvp

---

### Dashboard

GET /api/my-events

Returns events where the user has RSVP’d.

---

# 🎯 Learning Outcomes

This project demonstrates:

• Building a **full-stack application using Go and React**
• Implementing **JWT authentication and secure APIs**
• Designing **scalable client-server architectures**
• Using **MongoDB for NoSQL data modeling**
• Handling **concurrency in Go using Mutex & Goroutines**

---

# 👨‍💻 Author

Developed as part of the **Go Programming Micro Project**.

---

# 📜 License

This project is developed for **educational purposes**.
