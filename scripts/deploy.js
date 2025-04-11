require('dotenv').config();
const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

// Configuration
const config = {
  buildCommand: 'npm run build',
  deployDir: process.env.DEPLOY_DIR || './.next',
  backupDir: './backup',
  dbInitScript: 'npm run db:init',
  requiredEnvVars: [
    'DATABASE_URL',
    'OPENAI_API_KEY',
    'JWT_SECRET',
    'TWILIO_ACCOUNT_SID',
    'TWILIO_AUTH_TOKEN',
    'TWILIO_PHONE_NUMBER'
  ]
};

// Utility functions
function executeCommand(command, errorMessage) {
  try {
    console.log(`Executing: ${command}`);
    execSync(command, { stdio: 'inherit' });
    return true;
  } catch (error) {
    console.error(`ERROR: ${errorMessage || 'Command failed'}`);
    console.error(error.message);
    return false;
  }
}

function checkEnvironmentVariables() {
  console.log('Checking required environment variables...');
  const missing = [];
  
  for (const envVar of config.requiredEnvVars) {
    if (!process.env[envVar]) {
      missing.push(envVar);
    }
  }
  
  if (missing.length > 0) {
    console.error('ERROR: Missing required environment variables:');
    missing.forEach(variable => console.error(`  - ${variable}`));
    return false;
  }
  
  console.log('✅ All required environment variables are set');
  return true;
}

function createBackup() {
  if (fs.existsSync(config.deployDir)) {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const backupPath = path.join(config.backupDir, `backup-${timestamp}`);
    
    if (!fs.existsSync(config.backupDir)) {
      fs.mkdirSync(config.backupDir, { recursive: true });
    }
    
    console.log(`Creating backup at ${backupPath}`);
    fs.cpSync(config.deployDir, backupPath, { recursive: true });
    console.log('✅ Backup created successfully');
    return true;
  }
  return true; // No need for backup if deploy dir doesn't exist
}

// Main deployment function
async function deploy() {
  console.log('Starting deployment process...');
  
  // Check environment variables
  if (!checkEnvironmentVariables()) {
    process.exit(1);
  }
  
  // Create backup
  if (!createBackup()) {
    process.exit(1);
  }
  
  // Initialize database
  console.log('Initializing database...');
  if (!executeCommand(config.dbInitScript, 'Failed to initialize database')) {
    process.exit(1);
  }
  
  // Build application
  console.log('Building application...');
  if (!executeCommand(config.buildCommand, 'Build failed')) {
    process.exit(1);
  }
  
  console.log('✅ Deployment completed successfully!');
  console.log('To start the application in production mode, run: npm start');
}

// Run deployment
deploy().catch(err => {
  console.error('Deployment failed with error:', err);
  process.exit(1);
}); 