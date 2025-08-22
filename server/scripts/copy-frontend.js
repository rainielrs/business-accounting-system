
const fs = require('fs');
const path = require('path');

console.log('🚀 Setting up frontend files for Railway deployment...');

const copyFrontendFiles = () => {
  const publicDir = path.join(__dirname, '..', 'public');
  
  // Create public directory if it doesn't exist
  if (!fs.existsSync(publicDir)) {
    fs.mkdirSync(publicDir, { recursive: true });
    console.log('📁 Created public directory');
  }
  
  // Files and directories to copy from parent directory
  const itemsToCopy = [
    'index.html',
    'manifest.json', 
    'sw.js',
    'css',
    'js', 
    'img',
    'icons',
    'pages'
  ];
  
  itemsToCopy.forEach(item => {
    const sourcePath = path.join(__dirname, '..', '..', item);
    const destPath = path.join(publicDir, item);
    
    try {
      if (fs.existsSync(sourcePath)) {
        if (fs.lstatSync(sourcePath).isDirectory()) {
          // Copy directory recursively
          fs.cpSync(sourcePath, destPath, { recursive: true, force: true });
        } else {
          // Copy file
          fs.copyFileSync(sourcePath, destPath);
        }
        console.log(`✅ Copied ${item} to public directory`);
      } else {
        console.log(`⚠️  ${item} not found, skipping...`);
      }
    } catch (error) {
      console.error(`❌ Error copying ${item}:`, error.message);
    }
  });
  
  console.log('🎉 Frontend files setup complete!');
};

// Only run if this script is executed directly
if (require.main === module) {
  copyFrontendFiles();
}

module.exports = { copyFrontendFiles }
