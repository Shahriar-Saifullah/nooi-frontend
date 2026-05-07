const fs = require('fs');
const http = require('http');
const path = require('path');

const content = fs.readFileSync('C:/Users/soebs/.gemini/antigravity/brain/4dfcc4e6-d672-4035-bdb0-5ef88e002e89/.system_generated/steps/269/output.txt', 'utf8');
const regex = /const (img[a-zA-Z0-9]+) = "(http:\/\/localhost:3845\/assets\/([a-zA-Z0-9]+)\.(png|svg|jpg))"/g;

const assetsDir = path.join(__dirname, 'public', 'assets');
if (!fs.existsSync(assetsDir)) {
  fs.mkdirSync(assetsDir, { recursive: true });
}

let match;
const assets = [];
while ((match = regex.exec(content)) !== null) {
  assets.push({
    variable: match[1],
    url: match[2],
    filename: `${match[1]}.${match[4]}`
  });
}

console.log(`Found ${assets.length} assets.`);

async function downloadFile(url, dest) {
  return new Promise((resolve, reject) => {
    const file = fs.createWriteStream(dest);
    http.get(url, (response) => {
      response.pipe(file);
      file.on('finish', () => {
        file.close(resolve);
      });
    }).on('error', (err) => {
      fs.unlink(dest, () => reject(err));
    });
  });
}

async function main() {
  for (const asset of assets) {
    const dest = path.join(assetsDir, asset.filename);
    console.log(`Downloading ${asset.url} -> public/assets/${asset.filename}`);
    await downloadFile(asset.url, dest);
  }
  console.log("Done downloading all assets.");
}

main().catch(console.error);
