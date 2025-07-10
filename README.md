# Voting Application

A secure voting system built with Node.js, Express, and MongoDB that allows users to register, login, and vote for candidates. Administrators can manage candidates and view voting results.

## Features

- **User Authentication**: Secure signup and login with JWT tokens
- **Role-based Access**: Admin and voter roles with different permissions
- **Candidate Management**: Admins can create, update, and delete candidates
- **Voting System**: Users can vote for candidates (one vote per user)
- **Vote Counting**: Real-time vote count tracking
- **Security**: Password hashing with bcrypt and JWT authentication

## Technologies Used

- Node.js
- Express.js
- MongoDB with Mongoose
- JWT (JSON Web Tokens)
- bcrypt for password hashing
- dotenv for environment variables

## Installation

1. Clone the repository:
```bash
git clone https://github.com/KEERTHAN-089/Voting_app.git
cd Voting_app
```

2. Install dependencies:
```bash
npm install
```

3. Create a `.env` file in the root directory:
```env
PORT=3000
MONGODB_URL=your_mongodb_connection_string
JWT_SECRET=your_jwt_secret_key
```

4. Start the server:
```bash
npm run dev
```

## API Endpoints

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

git reset --hard HEAD

```

### User Login
```json
POST /user/login
{
  "aadharCardNumber": 123456789012,
  "password": "securepassword"
}
```

### Voting
```json
POST /candidates/vote/CANDIDATE_ID
Headers: Authorization: Bearer YOUR_JWT_TOKEN
```

## Authentication

All protected routes require a JWT token in the Authorization header:
```
Authorization: Bearer YOUR_JWT_TOKEN
```

## User Roles

- **Voter**: Can vote for candidates (default role)
- **Admin**: Can manage candidates, cannot vote

## Security Features

- Password hashing using bcrypt
- JWT token authentication
- Role-based access control
- One vote per user restriction
- Admin voting prevention

## Project Structure

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

## Contributing

1. Fork the repository
2. Create a feature branch
3. Commit your changes
4. Push to the branch
5. Create a Pull Request

##