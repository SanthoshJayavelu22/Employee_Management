const mongoose = require('mongoose');
const validator = require('validator');

const TaskSchema = new mongoose.Schema({
  title: {
    type: String,
    required: [true, 'Please add a title'],
    trim: true,
    maxlength: [100, 'Title cannot exceed 100 characters']
  },
  description: {
    type: String,
    required: [true, 'Please add a description'],
    trim: true,
    maxlength: [500, 'Description cannot exceed 500 characters']
  },
  assignedTo: {
    type: mongoose.Schema.ObjectId,
    ref: 'Employee',
    required: [true, 'Please assign the task to an employee']
  },
  assignedBy: {
    type: mongoose.Schema.ObjectId,
    ref: 'Employee',
    required: true
  },
  status: {
    type: String,
    enum: ['pending', 'in-progress', 'completed'],
    default: 'pending'
  },
  priority: {
    type: String,
    enum: ['low', 'medium', 'high'],
    default: 'medium'
  },
  dueDate: {
    type: Date,
    required: [true, 'Please add a due date']
  },
  completedAt: {
    type: Date
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
}, {
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Indexes for better query performance
TaskSchema.index({ assignedTo: 1, status: 1 });
TaskSchema.index({ assignedBy: 1 });
TaskSchema.index({ dueDate: 1 });

// Virtuals for populated data
TaskSchema.virtual('assignedEmployee', {
  ref: 'Employee',
  localField: 'assignedTo',
  foreignField: '_id',
  justOne: true
});

TaskSchema.virtual('assignedByEmployee', {
  ref: 'Employee',
  localField: 'assignedBy',
  foreignField: '_id',
  justOne: true
});

// Middleware to validate due date is in the future when creating
// TaskSchema.pre('save', function(next) {
//   if (this.isNew && this.dueDate <= new Date()) {
//     throw new Error('Due date must be in the future');
//   }
//   next();
// });

module.exports = mongoose.model('Task', TaskSchema);
