// Railway Entry Point - ValuerPro Backend Launcher
// Minimal entry point that delegates to backend server

console.log('🚀 ValuerPro Backend Starting...');
console.log('📁 Root:', process.cwd());
console.log('🎯 Backend:', require('path').join(process.cwd(), 'backend'));

// Simple require - let the backend handle its own setup
require('./backend/server.js');