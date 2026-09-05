const fs = require('fs');
const path = require('path');
const zlib = require('zlib');

// CRC32 table & function
const crcTable = [];
for (let n = 0; n < 256; n++) {
  let c = n;
  for (let k = 0; k < 8; k++) {
    c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
  }
  crcTable[n] = c;
}

function crc32(buf) {
  let c = 0xffffffff;
  for (let i = 0; i < buf.length; i++) {
    c = crcTable[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
  }
  return (c ^ 0xffffffff) >>> 0;
}

function makeChunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length, 0);
  const typeBuf = Buffer.from(type, 'ascii');
  const crcBuf = Buffer.alloc(4);
  const toCrc = Buffer.concat([typeBuf, data]);
  crcBuf.writeUInt32BE(crc32(toCrc), 0);
  return Buffer.concat([len, typeBuf, data, crcBuf]);
}

function createPng(width, height, isMaskable = false) {
  const rowLen = width * 4 + 1; // 1 filter byte per row
  const raw = Buffer.alloc(rowLen * height);

  const cx = width / 2;
  const cy = height / 2;
  const radius = width * 0.44;

  for (let y = 0; y < height; y++) {
    const rowOffset = y * rowLen;
    raw[rowOffset] = 0; // Filter: None

    for (let x = 0; x < width; x++) {
      const pxOffset = rowOffset + 1 + x * 4;
      const dx = x - cx;
      const dy = y - cy;
      const dist = Math.sqrt(dx * dx + dy * dy);

      // Default background
      let r = 0x14, g = 0x14, b = 0x14, a = 0xff; // #141414

      if (!isMaskable && dist > radius) {
        // Transparent outside rounded icon
        a = 0x00;
      } else {
        // Draw Bus/Transit emblem
        // Bus box: cx - w*0.22 to cx + w*0.22, cy - h*0.24 to cy + h*0.22
        const bx1 = cx - width * 0.22;
        const bx2 = cx + width * 0.22;
        const by1 = cy - height * 0.22;
        const by2 = cy + height * 0.22;

        if (x >= bx1 && x <= bx2 && y >= by1 && y <= by2) {
          // Bus body in #F27D26
          r = 0xf2; g = 0x7d; b = 0x26; a = 0xff;

          // Windshield:
          const wx1 = cx - width * 0.16;
          const wx2 = cx + width * 0.16;
          const wy1 = cy - height * 0.16;
          const wy2 = cy - height * 0.04;
          if (x >= wx1 && x <= wx2 && y >= wy1 && y <= wy2) {
            r = 0x14; g = 0x14; b = 0x14; // dark windshield
          }

          // Headlights
          const ly1 = cy + height * 0.10;
          const ly2 = cy + height * 0.16;
          // Left light
          if (x >= cx - width * 0.16 && x <= cx - width * 0.08 && y >= ly1 && y <= ly2) {
            r = 0xff; g = 0xff; b = 0xff; // white light
          }
          // Right light
          if (x >= cx + width * 0.08 && x <= cx + width * 0.16 && y >= ly1 && y <= ly2) {
            r = 0xff; g = 0xff; b = 0xff; // white light
          }
        }

        // Wheels
        const wy = cy + height * 0.23;
        const wDist1 = Math.sqrt((x - (cx - width * 0.13)) ** 2 + (y - wy) ** 2);
        const wDist2 = Math.sqrt((x - (cx + width * 0.13)) ** 2 + (y - wy) ** 2);
        if (wDist1 <= width * 0.06 || wDist2 <= width * 0.06) {
          r = 0xff; g = 0xff; b = 0xff; a = 0xff;
        }
      }

      raw[pxOffset] = r;
      raw[pxOffset + 1] = g;
      raw[pxOffset + 2] = b;
      raw[pxOffset + 3] = a;
    }
  }

  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 6; // color type RGBA
  ihdr[10] = 0; // compression
  ihdr[11] = 0; // filter
  ihdr[12] = 0; // interlace

  const signature = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
  const ihdrChunk = makeChunk('IHDR', ihdr);
  const idatChunk = makeChunk('IDAT', zlib.deflateSync(raw));
  const iendChunk = makeChunk('IEND', Buffer.alloc(0));

  return Buffer.concat([signature, ihdrChunk, idatChunk, iendChunk]);
}

const publicDir = path.join(__dirname, '../public');
if (!fs.existsSync(publicDir)) {
  fs.mkdirSync(publicDir, { recursive: true });
}

// 1. Generate PNGs
fs.writeFileSync(path.join(publicDir, 'pwa-192x192.png'), createPng(192, 192, false));
fs.writeFileSync(path.join(publicDir, 'pwa-512x512.png'), createPng(512, 512, false));
fs.writeFileSync(path.join(publicDir, 'pwa-maskable-512x512.png'), createPng(512, 512, true));
fs.writeFileSync(path.join(publicDir, 'apple-touch-icon.png'), createPng(180, 180, true));
fs.writeFileSync(path.join(publicDir, 'favicon.ico'), createPng(48, 48, false));

// 2. Generate Brand SVG
const svgContent = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" fill="none">
  <rect width="512" height="512" rx="128" fill="#141414"/>
  <rect x="120" y="120" width="272" height="272" rx="48" fill="#F27D26"/>
  <rect x="156" y="160" width="200" height="96" rx="20" fill="#141414"/>
  <rect x="160" y="300" width="48" height="32" rx="8" fill="#FFFFFF"/>
  <rect x="304" y="300" width="48" height="32" rx="8" fill="#FFFFFF"/>
  <circle cx="180" cy="400" r="28" fill="#141414"/>
  <circle cx="180" cy="400" r="14" fill="#FFFFFF"/>
  <circle cx="332" cy="400" r="28" fill="#141414"/>
  <circle cx="332" cy="400" r="14" fill="#FFFFFF"/>
</svg>`;
fs.writeFileSync(path.join(publicDir, 'icon.svg'), svgContent);

console.log('PWA icons successfully generated in /public');
