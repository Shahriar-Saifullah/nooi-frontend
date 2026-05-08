const fs = require('fs');
const https = require('http');
const path = require('path');

const assets = {
  "logo.png": "http://localhost:3845/assets/e2fd09f2ab1c08c58cda79333e96a0a242f74589.png",
  "video-pic-1.png": "http://localhost:3845/assets/d08e33e655f9938fb6f1baaedb7558b93e75d789.png",
  "video-pic-2.png": "http://localhost:3845/assets/0b4840646a9e1e27aa6c7a4f9676cb5eac31bb11.png",
  "furniture-4-2.png": "http://localhost:3845/assets/66cca9b9cee4b74801d2854e82cdfe9f072db647.png",
  "furniture-2-2.png": "http://localhost:3845/assets/18f110d45411b16fdc1cd6006f701df6462caef6.png",
  "draft-1.png": "http://localhost:3845/assets/37f6286c32e2b46f38ef42e342d8fd50da701595.png",
  "upload-1.png": "http://localhost:3845/assets/1210924df07d62a39eda4eee6b2f4a73ee6f8d28.png",
  "gallery-1.png": "http://localhost:3845/assets/64e59971a135495d2ea068875724acc5125a8eff.png",
  "gallery-2.png": "http://localhost:3845/assets/9e480d7b0e0f3fed5da9c6bed2cfebc83c07801c.png",
  "gallery-3.png": "http://localhost:3845/assets/dbce58094b060561e6ff1d478df7fe6c1d188ba8.png",
  "gallery-4.png": "http://localhost:3845/assets/7b8442e869d4159e4caaeed093852daf38186777.png",
  "gallery-5.png": "http://localhost:3845/assets/c28274594c5eb7d73f207d8cddd1d08ae50a1372.png",
  "gallery-6.png": "http://localhost:3845/assets/d44cebc7ed8b754b9d59a6fe7ce0cc5bccb64f93.png",
  "feature-image.png": "http://localhost:3845/assets/d13079201a6a35457adddf914c728a6a3194cc91.png",
  "bg-grid.svg": "http://localhost:3845/assets/9a6be53241fcdf1d6b7f8568ce4226af15ae01e7.svg",
  "arrow-down.svg": "http://localhost:3845/assets/e10179cb347b38ed21c90ca91d79c1c89ef02002.svg",
  "container-svg.svg": "http://localhost:3845/assets/cb3dabc97f2b68312e829a759e636a374691ca8a.svg",
  "stars.svg": "http://localhost:3845/assets/6cf2ca224e4c93c0ea57ed5889218223d2140b8b.svg",
  "vector-1.svg": "http://localhost:3845/assets/46dbadaa9d6640ac6d057eeb5bfce310a4d638cf.svg",
  "vector-2.svg": "http://localhost:3845/assets/c9fadb01d7fcf7612c21d351ea635e8445e872cc.svg",
  "vector-3.svg": "http://localhost:3845/assets/f2d1c55ab9ca89ba1fce39667208cb2ffb123459.svg",
  "vector-4.svg": "http://localhost:3845/assets/241b42ad0fe233c1cb5a76f4e779c1275903fda9.svg",
  "icon.svg": "http://localhost:3845/assets/2474798ba5c30cf5abfceeb15bc405bb67a21a2c.svg",
  "grid-svg.svg": "http://localhost:3845/assets/5cc8fff172b4ca9829a2045176aa0fd00949f040.svg",
  "arrow-outward.svg": "http://localhost:3845/assets/5c2b08bbea8ed70abdb68c25e34136509abcaceb.svg",
  "vector-5.svg": "http://localhost:3845/assets/686244c8b8805b4fc3cb9040e82ff753d1ce563e.svg",
  "vector-6.svg": "http://localhost:3845/assets/ccf9d0fd4e66f29e42ea8048d88ffc8548db4ad0.svg",
  "elements.svg": "http://localhost:3845/assets/fc8b900c6a831eb9c7e6f45f5a2fc6dd374c7d9b.svg",
  "grid-svg-1.svg": "http://localhost:3845/assets/668fd953067f6146b398c33ee15e8de809cd06b9.svg",
  "furniture-4-1.svg": "http://localhost:3845/assets/0b8dd931d87faefaa95363ca47cad4605479cea2.svg",
  "furniture-2-1.svg": "http://localhost:3845/assets/f5df845cd00180b893032ee8d1d5b4bd73d694cf.svg",
  "vector-27.svg": "http://localhost:3845/assets/b8995c42b4c55c8e7bae20302c973709b690ede8.svg",
  "image-svg.svg": "http://localhost:3845/assets/855e29d09e75df22905d9fa93284159ab8657c7d.svg",
  "image-svg-1.svg": "http://localhost:3845/assets/b00fe29eb0f76299bae975052b8973c9f4fe5d84.svg",
  "image-svg-2.svg": "http://localhost:3845/assets/5a7795d1635f5046f50cdf0a6c3f8538a2e622b1.svg",
  "design-services.svg": "http://localhost:3845/assets/c5de73f55849070c42479ab78a25df920f57ef4b.svg",
  "line.svg": "http://localhost:3845/assets/d4b5861171489f6640d219d9ce4406a70e871a37.svg",
  "arrows-output.svg": "http://localhost:3845/assets/504cf843104afa0a8d6ae1f4a6c5ccbc8066d55f.svg",
  "line-1.svg": "http://localhost:3845/assets/c3388f95d65d8712bc92826ef05247ef06e25fe7.svg",
  "webhook.svg": "http://localhost:3845/assets/bb00cfa5d0d56f2457006733aa1390346cb48a8b.svg",
  "verified-user.svg": "http://localhost:3845/assets/75fed2d6f13e6bcd00d10c99b1a33ca289b65fd0.svg",
  "container-7.svg": "http://localhost:3845/assets/3046d4da24f52fbec02ef0a92efba85528bfa2e0.svg",
  "vector-6-1.svg": "http://localhost:3845/assets/9a68e73ba7888a5086f6d14d5b50564b7967d74a.svg",
  "vector-7.svg": "http://localhost:3845/assets/de51ae59b93d0f57b0e243cfd40f052c6f954d60.svg",
  "vector-8.svg": "http://localhost:3845/assets/8983084ff4b4985088b215861424c1fe6f05b7a3.svg",
  "windows.svg": "http://localhost:3845/assets/c11696f7ba6383dd0339dd32736162d1d5fad0c5.svg",
  "apple.svg": "http://localhost:3845/assets/33eb3e994b744e0d8afae592cc45cbab37240201.svg",
  "line-209.svg": "http://localhost:3845/assets/330a9c961a55136edaf491b3cd599876aa488c21.svg",
  "ellipse-8.svg": "http://localhost:3845/assets/108f51605da2924451c0ac5b8f012c4cf04e7ae9.svg",
  "group.svg": "http://localhost:3845/assets/94913d5d43ebdb0a9573f4a18e644bd09c6abac1.svg",
  "group-1.svg": "http://localhost:3845/assets/7ced1fa14575bacfbc0b89b7b1638c03c5c1dd07.svg",
  "container-8.svg": "http://localhost:3845/assets/156961ca1e52919a013e58dd240b9d546c9ab2a0.svg",
  "language-circle.svg": "http://localhost:3845/assets/f70bff6097de44a056be520e5ce8e5f2fd5f4ea1.svg",
  "arrow-down-01.svg": "http://localhost:3845/assets/ec5c7914bb7eb039d279972e982171e118686546.svg"
};

const assetsDir = path.join(__dirname, 'public', 'assets');

if (!fs.existsSync(assetsDir)) {
  fs.mkdirSync(assetsDir, { recursive: true });
}

Object.entries(assets).forEach(([name, url]) => {
  const filePath = path.join(assetsDir, name);
  const file = fs.createWriteStream(filePath);
  https.get(url, (response) => {
    response.pipe(file);
    file.on('finish', () => {
      file.close();
      console.log(`Downloaded: ${name}`);
    });
  }).on('error', (err) => {
    fs.unlink(filePath);
    console.error(`Error downloading ${name}: ${err.message}`);
  });
});
