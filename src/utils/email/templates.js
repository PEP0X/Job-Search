/**
 * Email templates for various notifications
 */

// Base template with common styling
const baseTemplate = (content) => `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Job Search Platform</title>
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Poppins:wght@300;400;500;600;700&display=swap');
    
    body {
      font-family: 'Poppins', Arial, sans-serif;
      line-height: 1.6;
      color: #333;
      margin: 0;
      padding: 0;
      background-color: #f5f7fa;
    }
    
    .container {
      max-width: 600px;
      margin: 0 auto;
      padding: 20px;
      background-color: #ffffff;
      border-radius: 8px;
      box-shadow: 0 4px 6px rgba(0, 0, 0, 0.05);
    }
    
    .header {
      text-align: center;
      padding: 20px 0;
      border-bottom: 1px solid #eaeaea;
    }
    
    .logo {
      max-width: 150px;
      height: auto;
    }
    
    .content {
      padding: 30px 20px;
    }
    
    .footer {
      text-align: center;
      padding: 20px;
      font-size: 12px;
      color: #888;
      border-top: 1px solid #eaeaea;
    }
    
    .button {
      display: inline-block;
      padding: 12px 24px;
      background-color: #4f46e5;
      color: white;
      text-decoration: none;
      border-radius: 4px;
      font-weight: 500;
      margin: 20px 0;
      transition: background-color 0.3s;
    }
    
    .button:hover {
      background-color: #4338ca;
    }
    
    .code {
      display: inline-block;
      padding: 10px 20px;
      background-color: #f3f4f6;
      border-radius: 4px;
      font-family: monospace;
      font-size: 24px;
      font-weight: bold;
      letter-spacing: 5px;
      margin: 20px 0;
      color: #4f46e5;
    }
    
    .highlight {
      color: #4f46e5;
      font-weight: 600;
    }
    
    @media only screen and (max-width: 600px) {
      .container {
        width: 100%;
        border-radius: 0;
      }
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>Job Search Platform</h1>
    </div>
    <div class="content">
      ${content}
    </div>
    <div class="footer">
      <p>© ${new Date().getFullYear()} Job Search Platform. All rights reserved.</p>
      <p>If you didn't request this email, please ignore it or contact support.</p>
    </div>
  </div>
</body>
</html>
`;

// Email verification template
export const verificationEmailTemplate = (name, otp) => {
  const content = `
    <h2>Verify Your Email Address</h2>
    <p>Hi ${name},</p>
    <p>Thank you for signing up! To complete your registration, please use the verification code below:</p>
    <div class="code">${otp}</div>
    <p>This code will expire in 10 minutes.</p>
    <p>If you didn't create an account, you can safely ignore this email.</p>
  `;
  return baseTemplate(content);
};

// Password reset template
export const passwordResetTemplate = (name, otp) => {
  const content = `
    <h2>Reset Your Password</h2>
    <p>Hi ${name},</p>
    <p>We received a request to reset your password. Use the code below to set a new password:</p>
    <div class="code">${otp}</div>
    <p>This code will expire in 10 minutes.</p>
    <p>If you didn't request a password reset, please ignore this email or contact support if you have concerns.</p>
  `;
  return baseTemplate(content);
};

// Welcome template (after email verification)
export const welcomeTemplate = (name) => {
  const content = `
    <h2>Welcome to Job Search Platform!</h2>
    <p>Hi ${name},</p>
    <p>Your email has been successfully verified. Thank you for joining our platform!</p>
    <p>You can now access all features of our job search platform:</p>
    <ul>
      <li>Search for jobs matching your skills</li>
      <li>Create a professional profile</li>
      <li>Apply to positions with a single click</li>
      <li>Track your application status</li>
    </ul>
    <a href="{{siteUrl}}/dashboard" class="button">Go to Dashboard</a>
    <p>We're excited to help you find your dream job!</p>
  `;
  return baseTemplate(content);
};


/**
 * Application confirmation email template
 * @param {String} firstName - User's first name
 * @param {Object} job - Job details
 * @param {Object} company - Company details
 * @returns {String} HTML email template
 */
export const applicationConfirmationTemplate = (firstName, job, company) => baseTemplate(`
  <div class="content">
    <h2>Application Submitted Successfully</h2>
    <p>Hello ${firstName},</p>
    <p>Your application for the position of <strong>${job.jobTitle}</strong> at <strong>${company.companyName}</strong> has been successfully submitted.</p>
    
    <div class="details">
      <h3>Job Details:</h3>
      <ul>
        <li><strong>Position:</strong> ${job.jobTitle}</li>
        <li><strong>Company:</strong> ${company.companyName}</li>
        <li><strong>Location:</strong> ${job.jobLocation}</li>
        <li><strong>Working Time:</strong> ${job.workingTime}</li>
      </ul>
    </div>
    
    <p>The hiring team will review your application and get back to you soon. You can check the status of your application in your dashboard.</p>
    
    <p>Best of luck with your application!</p>
    
    <div class="footer">
      <p>If you have any questions, please don't hesitate to contact us.</p>
    </div>
  </div>
`);

/**
 * Application status update email template
 * @param {String} firstName - User's first name
 * @param {Object} job - Job details
 * @param {Object} company - Company details
 * @param {String} status - New application status
 * @returns {String} HTML email template
 */
export const applicationStatusUpdateTemplate = (firstName, job, company, status) => {
  let statusMessage = '';
  
  switch(status) {
    case 'accepted':
      statusMessage = 'Congratulations! Your application has been accepted. The company will contact you soon to discuss the next steps.';
      break;
    case 'viewed':
      statusMessage = 'Your application has been viewed by the hiring team. They are currently reviewing your qualifications.';
      break;
    case 'in consideration':
      statusMessage = 'Good news! Your application is being considered for the position. The hiring team is evaluating all candidates.';
      break;
    case 'rejected':
      statusMessage = 'Thank you for your interest. After careful consideration, the company has decided to pursue other candidates for this position.';
      break;
    default:
      statusMessage = 'Your application status has been updated.';
  }
  
  return baseTemplate(`
    <div class="content">
      <h2>Application Status Update</h2>
      <p>Hello ${firstName},</p>
      <p>There has been an update to your application for the position of <strong>${job.jobTitle}</strong> at <strong>${company.companyName}</strong>.</p>
      
      <div class="status">
        <h3>Status: ${status.charAt(0).toUpperCase() + status.slice(1)}</h3>
        <p>${statusMessage}</p>
      </div>
      
      <div class="details">
        <h3>Job Details:</h3>
        <ul>
          <li><strong>Position:</strong> ${job.jobTitle}</li>
          <li><strong>Company:</strong> ${company.companyName}</li>
        </ul>
      </div>
      
      <p>You can check your application details in your dashboard.</p>
      
      <div class="footer">
        <p>If you have any questions, please don't hesitate to contact us.</p>
      </div>
    </div>
  `);
};