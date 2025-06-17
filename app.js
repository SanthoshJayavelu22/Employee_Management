const express = require('express');
const dotenv = require('dotenv');
const cors = require('cors');
const connectDB = require('./config/db');
const errorHandler = require('./middleware/error');
const path = require('path');

// Load env vars
dotenv.config();
require('./jobs/autoAbsent'); // Start cron on app load

// Connect to database
connectDB();

// Route files
const auth = require('./routes/authRoutes');
const attendance = require('./routes/attendanceRoutes');
const employeeRoutes = require('./routes/employeesRoutes');
const taskRoutes = require('./routes/taskRoutes'); // Add task routes

// Create express app
const app = express();

// Body parser
app.use(express.json());

// Enable CORS
app.use(cors());

// Set static folder (if you have frontend files to serve)
app.use(express.static(path.join(__dirname, 'public')));

// Mount routers
app.use('/auth', auth);
app.use('/attendance', attendance);
app.use('/employees', employeeRoutes);
app.use('/tasks', taskRoutes); // Mount task routes

// Error handler middleware
app.use(errorHandler);

module.exports = app;