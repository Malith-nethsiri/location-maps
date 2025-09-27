// Railway Entry Point - Simple Backend Launcher
// This file tells Railway to use the backend dependencies

console.log('🚀 Starting ValuerPro Backend Server...');
console.log('📁 Project Root:', __dirname);

// Require and start the backend server directly
try {
  require('./backend/server.js');
} catch (error) {
  console.error('❌ Failed to start backend server:', error);

  // Fallback: try to run database fix first
  console.log('🔧 Trying database fix first...');
  try {
    require('./backend/scripts/fix_database_schema.js');
    console.log('✅ Database fix completed, retrying server...');
    require('./backend/server.js');
  } catch (fixError) {
    console.error('❌ Database fix also failed:', fixError);
    process.exit(1);
  }
}