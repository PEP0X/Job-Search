// No need to import gql from apollo-server-express
const typeDefs = `#graphql
  type User {
    _id: ID!
    firstName: String!
    lastName: String!
    email: String!
    gender: String!
    DOB: String!
    mobileNumber: String!
    role: String!
    isConfirmed: Boolean!
    profilePic: ProfilePic
    coverPic: ProfilePic
    createdAt: String!
    updatedAt: String!
    bannedAt: String
    deletedAt: String
  }

  type ProfilePic {
    secure_url: String
    public_id: String
  }

  type Company {
    _id: ID!
    companyName: String!
    description: String!
    industry: String!
    address: String!
    numberOfEmployees: String!
    companyEmail: String!
    createdBy: User!
    logo: ProfilePic
    coverPic: ProfilePic
    HRs: [User]
    bannedAt: String
    deletedAt: String
    legalAttachment: ProfilePic
    approvedByAdmin: Boolean!
    createdAt: String!
    updatedAt: String!
  }

  type Job {
    _id: ID!
    jobTitle: String!
    jobLocation: String!
    workingTime: String!
    seniorityLevel: String!
    jobDescription: String!
    technicalSkills: [String!]!
    softSkills: [String!]!
    companyId: Company!
    addedBy: User!
    updatedBy: User
    closed: Boolean!
    deletedAt: String
    createdAt: String!
    updatedAt: String!
  }

  type Application {
    _id: ID!
    jobId: Job!
    userId: User!
    userCV: ProfilePic!
    status: String!
    createdAt: String!
    updatedAt: String!
  }

  type PaginatedUsers {
    users: [User!]!
    totalCount: Int!
    totalPages: Int!
    currentPage: Int!
  }

  type PaginatedCompanies {
    companies: [Company!]!
    totalCount: Int!
    totalPages: Int!
    currentPage: Int!
  }

  type PaginatedJobs {
    jobs: [Job!]!
    totalCount: Int!
    totalPages: Int!
    currentPage: Int!
  }

  type PaginatedApplications {
    applications: [Application!]!
    totalCount: Int!
    totalPages: Int!
    currentPage: Int!
  }

  type Query {
    # User queries
    users(page: Int, limit: Int, search: String): PaginatedUsers!
    user(id: ID!): User

    # Company queries
    companies(page: Int, limit: Int, search: String, approved: Boolean): PaginatedCompanies!
    company(id: ID!): Company

    # Job queries
    jobs(page: Int, limit: Int, companyId: ID): PaginatedJobs!
    job(id: ID!): Job

    # Application queries
    applications(page: Int, limit: Int, jobId: ID, userId: ID): PaginatedApplications!
    application(id: ID!): Application

    # Dashboard statistics
    statistics: Statistics!
  }

  type Statistics {
    totalUsers: Int!
    totalCompanies: Int!
    totalJobs: Int!
    totalApplications: Int!
    pendingCompanies: Int!
    activeJobs: Int!
    recentUsers: [User!]!
    recentCompanies: [Company!]!
  }
`;

export default typeDefs;
