
const fs = require('fs');
const path = require('path');

function copyDir(src, dest) {
  if (!fs.existsSync(dest)) {
    fs.mkdirSync(dest, { recursive: true });
  }
  
  const entries = fs.readdirSync(src, { withFileTypes: true });
  
  for (let entry of entries) {
    const srcPath = path.join(src, entry.name);
    const destPath = path.join(dest, entry.name);
    
    if (entry.isDirectory()) {
      copyDir(srcPath, destPath);
    } else {
      fs.copyFileSync(srcPath, destPath);
    }
  }
}

console.log('🔄 Starting frontend file copy...');

// Fix the path - in Railway, the project is in /app
const frontendDir = '/app';  // Railway puts everything in /app
const publicDir = path.join(__dirname, '..', 'public');

console.log(`Frontend source: ${frontendDir}`);
console.log(`Public destination: ${publicDir}`);

if (!fs.existsSync(publicDir)) {
  fs.mkdirSync(publicDir, { recursive: true });
  console.log('✅ Created public directory');
}

const filesToCopy = ['index.html', 'manifest.json', 'sw.js'];
filesToCopy.forEach(file => {
  const src = path.join(frontendDir, file);
  const dest = path.join(publicDir, file);
  if (fs.existsSync(src)) {
    fs.copyFileSync(src, dest);
    console.log(`✅ Copied: ${file}`);
  } else {
    console.log(`❌ Missing: ${file}`);
  }
});

const dirsToCopy = ['css', 'js', 'pages', 'img', 'icons'];
dirsToCopy.forEach(dir => {
  const src = path.join(frontendDir, dir);
  const dest = path.join(publicDir, dir);
  if (fs.existsSync(src)) {
    copyDir(src, dest);
    console.log(`✅ Copied directory: ${dir}`);
  } else {
    console.log(`❌ Missing directory: ${dir}`);
  }
});

console.log('🎉 Frontend files copied successfully!');
