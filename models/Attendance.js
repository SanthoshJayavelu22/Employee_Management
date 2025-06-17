const mongoose = require('mongoose');

const AttendanceSchema = new mongoose.Schema({
  employee: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Employee',
    required: true
  },
  date: {
    type: Date,
    default: () => new Date().setHours(0, 0, 0, 0), // normalized to date
    required: true
  },
  status: {
    type: String,
    enum: ['present', 'absent', 'half-day', 'casual leave', 'sick leave', 'paid leave'],
    required: true
  },
  submittedAt: {
    type: Date,
    default: Date.now // capture exact submission timestamp
  },
  checkoutAt: {
    type: Date,
    default: null // initially null, can be set later when user checks out
  }
});

// Ensure one entry per employee per day
AttendanceSchema.index({ employee: 1, date: 1 }, { unique: true });

module.exports = mongoose.model('Attendance', AttendanceSchema);
