# 🗳️ Secure Voting Application

A modern, secure, and transparent voting platform built with the MERN stack (MongoDB, Express, React, Node.js).

![Voting App Screenshot](https://via.placeholder.com/800x400?text=Voting+App+Screenshot)

## ✨ Features

- **Secure Authentication** - User registration and login with Aadhar verification
- **One Vote Per User** - Prevents duplicate voting with robust validation
- **Real-time Results** - Live vote counting with visual data representation
- **Responsive Design** - Works on desktop, tablet, and mobile devices
- **Admin Dashboard** - Complete candidate management system
- **Role-based Access** - Different capabilities for voters and administrators

## 🛠️ Tech Stack

### Frontend
- **React.js** - UI library for building the user interface
- **React Router** - For navigation and routing
- **CSS3** - For styling components
- **Axios** - For API requests

### Backend
- **Node.js** - JavaScript runtime for server-side code
- **Express** - Web framework for handling API requests
- **MongoDB** - Database for storing user and voting data
- **Mongoose** - MongoDB object modeling
- **JWT** - For secure authentication
- **bcrypt** - For password hashing

## 📝 Prerequisites

Before you begin, ensure you have the following installed:
- [Node.js](https://nodejs.org/) (v14 or later)
- [npm](https://www.npmjs.com/) (v6 or later)
- [MongoDB](https://www.mongodb.com/) (local or Atlas)

## 🚀 Installation

1. **Clone the repository**
```bash
git clone https://github.com/yourusername/voting-app.git
cd voting-app
```

2. **Setup Backend**
```bash
cd backend
npm install
```

3. **Setup Frontend**
```bash
cd ../frontend
npm install
```

4. **Environment Variables**

Create a `.env` file in the backend directory:
```env
PORT=3000
MONGODB_URL=your_mongodb_connection_string
JWT_SECRET=your_jwt_secret_key
```

5. **Start the Backend Server**
```bash
cd backend
npm run dev
```

6. **Start the Frontend Server**
```bash
cd frontend
npm start
```

## 📡 API Endpoints

### User Routes (`/user`)
- `POST /user/signup` - Register a new user
- `POST /user/login` - Login user

### Candidate Routes (`/candidates`)
- `GET /candidates` - Get all candidates
- `POST /candidates` - Create candidate (Admin only)
- `PUT /candidates/:id` - Update candidate (Admin only)
- `DELETE /candidates/:id` - Delete candidate (Admin only)
- `POST /candidates/vote/:id` - Vote for a candidate
- `GET /candidates/vote/count` - Get vote counts

## 🔑 Authentication

All protected routes require a JWT token in the Authorization header:
```
Authorization: Bearer YOUR_JWT_TOKEN
```

## 👥 User Roles

- **Voter**: Can vote for candidates (default role)
- **Admin**: Can manage candidates, cannot vote

## 🔒 Security Features

- Password hashing using bcrypt
- JWT token authentication
- Role-based access control
- One vote per user restriction
- Admin voting prevention

## 📂 Project Structure

```
Voting_app/
├── models/
│   ├── user.js
│   └── candidate.js
├── routes/
│   ├── userRoutes.js
│   └── candidateRoute.js
├── jwt.js
├── db.js
├── server.js
└── package.json
```

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Commit your changes
4. Push to the branch
5. Create a Pull Request