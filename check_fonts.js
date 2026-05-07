const fs = require('fs');
const content = fs.readFileSync('C:/Users/soebs/.gemini/antigravity/brain/4dfcc4e6-d672-4035-bdb0-5ef88e002e89/.system_generated/steps/269/output.txt', 'utf8');

const regex1 = /font-family: ([^;]+);/g;
const regex2 = /fontFamily: ['"]([^'"]+)['"]/g;

const fonts = new Set();
let match;

while ((match = regex1.exec(content)) !== null) {
  fonts.add(match[1]);
}

while ((match = regex2.exec(content)) !== null) {
  fonts.add(match[1]);
}

console.log("Fonts found:", Array.from(fonts));
