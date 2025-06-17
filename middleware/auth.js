const jwt = require('jsonwebtoken');
const Employee = require('../models/Employee');
const ErrorResponse = require('../utils/errorResponse');
const asyncHandler = require('../utils/asyncHandler');

// Protect routes
exports.protect = asyncHandler(async (req, res, next) => {
  let token;

  // Check for token in Authorization header or cookies
  if (
    req.headers.authorization &&
    req.headers.authorization.startsWith('Bearer')
  ) {
    token = req.headers.authorization.split(' ')[1];
  } else if (req.cookies && req.cookies.token) {
    token = req.cookies.token;
  }

  // Token missing
  if (!token) {
    return next(new ErrorResponse('Not authorized to access this route', 401));
  }

  try {
    // Verify token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // Find employee by ID
    req.employee = await Employee.findById(decoded.id);
    if (!req.employee) {
      return next(new ErrorResponse('Employee not found', 404));
    }
  
    next();
  } catch (err) {
    if (process.env.NODE_ENV === 'development') {
      console.error('JWT verification failed:', err.message);
    }
    return next(new ErrorResponse('Not authorized to access this route', 401));
  }
});

// Grant access to specific roles
exports.authorize = (...roles) => {
  return (req, res, next) => {
    if (!roles.includes(req.employee.role)) {
      return next(
        new ErrorResponse(
          `User role ${req.employee.role} is not authorized to access this route`,
          403
        )
      );
    }
    next();
  };
};
