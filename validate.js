#!/usr/bin/env node

// Validation script to check for critical issues
const fs = require('fs');
const path = require('path');

console.log('🔍 Running Location Intelligence Web App Validation...\n');

const issues = [];
const warnings = [];

// Check if critical files exist
const criticalFiles = [
  'backend/server.js',
  'backend/package.json',
  'frontend/package.json',
  'frontend/src/App.tsx',
  'frontend/src/types/index.ts',
  'database/schemas/init.sql',
  'claude.md',
  'plan.md',
  'README.md'
];

console.log('📁 Checking critical files...');
criticalFiles.forEach(file => {
  if (fs.existsSync(file)) {
    console.log(`  ✅ ${file}`);
  } else {
    issues.push(`❌ Missing critical file: ${file}`);
  }
});

// Check environment examples
console.log('\n🔧 Checking environment configuration...');
const envFiles = [
  'backend/.env.example',
  'frontend/.env.example'
];

envFiles.forEach(file => {
  if (fs.existsSync(file)) {
    console.log(`  ✅ ${file}`);
  } else {
    warnings.push(`⚠️  Missing environment example: ${file}`);
  }
});

// Check deployment configs
console.log('\n🚀 Checking deployment configuration...');
const deployFiles = [
  'vercel.json',
  'railway.toml',
  '.github/workflows/deploy.yml'
];

deployFiles.forEach(file => {
  if (fs.existsSync(file)) {
    console.log(`  ✅ ${file}`);
  } else {
    warnings.push(`⚠️  Missing deployment config: ${file}`);
  }
});

// Check route structure
console.log('\n🛣️  Checking API route structure...');
const routeFiles = [
  'backend/routes/health.js',
  'backend/routes/location.js',
  'backend/routes/poi.js',
  'backend/routes/navigation.js'
];

routeFiles.forEach(file => {
  if (fs.existsSync(file)) {
    console.log(`  ✅ ${file}`);
  } else {
    issues.push(`❌ Missing route file: ${file}`);
  }
});

// Check service files
console.log('\n⚙️  Checking service files...');
const serviceFiles = [
  'backend/services/locationService.js',
  'backend/services/poiService.js',
  'backend/services/navigationService.js'
];

serviceFiles.forEach(file => {
  if (fs.existsSync(file)) {
    console.log(`  ✅ ${file}`);
  } else {
    issues.push(`❌ Missing service file: ${file}`);
  }
});

// Check frontend components
console.log('\n🎨 Checking frontend components...');
const componentFiles = [
  'frontend/src/components/MapComponent.tsx',
  'frontend/src/components/CoordinateInput.tsx',
  'frontend/src/components/LocationResults.tsx'
];

componentFiles.forEach(file => {
  if (fs.existsSync(file)) {
    console.log(`  ✅ ${file}`);
  } else {
    issues.push(`❌ Missing component file: ${file}`);
  }
});

// Check API consistency (basic check)
console.log('\n🔗 Checking API endpoint consistency...');

try {
  // Read backend routes
  const locationRoutes = fs.readFileSync('backend/routes/location.js', 'utf8');
  const poiRoutes = fs.readFileSync('backend/routes/poi.js', 'utf8');
  const navRoutes = fs.readFileSync('backend/routes/navigation.js', 'utf8');

  // Read frontend API service
  const apiService = fs.readFileSync('frontend/src/services/api.ts', 'utf8');

  // Check critical endpoints
  const endpoints = [
    { name: '/analyze', backend: locationRoutes.includes("'/analyze'"), frontend: apiService.includes("'/location/analyze'") },
    { name: '/geocode', backend: locationRoutes.includes("'/geocode'"), frontend: apiService.includes("'/location/geocode'") },
    { name: '/poi/search', backend: poiRoutes.includes("'/search'"), frontend: apiService.includes("'/poi/search'") },
    { name: '/navigation/directions', backend: navRoutes.includes("'/directions'"), frontend: apiService.includes("'/navigation/directions'") }
  ];

  endpoints.forEach(endpoint => {
    if (endpoint.backend && endpoint.frontend) {
      console.log(`  ✅ ${endpoint.name} - Backend & Frontend match`);
    } else {
      issues.push(`❌ Endpoint mismatch: ${endpoint.name} - Backend: ${endpoint.backend}, Frontend: ${endpoint.frontend}`);
    }
  });

} catch (error) {
  warnings.push(`⚠️  Could not verify API consistency: ${error.message}`);
}

// Summary
console.log('\n📊 Validation Summary:');
console.log('='.repeat(50));

if (issues.length === 0) {
  console.log('🎉 No critical issues found!');
} else {
  console.log(`❌ Found ${issues.length} critical issues:`);
  issues.forEach(issue => console.log(`  ${issue}`));
}

if (warnings.length === 0) {
  console.log('✅ No warnings!');
} else {
  console.log(`⚠️  ${warnings.length} warnings:`);
  warnings.forEach(warning => console.log(`  ${warning}`));
}

console.log('\n🏁 Validation complete!');

if (issues.length === 0) {
  console.log('\n✅ The Location Intelligence Web App appears to be correctly configured and ready for deployment!');
  process.exit(0);
} else {
  console.log('\n❌ Please fix the critical issues before deployment.');
  process.exit(1);
}