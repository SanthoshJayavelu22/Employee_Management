const express = require('express');
const {
  markAttendance,
  getAttendance,
 updateAttendance, checkOut,getEmployeeAttendance
} = require('../controllers/attendanceController');
const { protect, authorize } = require('../middleware/auth');
const Attendance = require('../models/Attendance');

const router = express.Router();

router.route('/')
  .post(protect, markAttendance)
   .get(protect, authorize('admin'), getAttendance);

   router.get('/employee', protect, authorize('employee'), getEmployeeAttendance);  

router
  .route('/:id')
  .put(protect, updateAttendance);


router
  .patch('/checkout', protect, checkOut);

module.exports = router;