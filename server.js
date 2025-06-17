// server.js
const app = require('./app');
const dotenv = require('dotenv');

// Load env vars
dotenv.config({ path: './config/config.env' });

// Handle uncaught exceptions
process.on('uncaughtException', err => {
  console.log(`ERROR: ${err.stack}`);
  console.log('Shutting down due to uncaught exception');
  process.exit(1);
});

const PORT = process.env.PORT || 5000;

const server = app.listen(
  PORT,
  console.log(`Server is running on port ${PORT}`)
);

// Handle unhandled promise rejections
process.on('unhandledRejection', err => {
  console.log(`Error: ${err.message}`);
  server.close(() => process.exit(1));
});