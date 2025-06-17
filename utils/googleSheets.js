const { GoogleSpreadsheet } = require('google-spreadsheet');
const { JWT } = require('google-auth-library');

const serviceAccountAuth = new JWT({
  email: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
  key: process.env.GOOGLE_PRIVATE_KEY.replace(/\\n/g, '\n'),
  scopes: ['https://www.googleapis.com/auth/spreadsheets'],
});

const doc = new GoogleSpreadsheet(process.env.GOOGLE_SHEET_ID, serviceAccountAuth);

exports.updateAttendanceSheet = async (attendance) => {
  try {
    await doc.loadInfo();

    let sheet;
    if (doc.sheetCount === 0) {
      sheet = await doc.addSheet({
        title: 'Attendance',
        headerValues: ['Date', 'Employee ID', 'Name', 'Status', 'Check-In Time', 'Check-Out Time']
      });
    } else {
      sheet = doc.sheetsByIndex[0];
      await sheet.loadHeaderRow();
    }

    const formattedDate = new Date(attendance.date).toISOString().split('T')[0];
    const currentMonth = new Date(attendance.date).getMonth();
    const currentYear = new Date(attendance.date).getFullYear();

    const formatTime = (date) => {
      if (!date) return 'N/A';
      const d = new Date(date);
      return d.toLocaleTimeString('en-US', {
        hour: 'numeric',
        minute: '2-digit',
        hour12: true
      });
    };

    const employeeId = attendance.employee?.employeeId || 'N/A';
    const employeeName = attendance.employee?.name || 'N/A';

    const rows = await sheet.getRows();

    // Check if a new month has started
    if (rows.length > 0) {
      const lastRow = rows[rows.length - 1];
      const lastRowDate = new Date(lastRow.get('Date'));

      const lastMonth = lastRowDate.getMonth();
      const lastYear = lastRowDate.getFullYear();

      if (currentMonth !== lastMonth || currentYear !== lastYear) {
        // Insert an empty row to separate months
        await sheet.addRow({
          'Date': '',
          'Employee ID': '',
          'Name': '',
          'Status': '',
          'Check-In Time': '',
          'Check-Out Time': ''
        });
        console.log('📅 New month detected, inserted empty row');
      }
    }

    const existingRow = rows.find(row => {
      const rowDate = new Date(row.get('Date')).toISOString().split('T')[0];
      return row.get('Employee ID')?.trim() === employeeId &&
             rowDate === formattedDate;
    });

    if (existingRow) {
      if (attendance.status) existingRow.set('Status', attendance.status);
      if (attendance.submittedAt) {
        existingRow.set('Check-In Time', formatTime(attendance.submittedAt));
      }
      if (attendance.checkOutTime) {
        existingRow.set('Check-Out Time', formatTime(attendance.checkOutTime));
      }
      await existingRow.save();
      console.log('🔄 Updated existing attendance record');
    } else {
      await sheet.addRow({
        'Date': formattedDate,
        'Employee ID': employeeId,
        'Name': employeeName,
        'Status': attendance.status || 'present',
        'Check-In Time': formatTime(attendance.submittedAt || attendance.date),
        'Check-Out Time': formatTime(attendance.checkOutTime)
      });
      console.log('➕ Added new attendance record');
    }

    console.log('✅ Google Sheet successfully updated');
    return { success: true };

  } catch (err) {
    console.error('❌ Detailed Google Sheets error:', {
      message: err.message,
      stack: err.stack,
      code: err.code
    });
    throw new Error(`Spreadsheet update failed: ${err.message}`);
  }
};
