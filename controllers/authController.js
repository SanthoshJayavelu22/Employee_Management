const Employee = require('../models/Employee');
const { generateCredentials } = require('../utils/passwordGenerator');
const { sendCredentialsEmail } = require('../utils/emailService');
const ErrorResponse = require('../utils/errorResponse');
const asyncHandler = require('../utils/asyncHandler');
const jwt = require('jsonwebtoken');

// Helper to create JWT token
const sendTokenResponse = (employee, statusCode, res) => {
  const token = employee.getSignedJwtToken();
  
  const options = {
    expires: new Date(Date.now() + process.env.JWT_COOKIE_EXPIRE * 24 * 60 * 60 * 1000),
    httpOnly: true
  };

  if (process.env.NODE_ENV === 'production') {
    options.secure = true;
  }

  res
    .status(statusCode)
    .cookie('token', token, options)
    .json({
      success: true,
      token,
      data: {
        id: employee._id,
        username: employee.username,
        role: employee.role
      }
    });
};

// @desc    Login employee
// @route   POST /auth/login
// @access  Public
exports.login = asyncHandler(async (req, res, next) => {
  const { username, password } = req.body;

  // Validate input
  if (!username || !password) {
    return next(new ErrorResponse('Please provide username and password', 400));
  }

  // Check employee exists
  const employee = await Employee.findOne({ username }).select('+password');
  if (!employee) {
    return next(new ErrorResponse('Invalid credentials', 401));
  }

  // Verify password
  const isMatch = await employee.matchPassword(password);
  if (!isMatch) {
    return next(new ErrorResponse('Invalid credentials', 401));
  }

  // Send token response
  sendTokenResponse(employee, 200, res);
});


// @desc    Register employee (Admin only)
// @route   POST /auth/register
// @access  Private/Admin
exports.register = asyncHandler(async (req, res, next) => {
  // Verify admin role
  if (req.employee.role !== 'admin') {
    return next(new ErrorResponse('Not authorized to create accounts', 403));
  }

  const { name, email, role = 'employee' } = req.body;

  // Check duplicate
  const existingEmployee = await Employee.findOne({ email });
  if (existingEmployee) {
    return next(new ErrorResponse('Employee already exists', 400));
  }

  // Generate sequential employeeId like EMP01, EMP02...
  const lastEmployee = await Employee.findOne().sort({ createdAt: -1 }).exec();

  let lastNumber = 0;
  if (lastEmployee && lastEmployee.employeeId) {
    const match = lastEmployee.employeeId.match(/EMP(\d+)/);
    if (match) {
      lastNumber = parseInt(match[1], 10);
    }
  }

  const newEmployeeId = `EMP${String(lastNumber + 1).padStart(2, '0')}`;

  // Generate credentials
  const { username, password } = generateCredentials(name);

  // Create employee
  const employee = await Employee.create({
    employeeId: newEmployeeId,
    name,
    email,
    username,
    password,
    role
  });

  try {
    await sendCredentialsEmail(email, username, password);
    res.status(201).json({
      success: true,
      message: 'Account created. Credentials sent to email.',
      data: {
        employeeId: employee.employeeId,
        name: employee.name,
        email: employee.email,
        role: employee.role
      }
    });
  } catch (emailError) {
    console.error('Email failed:', emailError);
    res.status(201).json({
      success: true,
      message: 'Account created but email failed',
      data: {
        username,
        password, // Only shown in development
        employeeId: employee.employeeId
      }
    });
  }
});


