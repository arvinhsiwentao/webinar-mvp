// Rasterize the computer activation-tutorial screenshots (SVG) into web-optimized
// webp under /public. Run: node scripts/convert-computer-tutorial-shots.mjs
import sharp from 'sharp';
import { readdirSync, mkdirSync } from 'fs';

const SRC = '1_plus_3_landingpage/啟用教學/電腦版';
const OUT = 'public/images/us-stock/tutorial/computer';

mkdirSync(OUT, { recursive: true });

const files = readdirSync(SRC)
  .filter((f) => /\.svg$/i.test(f))
  .sort((a, b) => parseInt(a) - parseInt(b));

for (const f of files) {
  const n = parseInt(f); // leading number in "1. 序號開啟頁.svg"
  // trim() removes the white slide margins so App screenshots become true portrait
  // (not a small phone centered in a 16:9 white box); then cap the longest side.
  const meta = await sharp(`${SRC}/${f}`, { density: 200 })
    .trim({ threshold: 10 })
    .resize(1500, 1500, { fit: 'inside', withoutEnlargement: true })
    .webp({ quality: 85 })
    .toFile(`${OUT}/${n}.webp`);
  console.log(`${f} -> ${n}.webp  (${meta.width}x${meta.height})`);
}
console.log(`\nDone: ${files.length} images -> ${OUT}`);
