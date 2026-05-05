# ChatApp - Real-Time Chat Application

A full-stack, real-time chat application built with the **PERN stack** (PostgreSQL, Express, React, Node.js) and **Socket.io**.

## ✨ Features

- **Real-Time Messaging**: Send and receive messages instantly across different rooms.
- **Direct Messaging (DM)**: Private one-on-one conversations between users.
- **Rooms/Channels**: Create, join, update, and delete chat rooms.
- **Message Interactions**:
  - Edit and delete your messages.
  - React to messages with emojis.
  - Typing indicators.
  - Read receipts (know who read your messages).
- **User Authentication**: Secure JWT-based authentication with bcrypt password hashing.
- **Responsive Design**: Modern and clean UI using Tailwind CSS and Lucide React icons.

## 🛠️ Tech Stack

**Frontend:**
- React (with Vite)
- Tailwind CSS v4
- React Router DOM
- Socket.io-client
- Axios
- Lucide React (Icons)

**Backend:**
- Node.js & Express.js
- PostgreSQL (pg)
- Socket.io (Real-time WebSockets)
- JSON Web Token (JWT) & bcryptjs

## 🚀 Getting Started

### Prerequisites
- Node.js installed
- PostgreSQL installed and running

### 1. Clone the repository
\`\`\`bash
git clone https://github.com/33Yasin/chat-app.git
cd chat-app
\`\`\`

### 2. Backend Setup
\`\`\`bash
cd server
npm install
\`\`\`
Create a `.env` file in the `server` directory and configure your environment variables:
\`\`\`env
PORT=5000
DB_HOST=localhost
DB_PORT=5432
DB_NAME=chatapp_db
DB_USER=your_postgres_user
DB_PASSWORD=your_postgres_password
JWT_SECRET=your_jwt_secret_key
CLIENT_URL=http://localhost:5173
\`\`\`
Start the backend server:
\`\`\`bash
npm run dev
\`\`\`

### 3. Frontend Setup
\`\`\`bash
cd client
npm install
\`\`\`
Create a `.env` file in the `client` directory:
\`\`\`env
VITE_API_URL=http://localhost:5000
\`\`\`
Start the frontend development server:
\`\`\`bash
npm run dev
\`\`\`

## 📝 License
This project is licensed under the ISC License.
