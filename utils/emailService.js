// utils/emailService.js
const nodemailer = require('nodemailer');

const transporter = nodemailer.createTransport({
  host: process.env.EMAIL_HOST,
  port: parseInt(process.env.EMAIL_PORT),
  secure: process.env.EMAIL_SECURE === 'true',
  auth: {
    user: process.env.EMAIL_USERNAME,
    pass: process.env.EMAIL_PASSWORD
  },
  tls: {
    rejectUnauthorized: false // For self-signed certificates
  }
});

exports.sendCredentialsEmail = async (email, username, password) => {
  try {
    const mailOptions = {
      from: process.env.EMAIL_FROM,
      to: email,
      subject: 'Your Account Credentials',
      text: `Username: ${username}\nPassword: ${password}`,
      html: `<b>Username:</b> ${username}<br><b>Password:</b> ${password}`
    };

    await transporter.verify(); // Verify connection first
    const info = await transporter.sendMail(mailOptions);
    console.log('Email sent:', info.messageId);
    return true;
  } catch (err) {
    console.error('Email error details:', {
      error: err,
      config: {
        host: process.env.EMAIL_HOST,
        port: process.env.EMAIL_PORT,
        secure: process.env.EMAIL_SECURE
      }
    });
    throw err;
  }
};