#!/usr/bin/env node

/**
 * Version Bump Script
 * Automatically increments version in package.json and app.json
 * 
 * Usage: node bump-version.js [major|minor|patch]
 */

const fs = require('fs');
const path = require('path');

// Read command line argument
const bumpType = process.argv[2] || 'patch';

if (!['major', 'minor', 'patch'].includes(bumpType)) {
  console.error('❌ Invalid bump type. Use: major, minor, or patch');
  process.exit(1);
}

/**
 * Increment version number
 */
function incrementVersion(version, type) {
  const parts = version.split('.').map(Number);
  
  switch (type) {
    case 'major':
      parts[0]++;
      parts[1] = 0;
      parts[2] = 0;
      break;
    case 'minor':
      parts[1]++;
      parts[2] = 0;
      break;
    case 'patch':
      parts[2]++;
      break;
  }
  
  return parts.join('.');
}

/**
 * Update package.json
 */
function updatePackageJson() {
  const packagePath = path.join(__dirname, '..', 'package.json');
  
  if (!fs.existsSync(packagePath)) {
    console.log('⚠️  package.json not found, skipping...');
    return null;
  }
  
  const packageJson = JSON.parse(fs.readFileSync(packagePath, 'utf8'));
  const oldVersion = packageJson.version || '0.0.0';
  const newVersion = incrementVersion(oldVersion, bumpType);
  
  packageJson.version = newVersion;
  
  fs.writeFileSync(packagePath, JSON.stringify(packageJson, null, 2) + '\n');
  
  console.log(`✅ package.json: ${oldVersion} → ${newVersion}`);
  return newVersion;
}

/**
 * Update app.json
 */
function updateAppJson(newVersion) {
  const appJsonPath = path.join(__dirname, '..', 'app.json');
  
  if (!fs.existsSync(appJsonPath)) {
    console.log('⚠️  app.json not found, skipping...');
    return;
  }
  
  const appJson = JSON.parse(fs.readFileSync(appJsonPath, 'utf8'));
  
  if (!appJson.expo) {
    console.log('⚠️  Invalid app.json structure, skipping...');
    return;
  }
  
  const oldVersion = appJson.expo.version || '0.0.0';
  appJson.expo.version = newVersion;
  
  // Increment Android versionCode
  if (appJson.expo.android) {
    const oldVersionCode = appJson.expo.android.versionCode || 1;
    appJson.expo.android.versionCode = oldVersionCode + 1;
    console.log(`✅ Android versionCode: ${oldVersionCode} → ${oldVersionCode + 1}`);
  }
  
  // Increment iOS buildNumber
  if (appJson.expo.ios) {
    const oldBuildNumber = appJson.expo.ios.buildNumber || '1';
    const newBuildNumber = String(parseInt(oldBuildNumber) + 1);
    appJson.expo.ios.buildNumber = newBuildNumber;
    console.log(`✅ iOS buildNumber: ${oldBuildNumber} → ${newBuildNumber}`);
  }
  
  fs.writeFileSync(appJsonPath, JSON.stringify(appJson, null, 2) + '\n');
  
  console.log(`✅ app.json: ${oldVersion} → ${newVersion}`);
}

/**
 * Main execution
 */
function main() {
  console.log(`\n🔢 Bumping ${bumpType.toUpperCase()} version...\n`);
  
  const newVersion = updatePackageJson();
  
  if (newVersion) {
    updateAppJson(newVersion);
  }
  
  console.log(`\n✅ Version bump complete! New version: ${newVersion}\n`);
  console.log('💡 Remember to commit these changes:\n');
  console.log('   git add package.json app.json');
  console.log(`   git commit -m "chore: bump version to ${newVersion}"`);
  console.log(`   git tag v${newVersion}`);
  console.log('   git push && git push --tags\n');
}

main();