const express = require('express');
const router = express.Router();
const Employee = require('../models/Employee'); // Adjust path as needed
const taskRouter = require('./taskRoutes');

const { protect, authorize } = require('../middleware/auth');

// GET /employees - get all active employees, excluding sensitive info
router.get('/', protect, async (req, res) => {
  try {
    // Find all employees where active is true (your pre find middleware should handle this too)
    const employees = await Employee.find({}, 'employeeId name username role email createdAt');

    res.status(200).json(employees);
  } catch (err) {
    console.error('Error fetching employees:', err);
    res.status(500).json({ message: 'Server error fetching employees' });
  }
});

// Re-route into task router

router.use('/:employeeId/tasks', taskRouter);

module.exports = router;
