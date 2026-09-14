const fs = require('fs');
const { toQR } = require('toqr');
const url = 'exp://192.168.31.63:8081';
const data = toQR(url);
const extent = Math.sqrt(data.byteLength) | 0;
const margin = 4;
const scale = 12;
const size = (extent + margin * 2) * scale;
let svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${size} ${size}" width="${size}" height="${size}"><rect width="100%" height="100%" fill="#ffffff"/>`;
for (let r = 0; r < extent; r++) {
  for (let c = 0; c < extent; c++) {
    if (data[r * extent + c] === 0) {
      const x = (c + margin) * scale;
      const y = (r + margin) * scale;
      svg += `<rect x="${x}" y="${y}" width="${scale}" height="${scale}" fill="#000000"/>`;
    }
  }
}
svg += `</svg>`;
fs.writeFileSync('qrcode_user_app.svg', svg, 'utf-8');
console.log('Generated qrcode_user_app.svg');
