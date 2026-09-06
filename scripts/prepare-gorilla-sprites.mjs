import { chromium } from '@playwright/test';
import { readFile, writeFile } from 'node:fs/promises';

const browser = await chromium.launch();
try {
  const page = await browser.newPage();
  const source = await readFile(new URL('../art/gorilla-poses-source.png', import.meta.url));
  const png = await page.evaluate(async (base64) => {
    const image = new Image();
    image.src = 'data:image/png;base64,' + base64;
    await image.decode();
    const canvas = document.createElement('canvas');
    canvas.width = image.width;
    canvas.height = image.height;
    const c = canvas.getContext('2d');
    c.drawImage(image, 0, 0);
    const data = c.getImageData(0, 0, canvas.width, canvas.height);
    const { width: w, height: h } = canvas;
    const visited = new Uint8Array(w * h);
    const queue = [];
    const visit = (i) => {
      if (visited[i]) return;
      const [r, g, b] = data.data.subarray(i * 4, i * 4 + 3);
      if (Math.min(r, g, b) < 185 || Math.max(r, g, b) - Math.min(r, g, b) > 28) return;
      visited[i] = 1;
      queue.push(i);
    };
    for (let x = 0; x < w; x++) { visit(x); visit((h - 1) * w + x); }
    for (let y = 0; y < h; y++) { visit(y * w); visit(y * w + w - 1); }
    for (let q = 0; q < queue.length; q++) {
      const i = queue[q];
      data.data[i * 4 + 3] = 0;
      if (i % w > 0) visit(i - 1);
      if (i % w < w - 1) visit(i + 1);
      if (i >= w) visit(i - w);
      if (i < w * (h - 1)) visit(i + w);
    }
    c.putImageData(data, 0, 0);
    const sheet = document.createElement('canvas');
    sheet.width = 1024;
    sheet.height = 256;
    const out = sheet.getContext('2d');
    for (let i = 0; i < 4; i++)
      out.drawImage(canvas, (i % 2) * w / 2, Math.floor(i / 2) * h / 2, w / 2, h / 2, i * 256, 0, 256, 256);
    return sheet.toDataURL('image/png').split(',')[1];
  }, source.toString('base64'));
  await writeFile(new URL('../public/assets/gorilla-poses.png', import.meta.url), Buffer.from(png, 'base64'));
} finally {
  await browser.close();
}
