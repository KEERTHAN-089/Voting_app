const express = require('express');
const app = express();
const db = require('./db'); // Import the database connection
const mongoose = require('mongoose');
require('dotenv').config();

const bodyParser = require('body-parser');
app.use(bodyParser.json());
const PORT = process.env.PORT || 3000;

//Importing routes
const userRoutes = require('./routes/userRoutes');
const candidateRoutes = require('./routes/candidateRoute');


//use the routes
app.use('/user', userRoutes);
app.use('/candidates',  candidateRoutes);


app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});