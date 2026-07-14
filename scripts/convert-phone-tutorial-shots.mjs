// Convert the phone activation-tutorial screenshots (PNG, captions baked in)
// into web-optimized webp under /public. Run: node scripts/convert-phone-tutorial-shots.mjs
import sharp from 'sharp';
import { readdirSync, mkdirSync } from 'fs';

const SRC = 'assets-source/us-stock-tutorial/phone';
const OUT = 'public/images/us-stock/tutorial/phone';

mkdirSync(OUT, { recursive: true });

const files = readdirSync(SRC)
  .filter((f) => /^\d+\.png$/i.test(f))
  .sort((a, b) => parseInt(a) - parseInt(b));

for (const f of files) {
  const n = parseInt(f);
  const meta = await sharp(`${SRC}/${f}`)
    .resize({ width: 800, withoutEnlargement: true })
    .webp({ quality: 82 })
    .toFile(`${OUT}/${n}.webp`);
  console.log(`${f} -> ${n}.webp  (${meta.width}x${meta.height})`);
}
console.log(`\nDone: ${files.length} images -> ${OUT}`);
