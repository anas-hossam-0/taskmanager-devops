const mongoose = require('mongoose');

const connectDB = async () => {
  const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/taskmanager';

  try {
    const conn = await mongoose.connect(MONGO_URI);
    console.log(`MongoDB connected: ${conn.connection.host}`);
  } catch (error) {
    console.error(`MongoDB connection error: ${error.message}`);
    process.exit(1);
  }
};

module.exports = connectDB;