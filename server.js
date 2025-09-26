// Railway Entry Point - Redirects to Backend Server
// This file allows Railway to detect the project structure correctly

const path = require('path');
const { spawn } = require('child_process');

console.log('🚀 Starting ValuerPro Backend Server...');
console.log('📁 Project Root:', __dirname);
console.log('🎯 Backend Path:', path.join(__dirname, 'backend'));

// Change to backend directory and start the server
process.chdir(path.join(__dirname, 'backend'));

console.log('📍 Current Directory:', process.cwd());
console.log('🔧 Starting database schema fix...');

// First run the database fix
const fixProcess = spawn('node', ['scripts/fix_database_schema.js'], {
  stdio: 'inherit',
  env: process.env
});

fixProcess.on('close', (code) => {
  if (code === 0) {
    console.log('✅ Database schema fix completed');
    console.log('🌟 Starting main server...');

    // Then start the main server
    const serverProcess = spawn('node', ['server.js'], {
      stdio: 'inherit',
      env: process.env
    });

    serverProcess.on('close', (serverCode) => {
      console.log(`❌ Server process exited with code ${serverCode}`);
      process.exit(serverCode);
    });

    serverProcess.on('error', (error) => {
      console.error('❌ Failed to start server:', error);
      process.exit(1);
    });
  } else {
    console.log(`⚠️  Database fix completed with code ${code}, starting server anyway...`);

    // Start server even if DB fix fails
    const serverProcess = spawn('node', ['server.js'], {
      stdio: 'inherit',
      env: process.env
    });

    serverProcess.on('close', (serverCode) => {
      console.log(`❌ Server process exited with code ${serverCode}`);
      process.exit(serverCode);
    });
  }
});

fixProcess.on('error', (error) => {
  console.error('⚠️  Database fix failed, starting server directly:', error);

  // Start server directly if fix fails
  const serverProcess = spawn('node', ['server.js'], {
    stdio: 'inherit',
    env: process.env
  });

  serverProcess.on('close', (serverCode) => {
    process.exit(serverCode);
  });
});