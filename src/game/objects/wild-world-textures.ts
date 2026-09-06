import type * as Phaser from 'phaser';

const worlds = {
  candy: { base: '#b83c87', top: '#ffdaef', accent: '#54e7db' },
  toybox: { base: '#e45942', top: '#ffd765', accent: '#4bbcf5' },
  neon: { base: '#302060', top: '#8affcc', accent: '#f069ff' },
};

export function createWildWorldTextures(scene: Phaser.Scene) {
  for (const [world, colors] of Object.entries(worlds)) {
    const key = `${world}-props`;
    if (scene.textures.exists(key)) continue;
    const texture = scene.textures.createCanvas(key, 512, 384);
    if (!texture) continue;
    const c = texture.context;
    // Every platform starts at its collision edge; decorative details hang below it.
    const gradient = c.createLinearGradient(0, 0, 0, 90);
    gradient.addColorStop(0, colors.top);
    gradient.addColorStop(0.18, colors.base);
    gradient.addColorStop(1, '#251e49');
    c.fillStyle = gradient;
    c.beginPath();
    c.roundRect(0, 0, 512, 88, [0, 0, 18, 18]);
    c.fill();
    c.fillStyle = colors.top;
    c.fillRect(0, 0, 512, 8);
    if (world === 'candy') {
      for (let x = 8; x < 512; x += 32) {
        c.fillStyle = x % 64 === 8 ? colors.top : colors.accent;
        c.beginPath();
        c.ellipse(x, 17, 19, 12 + (x % 3) * 4, 0, 0, Math.PI * 2);
        c.fill();
        c.fillStyle = '#ffe88b';
        c.fillRect(x, 48, 12, 4);
      }
    } else if (world === 'toybox') {
      for (let x = 0; x < 512; x += 64) {
        c.fillStyle = x % 128 === 0 ? colors.base : colors.accent;
        c.fillRect(x + 2, 10, 60, 69);
        c.strokeStyle = '#ffffff88';
        c.lineWidth = 3;
        c.strokeRect(x + 9, 18, 44, 48);
        c.fillStyle = colors.top;
        c.beginPath();
        c.arc(x + 31, 42, 10, 0, Math.PI * 2);
        c.fill();
      }
    } else {
      c.strokeStyle = colors.accent;
      c.lineWidth = 4;
      for (let x = 0; x < 512; x += 48) {
        c.beginPath();
        c.moveTo(x, 30);
        c.lineTo(x + 20, 62);
        c.lineTo(x + 42, 30);
        c.stroke();
      }
      c.fillStyle = colors.accent;
      c.fillRect(0, 78, 512, 5);
    }
    for (let index = 0; index < 3; index++) {
      const x = 80 + index * 170;
      c.strokeStyle = colors.accent;
      c.lineWidth = 12;
      c.beginPath();
      c.moveTo(x, 370);
      c.bezierCurveTo(x - 40, 280, x + 40, 260, x, 200);
      c.stroke();
      c.fillStyle = colors.base;
      c.beginPath();
      if (world === 'toybox') c.roundRect(x - 45, 155, 90, 95, 12);
      else c.ellipse(x, 210, 52, world === 'neon' ? 30 : 52, 0, 0, Math.PI * 2);
      c.fill();
      c.strokeStyle = colors.top;
      c.lineWidth = 5;
      c.stroke();
      c.fillStyle = colors.top;
      for (const eye of [-18, 18]) {
        c.beginPath();
        c.arc(x + eye, 207, 10, 0, Math.PI * 2);
        c.fill();
      }
      c.fillStyle = '#252144';
      for (const eye of [-18, 18]) {
        c.beginPath();
        c.arc(x + eye - 3, 207, 4, 0, Math.PI * 2);
        c.fill();
      }
    }
    texture.refresh();
    texture.add('platform', 0, 0, 0, 512, 96);
    texture.add('floor', 0, 0, 0, 512, 96);
    texture.add('plant', 0, 0, 145, 160, 239);
    texture.add('rock', 0, 170, 145, 160, 239);
    texture.add('plant-small', 0, 340, 145, 172, 239);
  }
}
