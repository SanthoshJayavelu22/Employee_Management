const Task = require('../models/Task');
const ErrorResponse = require('../utils/errorResponse');
const asyncHandler = require('../utils/asyncHandler');

// @desc    Get all tasks (Admin only)
// @route   GET /tasks
// @access  Private/Admin
exports.getTasks = asyncHandler(async (req, res, next) => {
  // Advanced filtering, sorting, pagination
  let query;

  // Copy req.query
  const reqQuery = { ...req.query };

  // Fields to exclude
  const removeFields = ['select', 'sort', 'page', 'limit'];

  // Loop over removeFields and delete them from reqQuery
  removeFields.forEach(param => delete reqQuery[param]);

  // Create query string
  let queryStr = JSON.stringify(reqQuery);

  // Create operators ($gt, $gte, etc)
  queryStr = queryStr.replace(/\b(gt|gte|lt|lte|in)\b/g, match => `$${match}`);

  // Finding resource
  query = Task.find(JSON.parse(queryStr))
    .populate('assignedEmployee', 'name employeeId')
    .populate('assignedByEmployee', 'name employeeId');

  // Select fields
  if (req.query.select) {
    const fields = req.query.select.split(',').join(' ');
    query = query.select(fields);
  }

  // Sort
  if (req.query.sort) {
    const sortBy = req.query.sort.split(',').join(' ');
    query = query.sort(sortBy);
  } else {
    query = query.sort('-createdAt');
  }

  // Pagination
  const page = parseInt(req.query.page, 10) || 1;
  const limit = parseInt(req.query.limit, 10) || 10;
  const startIndex = (page - 1) * limit;
  const endIndex = page * limit;
  const total = await Task.countDocuments(JSON.parse(queryStr));

  query = query.skip(startIndex).limit(limit);

  // Executing query
  const tasks = await query;

  // Pagination result
  const pagination = {};

  if (endIndex < total) {
    pagination.next = {
      page: page + 1,
      limit
    };
  }

  if (startIndex > 0) {
    pagination.prev = {
      page: page - 1,
      limit
    };
  }

  res.status(200).json({
    success: true,
    count: tasks.length,
    pagination,
    data: tasks
  });
});

// @desc    Get single task (Admin only)
// @route   GET /tasks/:id
// @access  Private/Admin
exports.getTask = asyncHandler(async (req, res, next) => {
  const task = await Task.findById(req.params.id)
    .populate('assignedEmployee', 'name employeeId')
    .populate('assignedByEmployee', 'name employeeId');

  if (!task) {
    return next(new ErrorResponse(`Task not found with id of ${req.params.id}`, 404));
  }

  res.status(200).json({
    success: true,
    data: task
  });
});

// @desc    Create new task (Admin only)
// @route   POST /tasks
// @access  Private/Admin
exports.createTask = asyncHandler(async (req, res, next) => {
  // Add assignedBy (admin who created the task)
  req.body.assignedBy = req.employee.id;

  const task = await Task.create(req.body);

  res.status(201).json({
    success: true,
    data: task
  });
});

// @desc    Update task (Admin only)
// @route   PUT /tasks/:id
// @access  Private/Admin
exports.updateTask = asyncHandler(async (req, res, next) => {
  let task = await Task.findById(req.params.id);

  if (!task) {
    return next(new ErrorResponse(`Task not found with id of ${req.params.id}`, 404));
  }

  // Only allow certain fields to be updated by admin
  const { title, description, priority, dueDate, assignedTo } = req.body;
  
  task = await Task.findByIdAndUpdate(req.params.id, {
    title,
    description,
    priority,
    dueDate,
    assignedTo
  }, {
    new: true,
    runValidators: true
  });

  res.status(200).json({
    success: true,
    data: task
  });
});

// @desc    Delete task (Admin only)
// @route   DELETE /tasks/:id
// @access  Private/Admin
exports.deleteTask = asyncHandler(async (req, res, next) => {
  const task = await Task.findById(req.params.id);

  if (!task) {
    return next(new ErrorResponse(`Task not found with id of ${req.params.id}`, 404));
  }

  await Task.deleteOne({ _id: req.params.id });

  res.status(200).json({
    success: true,
    data: {}
  });
});

// @desc    Get tasks assigned to current employee
// @route   GET /tasks/me
// @access  Private
exports.getMyTasks = asyncHandler(async (req, res, next) => {
  const tasks = await Task.find({ assignedTo: req.employee.id })
    .select('-__v')
    .populate('assignedByEmployee', 'name employeeId')
    .sort('-createdAt');

  res.status(200).json({
    success: true,
    count: tasks.length,
    data: tasks
  });
});

// @desc    Update task status (Employee only)
// @route   PUT /tasks/:id/status
// @access  Private
exports.updateTaskStatus = asyncHandler(async (req, res, next) => {
  const { status } = req.body;
  const taskId = req.params.id;

  if (!['pending', 'in-progress', 'completed'].includes(status)) {
    return next(new ErrorResponse('Invalid status value', 400));
  }

  const task = await Task.findOne({
    _id: taskId,
    assignedTo: req.employee.id
  });

  if (!task) {
    return next(new ErrorResponse('Task not found or not assigned to you', 404));
  }

  // Update status and set completedAt if status is 'completed'
  task.status = status;
  if (status === 'completed') {
    task.completedAt = new Date();
  }

  await task.save();

  res.status(200).json({
    success: true,
    data: task
  });
});