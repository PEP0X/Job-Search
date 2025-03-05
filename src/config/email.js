import nodemailer from 'nodemailer';
import { config } from './env.js';

// Create reusable transporter object using SMTP transport
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: config.email.user,
    pass: config.email.password,
  },
  tls: {
    rejectUnauthorized: false, // For development only, remove in production
  },
});

// Verify connection configuration
transporter.verify((error) => {
  if (error) {
    console.error('Email service error:', error);
  } else {
    console.log('Email server is ready to send messages');
  }
});

export default transporter;