# Eventum: Advanced Event Management System
**Micro Project for Go Programming (Assignment-1)**

Eventum is a high-performance, full-stack event management application built with **Go (Golang)** and **React**. It features a clean, responsive UI, secure JWT authentication, and real-time capacity management.

## 🚀 Project Overview
- **Domain:** Client-Server & Database-Oriented Projects.
- **Backend:** Go (Golang) with Chi Router.
- **Frontend:** React + Tailwind CSS + Framer Motion.
- **Database:** MongoDB Atlas.
- **Submission Date:** 06-03-2026.

## ✨ Key Features
* **Full CRUD Lifecycle:** Create, Read, Update, and Delete events.
* **Role-Based Access (RBAC):** Admin-only privileges for event creation and deletion.
* **JWT Authentication:** Secure login/signup flow with password hashing (Bcrypt).
* **Real-time Capacity Control:** Mutex-protected RSVP system to prevent over-booking.
* **Async Notifications:** Background Goroutines for event activity logging.
* **Modern UI/UX:** Smooth Dark/Light/System theme switching and animations.

## 🛠️ Tech Stack
| Component | Technology |
| :--- | :--- |
| **Language** | Go 1.2x |
| **UI Library** | React 19 (Vite) |
| **Styling** | Tailwind CSS |
| **Database** | MongoDB Atlas |
| **Auth** | JWT (JSON Web Tokens) |
| **Routing** | Chi (Go) & React Router |

## 📦 Installation & Setup

### 1. Prerequisites
- Go installed on your machine.
- Node.js installed.
- A MongoDB Atlas connection string.

### 2. Backend Setup
```bash
cd Event_Management
# Install Go dependencies
go mod tidy
# Run the Go server (Port 8080)
go run main.go