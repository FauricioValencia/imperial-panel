// Script to generate PWA icons as simple SVGs converted to PNG-like format
// Run: node scripts/generate-icons.js

const fs = require("fs");
const path = require("path");

function generateSVG(size) {
  const fontSize = Math.round(size * 0.5);
  const borderRadius = Math.round(size * 0.15);
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
  <rect width="${size}" height="${size}" rx="${borderRadius}" fill="#1E3A5F"/>
  <text x="50%" y="54%" dominant-baseline="middle" text-anchor="middle" fill="white" font-family="Arial, Helvetica, sans-serif" font-weight="bold" font-size="${fontSize}">I</text>
</svg>`;
}

const iconsDir = path.join(__dirname, "..", "public", "icons");
if (!fs.existsSync(iconsDir)) {
  fs.mkdirSync(iconsDir, { recursive: true });
}

// Generate SVG icons (browsers support SVG in manifest)
const sizes = [192, 512];
for (const size of sizes) {
  const svg = generateSVG(size);
  fs.writeFileSync(path.join(iconsDir, `icon-${size}.svg`), svg);
  console.log(`Generated icon-${size}.svg`);
}

// Also generate a favicon SVG
const faviconSvg = generateSVG(32);
fs.writeFileSync(path.join(iconsDir, "favicon.svg"), faviconSvg);
console.log("Generated favicon.svg");

console.log("\nNote: For production, convert SVGs to PNG using a tool like sharp or an online converter.");
console.log("The manifest currently references .png files - update to .svg or convert these.");
