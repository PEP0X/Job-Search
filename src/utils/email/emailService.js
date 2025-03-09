import transporter from '../../config/email.js';
import { config } from '../../config/env.js';
import * as templates from './templates.js';

/**
 * Send email using nodemailer
 * @param {Object} options - Email options
 * @returns {Promise} - Nodemailer send mail promise
 */
const sendEmail = async (options) => {
  const mailOptions = {
    from: `"Job Search Platform" <${config.email.user}>`,
    to: options.to,
    subject: options.subject,
    html: options.html.replace(/{{siteUrl}}/g, config.siteUrl),
  };

  return transporter.sendMail(mailOptions);
};

/**
 * Send verification email with OTP
 * @param {Object} user - User object with name and email
 * @param {String} otp - One-time password
 * @returns {Promise}
 */
export const sendVerificationEmail = async (user, otp) => {
  const { firstName, email } = user;
  
  return sendEmail({
    to: email,
    subject: 'Verify Your Email Address',
    html: templates.verificationEmailTemplate(firstName, otp),
  });
};

/**
 * Send password reset email with OTP
 * @param {Object} user - User object with name and email
 * @param {String} otp - One-time password
 * @returns {Promise}
 */
export const sendPasswordResetEmail = async (user, otp) => {
  const { firstName, email } = user;
  
  return sendEmail({
    to: email,
    subject: 'Reset Your Password',
    html: templates.passwordResetTemplate(firstName, otp),
  });
};

/**
 * Send welcome email after verification
 * @param {Object} user - User object with name and email
 * @returns {Promise}
 */
export const sendWelcomeEmail = async (user) => {
  const { firstName, email } = user;
  
  return sendEmail({
    to: email,
    subject: 'Welcome to Job Search Platform!',
    html: templates.welcomeTemplate(firstName),
  });
};
// Add these functions to your existing emailService.js file

/**
 * Send application confirmation email to user
 * @param {Object} user - User who applied
 * @param {Object} job - Job applied for
 * @param {Object} company - Company that posted the job
 * @returns {Promise}
 */
export const sendApplicationConfirmation = async (user, job, company) => {
  const { firstName, email } = user;
  
  return sendEmail({
    to: email,
    subject: `Application Submitted: ${job.jobTitle} at ${company.companyName}`,
    html: templates.applicationConfirmationTemplate(firstName, job, company),
  });
};

/**
 * Send application status update
 * @param {Object} user - User object with name and email
 * @param {Object} job - Job details
 * @param {Object} company - Company details
 * @param {String} status - New application status
 * @returns {Promise}
 */
export const sendApplicationStatusUpdate = async (user, job, company, status) => {
  const { firstName, email } = user;
  
  return sendEmail({
    to: email,
    subject: 'Application Status Update',
    html: templates.applicationStatusTemplate(firstName, job.jobTitle, company.companyName, status),
  });
};