const Attendance = require('../models/Attendance');
const Employee = require('../models/Employee');
const { updateAttendanceSheet } = require('../utils/googleSheets');
const ErrorResponse = require('../utils/errorResponse');
const asyncHandler = require('../utils/asyncHandler');
const moment = require('moment-timezone');

// Timezone configuration
const APP_TIMEZONE = 'Asia/Kolkata';

// @desc    Mark attendance (present/absent/half-day)
// @route   POST /attendance
// @access  Private
exports.markAttendance = asyncHandler(async (req, res, next) => {
  const { status } = req.body;
  const employeeId = req.employee.id;

  // Validate input
  if (!status || !['present', 'absent', 'half-day','casual leave', 'sick leave', 'paid leave'].includes(status)) {
    return next(new ErrorResponse('Invalid attendance status', 400));
  }

  // Verify employee exists
  const employee = await Employee.findById(employeeId);
  if (!employee) {
    return next(new ErrorResponse('Employee not found', 404));
  }

  // Get today's date range in app timezone
  const todayStart = moment().tz(APP_TIMEZONE).startOf('day').toDate();
  const todayEnd = moment().tz(APP_TIMEZONE).endOf('day').toDate();

  // Check for existing attendance
  const existingAttendance = await Attendance.findOne({
    employee: employeeId,
    date: { $gte: todayStart, $lte: todayEnd }
  });

  if (existingAttendance) {
    return next(new ErrorResponse('Attendance already marked for today', 400));
  }

  // Create new attendance record with current time in app timezone
  const attendance = await Attendance.create({
    employee: employeeId,
    date: moment().tz(APP_TIMEZONE).toDate(),
    status,
    submittedAt: new Date() // Store actual submission time
  });

  // Populate employee details
  await attendance.populate('employee', 'employeeId name email');

  // Format time for response
  const localTime = moment(attendance.date).tz(APP_TIMEZONE).format('DD-MM-YYYY hh:mm A');

  // Update Google Sheet with error handling
  try {
    await updateAttendanceSheet({
      ...attendance.toObject(),
      submittedAt: attendance.submittedAt
    });
  } catch (err) {
    console.error('Google Sheets update failed:', err);
    // Consider logging this to a monitoring service
  }

  res.status(201).json({
    success: true,
    message: 'Attendance marked successfully',
    data: {
      ...attendance._doc,
      submittedTime: localTime,
    }
  });
});

// @desc    Get attendance records with filtering
// @route   GET /attendance
// @access  Private/Admin
exports.getAttendance = asyncHandler(async (req, res, next) => {
  const { startDate, endDate, employeeName, status } = req.query;
  const filter = {};

  // Date filtering with validation
  if (startDate || endDate) {
    filter.date = {};
    if (startDate) {
      const parsedStart = moment(startDate).tz(APP_TIMEZONE).startOf('day');
      if (!parsedStart.isValid()) {
        return next(new ErrorResponse('Invalid start date format', 400));
      }
      filter.date.$gte = parsedStart.toDate();
    }
    if (endDate) {
      const parsedEnd = moment(endDate).tz(APP_TIMEZONE).endOf('day');
      if (!parsedEnd.isValid()) {
        return next(new ErrorResponse('Invalid end date format', 400));
      }
      filter.date.$lte = parsedEnd.toDate();
    }
  }

  if (status) filter.status = status;

  // Only fetch employees that are NOT admin
  const employeeQuery = {
    role: { $ne: 'admin' } // 
  };

  if (employeeName) {
    employeeQuery.name = { $regex: employeeName, $options: 'i' };
  }

  const employees = await Employee.find(employeeQuery).select('_id');

  if (employeeName && employees.length === 0) {
    return next(new ErrorResponse('No employees found matching the name', 404));
  }

  filter.employee = { $in: employees.map(emp => emp._id) };

  const attendance = await Attendance.find(filter)
    .populate('employee', 'employeeId name email')
    .sort('-date');

  res.status(200).json({
    success: true,
    count: attendance.length,
    data: attendance
  });
});


// @desc    Get attendance records for the logged-in employee
// @route   GET /attendance/employee
// @access  Private/Employee
exports.getEmployeeAttendance = asyncHandler(async (req, res, next) => {
  const { startDate, endDate, status } = req.query;
  const filter = {
    employee: req.employee.id, 
  };

  // Date filtering with validation
  if (startDate || endDate) {
    filter.date = {};
    if (startDate) {
      const parsedStart = moment(startDate).tz(APP_TIMEZONE).startOf('day');
      if (!parsedStart.isValid()) {
        return next(new ErrorResponse('Invalid start date format', 400));
      }
      filter.date.$gte = parsedStart.toDate();
    }
    if (endDate) {
      const parsedEnd = moment(endDate).tz(APP_TIMEZONE).endOf('day');
      if (!parsedEnd.isValid()) {
        return next(new ErrorResponse('Invalid end date format', 400));
      }
      filter.date.$lte = parsedEnd.toDate();
    }
  }

  if (status) {
    filter.status = status;
  }

  const attendance = await Attendance.find(filter)
    .populate('employee', 'employeeId name email')
    .sort('-date');

  res.status(200).json({
    success: true,
    count: attendance.length,
    data: attendance
  });
});



// @desc    Update existing attendance record
// @route   PUT /attendance/:id
// @access  Private/Admin
exports.updateAttendance = asyncHandler(async (req, res, next) => {
  const { status } = req.body;

  if (!status || !['present', 'absent', 'half-day', 'casual leave', 'sick leave', 'paid leave'].includes(status)) {
    return next(new ErrorResponse('Invalid attendance status', 400));
  }

  let attendance = await Attendance.findById(req.params.id)
    .populate('employee', 'employeeId name email');
  
  if (!attendance) {
    return next(new ErrorResponse('Attendance record not found', 404));
  }

  attendance = await Attendance.findByIdAndUpdate(
    req.params.id,
    { status },
    { new: true, runValidators: true }
  ).populate('employee', 'employeeId name email');

  // Update Google Sheet with better error handling
  try {
    await updateAttendanceSheet({
      ...attendance.toObject(),
    
    });
  } catch (err) {
    console.error('Google Sheets update failed:', err);
    // Consider implementing a retry mechanism here
  }

  res.status(200).json({
    success: true,
    data: attendance
  });
});


// @desc    Mark employee checkout time
// @route   PATCH /attendance/checkout
// @access  Private
exports.checkOut = asyncHandler(async (req, res, next) => {
  const employeeId = req.employee.id;

  const todayStart = moment().tz(APP_TIMEZONE).startOf('day').toDate();
  const todayEnd = moment().tz(APP_TIMEZONE).endOf('day').toDate();

  const attendance = await Attendance.findOne({
    employee: employeeId,
    date: { $gte: todayStart, $lte: todayEnd }
  }).populate('employee', 'employeeId name email'); // Needed for sheet update

  if (!attendance) {
    return next(new ErrorResponse('No attendance found for today', 404));
  }

  if (!['present', 'half-day'].includes(attendance.status)) {
    return next(new ErrorResponse('Checkout allowed only for present or half-day status', 400));
  }

  if (attendance.checkoutAt) {
    return next(new ErrorResponse('Already checked out', 400));
  }

  attendance.checkoutAt = new Date();
  await attendance.save();

  // Update Google Sheet
  try {
    await updateAttendanceSheet({
      ...attendance.toObject(),
      submittedAt: attendance.submittedAt || attendance.date,
      checkOutTime: attendance.checkoutAt
    });
  } catch (err) {
    console.error('Google Sheets checkout update failed:', err);
  }

  res.status(200).json({
    success: true,
    message: 'Checkout successful',
    data: {
      ...attendance._doc,
      checkoutTime: moment(attendance.checkoutAt).tz(APP_TIMEZONE).format('hh:mm A')
    }
  });
});



