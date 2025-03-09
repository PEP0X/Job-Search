# Job Search API

A comprehensive backend API for a job search platform that connects job seekers with employers. This system allows companies to post job listings, users to apply for positions, and facilitates communication between applicants and hiring managers.

## Features

- **User Authentication**

  - Registration with email verification
  - Login with JWT authentication
  - Password reset functionality
  - Token refresh mechanism

- **User Management**

  - Profile creation and updates
  - Profile picture and cover image management
  - Role-based access control (User, HR, Admin)

- **Company Management**

  - Company creation and verification
  - HR team management
  - Company profile customization with logos and cover images

- **Job Listings**

  - Create, update, and manage job postings
  - Filter jobs by multiple criteria (location, seniority, skills, etc.)
  - Close/reopen job applications

- **Application Process**

  - Apply to jobs with CV upload
  - Track application status
  - Export applications to Excel

- **Messaging System**

  - Real-time chat between applicants and HR
  - Chat permission management

- **Admin Controls**
  - User and company moderation
  - Ban/unban functionality
  - Company approval process

## Tech Stack

- **Backend**: Node.js with Express
- **Database**: MongoDB with Mongoose ODM
- **Authentication**: JWT (JSON Web Tokens)
- **File Storage**: Cloudinary
- **Real-time Communication**: Socket.IO
- **Documentation**: Postman Collection
- **Validation**: Joi
- **Email Service**: Custom email service implementation

## API Endpoints

### Authentication

- `POST /api/auth/signup` - Register a new user
- `POST /api/auth/signin` - Login
- `POST /api/auth/verify-otp` - Verify email with OTP
- `POST /api/auth/forget-password` - Request password reset
- `POST /api/auth/reset-password` - Reset password with OTP
- `POST /api/auth/refresh-token` - Refresh access token

### User Management

- `PUT /api/users/update` - Update user profile
- `GET /api/users/profile` - Get own profile
- `GET /api/users/:id/profile` - Get other user's profile
- `PUT /api/users/update-password` - Update password
- `POST /api/users/profile-pic` - Upload profile picture
- `DELETE /api/users/profile-pic` - Delete profile picture
- `POST /api/users/cover-pic` - Upload cover picture
- `DELETE /api/users/cover-pic` - Delete cover picture
- `DELETE /api/users/delete` - Delete account

### Company Management

- `POST /api/companies` - Create company
- `PUT /api/companies/:id` - Update company
- `DELETE /api/companies/:id` - Delete company
- `GET /api/companies/:id` - Get company details
- `GET /api/companies` - Search companies
- `POST /api/companies/:id/logo` - Upload company logo
- `POST /api/companies/:id/cover` - Upload company cover image
- `DELETE /api/companies/:id/logo` - Delete company logo
- `DELETE /api/companies/:id/cover` - Delete company cover image
- `GET /api/companies/:companyId/applications/export` - Export company applications

### Job Management

- `POST /api/jobs` - Create job
- `PUT /api/jobs/:id` - Update job
- `DELETE /api/jobs/:id` - Delete job
- `GET /api/jobs` - Get all jobs with filters
- `GET /api/jobs/company/:companyId` - Get company jobs
- `GET /api/jobs/:jobId/applications` - Get job applications
- `POST /api/jobs/:jobId/apply` - Apply to job
- `PUT /api/jobs/applications/:id/status` - Update application status

### Chat System

- `GET /api/chats` - Get user chats
- `GET /api/chats/verify/:companyId` - Verify HR chat permissions
- `GET /api/chats/:userId` - Get chat history with user
- `POST /api/chats/:userId/messages` - Send message to user

### Admin Routes

- `POST /api/admin/users/:id/ban` - Ban user
- `POST /api/admin/users/:id/unban` - Unban user
- `POST /api/admin/companies/:id/ban` - Ban company
- `POST /api/admin/companies/:id/unban` - Unban company
- `POST /api/admin/companies/:id/approve` - Approve company

## Getting Started

### Installation

1. Clone the repository

```bash
git clone <repository-url>
cd job-search
```

2. Install dependencies

```bash
npm install
```

3. Configure environment variables

- Copy `.env.example` to `.env`
- Update the following variables:
  ```
  PORT=3000
  MONGODB_URI=your_mongodb_connection_string
  JWT_SECRET=your_jwt_secret
  CLOUDINARY_CLOUD_NAME=your_cloudinary_name
  CLOUDINARY_API_KEY=your_cloudinary_key
  CLOUDINARY_API_SECRET=your_cloudinary_secret
  EMAIL_SERVICE=your_email_service
  EMAIL_USER=your_email_user
  EMAIL_PASSWORD=your_email_password
  ```

4. Start the server

```bash
npm run dev  # for development
npm start    # for production
```

### Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

### License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

### Support

For support, email support@jobsearchapi.com or join our Slack channel.

### Acknowledgments

- MongoDB for database solutions
- Cloudinary for file storage
- Socket.IO for real-time features
- Express.js community
