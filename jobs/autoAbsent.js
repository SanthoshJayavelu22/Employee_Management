const cron = require('node-cron');
const moment = require('moment-timezone');
const Employee = require('../models/Employee');
const Attendance = require('../models/Attendance');
const { updateAttendanceSheet } = require('../utils/googleSheets');

const APP_TIMEZONE = 'Asia/Kolkata';

cron.schedule('45 18 * * *', async () => {
  try {
    const today = moment().tz(APP_TIMEZONE);

    // Skip Sundays
    if (today.day() === 0) { // 0 = Sunday
      console.log(`[${today.format()}] 💤 Sunday detected, skipping auto-absent`);
      return;
    }

    const todayStart = today.startOf('day').toDate();
    const todayEnd = today.endOf('day').toDate();

    // Exclude admins from the employee list
    const allEmployees = await Employee.find({ role: { $ne: 'admin' } });

    const attendanceToday = await Attendance.find({
      date: { $gte: todayStart, $lte: todayEnd }
    });

    const markedEmployeeIds = attendanceToday.map((a) => a.employee.toString());

    const unmarkedEmployees = allEmployees.filter(
      (e) => !markedEmployeeIds.includes(e._id.toString())
    );

    for (const emp of unmarkedEmployees) {
      const absentRecord = await Attendance.create({
        employee: emp._id,
        date: today.toDate(),
        status: 'absent',
        submittedAt: new Date()
      });

      await absentRecord.populate('employee', 'employeeId name email');

      try {
        await updateAttendanceSheet({
          ...absentRecord.toObject(),
          submittedAt: absentRecord.submittedAt
        });
      } catch (err) {
        console.error(`Failed to update sheet for ${emp.name}:`, err.message);
      }
    }

    console.log(`[${today.format()}] ✅ Auto-absent marking completed`);
  } catch (err) {
    console.error(`[${moment().format()}] ❌ Auto-absent error:`, err.message);
  }
});
