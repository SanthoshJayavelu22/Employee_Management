const express = require('express');
const {
  getTasks,
  getTask,
  createTask,
  updateTask,
  deleteTask,
  getMyTasks,
  updateTaskStatus
} = require('../controllers/taskController');
const { protect } = require('../middleware/auth');

const router = express.Router();

// Employee routes - no authorize middleware
router.get('/me', protect, (req, res, next) => {
 
  next();
}, getMyTasks);

router.put('/:id/status', protect, updateTaskStatus);

// Admin routes - protect + authorize in separate steps
router.use(protect); // Protect all following routes
router.use((req, res, next) => {
  console.log('Admin route access check:', req.employee.role);
  if (req.employee.role !== 'admin') {
    return res.status(403).json({
      success: false,
      error: 'Admin access required'
    });
  }
  next();
});

router.route('/')
  .get(getTasks)
  .post(createTask);

router.route('/:id')
  .get(getTask)
  .put(updateTask)
  .delete(deleteTask);


module.exports = router;