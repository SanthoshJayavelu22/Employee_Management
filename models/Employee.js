const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const validator = require('validator');

const EmployeeSchema = new mongoose.Schema({
employeeId: {
  type: String,
  required: true,
  unique: true,
  trim: true,
  uppercase: true,
  validate: {
    validator: function (v) {
      return /^EMP\d{2,6}$/.test(v); // EMP followed by 2–6 digits
    },
    message: props => `${props.value} is not a valid employee ID!`
  }
}
,
  name: {
    type: String,
    required: [true, 'Please add a name'],
    trim: true,

    maxlength: [50, 'Name cannot exceed 50 characters'],
    minlength: [2, 'Name must be at least 2 characters']
  },
  email: {
    type: String,
    required: [true, 'Please add an email'],
    unique: true,
    trim: true,
    lowercase: true,
    validate: [validator.isEmail, 'Please add a valid email']
  },
  username: {
    type: String,
    required: true,
   
    trim: true,
    minlength: [4, 'Username must be at least 4 characters'],
    validate: {
      validator: function(v) {
        return /^[a-zA-Z0-9_.-]+$/.test(v);
      },
      message: props => `${props.value} contains invalid characters!`
    }
  },
  password: {
    type: String,
    required: [true, 'Please add a password'],
    minlength: [8, 'Password must be at least 8 characters'],
    select: false
  },
  role: {
    type: String,
    enum: {
      values: ['employee', 'admin'],
      message: 'Role is either: employee or admin'
    },
    default: 'employee'
  },
  passwordChangedAt: Date,
  passwordResetToken: String,
  passwordResetExpires: Date,
  active: {
    type: Boolean,
    default: true,
    select: false
  },
  createdAt: {
    type: Date,
    default: Date.now,
    immutable: true
  }
}, {
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Password encryption middleware
EmployeeSchema.pre('save', async function(next) {
  if (!this.isModified('password')) return next();
  
  this.password = await bcrypt.hash(this.password, 12);
  this.passwordChangedAt = Date.now() - 1000; // Ensures token is created after password change
  next();
});

// Query middleware to filter out inactive employees by default
EmployeeSchema.pre(/^find/, function(next) {
  this.find({ active: { $ne: false } });
  next();
});

// Instance methods
EmployeeSchema.methods = {
  isAdmin: function() {
    return this.role === 'admin';
  },

  getSignedJwtToken: function() {
    return jwt.sign(
      { id: this._id, role: this.role },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRE }
    );
  },

  matchPassword: async function(candidatePassword) {
    return await bcrypt.compare(candidatePassword, this.password);
  },

  changedPasswordAfter: function(JWTTimestamp) {
    if (this.passwordChangedAt) {
      const changedTimestamp = parseInt(
        this.passwordChangedAt.getTime() / 1000,
        10
      );
      return JWTTimestamp < changedTimestamp;
    }
    return false;
  },

  createPasswordResetToken: function() {
    const resetToken = crypto.randomBytes(32).toString('hex');
    
    this.passwordResetToken = crypto
      .createHash('sha256')
      .update(resetToken)
      .digest('hex');
      
    this.passwordResetExpires = Date.now() + 10 * 60 * 1000; // 10 minutes
    
    return resetToken;
  }
};

// Virtual for full employee details (excluding sensitive info)
EmployeeSchema.virtual('profile').get(function() {
  return {
    employeeId: this.employeeId,
    name: this.name,
    email: this.email,
    role: this.role,
    createdAt: this.createdAt
  };
});

module.exports = mongoose.model('Employee', EmployeeSchema);