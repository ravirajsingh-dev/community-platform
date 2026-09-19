/**
 * Database Loader Module
 * 
 * Handles MongoDB database connection initialization.
 * This loader connects to MongoDB using the connection string from environment
 * variables and configures connection options for reliability.
 */

const connectDB = require("../config/db");

/**
 * Initialize database connection
 * @returns {Promise<void>}
 */
const loadDatabase = async () => {
  try {
    await connectDB();
    console.log("✅ Database connection initialized");
  } catch (error) {
    console.error("❌ Database connection failed:", error);
    // connectDB already handles process.exit(1) on failure
    throw error;
  }
};

module.exports = {
  loadDatabase,
};
