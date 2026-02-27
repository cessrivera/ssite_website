#!/usr/bin/env node
/**
 * Firebase Deployment Helper
 * Run this after successfully logging in via: firebase login
 */

const { spawn } = require('child_process');

async function deploy() {
  return new Promise((resolve, reject) => {
    const deploy = spawn('firebase', ['deploy', '--only', 'firestore:rules']);
    
    deploy.stdout.on('data', (data) => {
      console.log(`[Deploy] ${data}`);
    });
    
    deploy.stderr.on('data', (data) => {
      console.error(`[Error] ${data}`);
    });
    
    deploy.on('close', (code) => {
      if (code === 0) {
        console.log('\n✅ Firestore rules deployed successfully!');
        resolve();
      } else {
        console.error(`\n❌ Deployment failed with exit code ${code}`);
        reject(new Error(`Firebase deploy exited with code ${code}`));
      }
    });
  });
}

console.log('🚀 Firebase Rules Deployment Tool');
console.log('==================================\n');

if (!process.env.FIREBASE_TOKEN) {
  console.log('📌 First-time setup: Please run the following in your terminal:');
  console.log('   firebase login\n');
  console.log('   Then visit the authentication URL in your browser and complete login.\n');
}

deploy()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error(err.message);
    process.exit(1);
  });
