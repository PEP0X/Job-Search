import { CronJob } from "cron";
import User from "../model/User.model.js";

const cleanupExpiredOTPs = async () => {
  try {
    const currentDate = new Date();
    
    // Update all users by removing expired OTPs
    const result = await User.updateMany(
      { "OTP.expiresIn": { $lt: currentDate } },
      { $pull: { OTP: { expiresIn: { $lt: currentDate } } } }
    );
    
    console.log(`Cleaned up expired OTPs: ${result.modifiedCount} users updated`);
  } catch (error) {
    console.error("Error cleaning up expired OTPs:", error);
  }
};

// Schedule the job to run every 6 hours
const otpCleanupJob = new CronJob("0 */6 * * *", cleanupExpiredOTPs);

// Additional job to clean up old user data (optional)
const cleanupDeletedUsers = async () => {
  try {
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    
    // Find users to delete first
    const usersToDelete = await User.find({
      deletedAt: { $lt: thirtyDaysAgo, $ne: null }
    });
    
    // Process each user individually to trigger hooks
    for (const user of usersToDelete) {
      await User.deleteOne({ _id: user._id });
    }
    
    console.log(`Permanently deleted ${usersToDelete.length} users`);
  } catch (error) {
    console.error("Error cleaning up deleted users:", error);
  }
};

// Schedule user cleanup job to run daily at midnight
const userCleanupJob = new CronJob("0 0 * * *", cleanupDeletedUsers);

// Export jobs so they can be started from server.js
export const startCronJobs = () => {
  otpCleanupJob.start();
  userCleanupJob.start();
  console.log("Cron jobs scheduled successfully");
};

export default {
  startCronJobs,
  otpCleanupJob,
  userCleanupJob
};