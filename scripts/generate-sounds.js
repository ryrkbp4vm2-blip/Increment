// Synthesizes the game's short SFX as 16-bit PCM WAV files. Run with node.
const fs = require('fs');
const path = require('path');

const RATE = 44100;
const OUT = path.join(__dirname, '..', 'assets', 'sounds');
fs.mkdirSync(OUT, { recursive: true });

function writeWav(name, samples) {
  const n = samples.length;
  const buf = Buffer.alloc(44 + n * 2);
  buf.write('RIFF', 0);
  buf.writeUInt32LE(36 + n * 2, 4);
  buf.write('WAVE', 8);
  buf.write('fmt ', 12);
  buf.writeUInt32LE(16, 16);
  buf.writeUInt16LE(1, 20); // PCM
  buf.writeUInt16LE(1, 22); // mono
  buf.writeUInt32LE(RATE, 24);
  buf.writeUInt32LE(RATE * 2, 28);
  buf.writeUInt16LE(2, 32);
  buf.writeUInt16LE(16, 34);
  buf.write('data', 36);
  buf.writeUInt32LE(n * 2, 40);
  for (let i = 0; i < n; i++) {
    const v = Math.max(-1, Math.min(1, samples[i]));
    buf.writeInt16LE((v * 32767) | 0, 44 + i * 2);
  }
  fs.writeFileSync(path.join(OUT, name), buf);
  console.log('wrote', name, (n / RATE).toFixed(2) + 's');
}

const sec = (s) => Math.floor(s * RATE);
const decay = (i, n, k = 5) => Math.exp((-k * i) / n);

// tap: short bright blip
{
  const n = sec(0.05);
  const s = new Array(n);
  for (let i = 0; i < n; i++) {
    const t = i / RATE;
    s[i] = 0.28 * Math.sin(2 * Math.PI * 1100 * t) * decay(i, n, 6);
  }
  writeWav('tap.wav', s);
}

// buy: two-tone coin
{
  const n = sec(0.12);
  const s = new Array(n);
  for (let i = 0; i < n; i++) {
    const t = i / RATE;
    const f = i < n / 2 ? 720 : 1080;
    s[i] = 0.3 * Math.sin(2 * Math.PI * f * t) * decay(i, n, 4);
  }
  writeWav('buy.wav', s);
}

// shatter: noise burst, descending
{
  const n = sec(0.26);
  const s = new Array(n);
  let prev = 0;
  for (let i = 0; i < n; i++) {
    const noise = Math.random() * 2 - 1;
    prev = prev * 0.6 + noise * 0.4; // crude low-pass
    s[i] = 0.34 * prev * decay(i, n, 5);
  }
  writeWav('shatter.wav', s);
}

// comet: rising sparkle chirp
{
  const n = sec(0.3);
  const s = new Array(n);
  for (let i = 0; i < n; i++) {
    const t = i / RATE;
    const f = 520 + (1500 - 520) * (i / n);
    const sparkle = 0.08 * Math.sin(2 * Math.PI * 2600 * t);
    s[i] = (0.26 * Math.sin(2 * Math.PI * f * t) + sparkle) * decay(i, n, 2.5);
  }
  writeWav('comet.wav', s);
}

// prestige: rising triad
{
  const n = sec(0.7);
  const s = new Array(n);
  const freqs = [261.63, 329.63, 392.0, 523.25];
  for (let i = 0; i < n; i++) {
    const t = i / RATE;
    let v = 0;
    for (const f of freqs) v += Math.sin(2 * Math.PI * f * t);
    const attack = Math.min(1, i / sec(0.08));
    s[i] = 0.12 * v * attack * decay(i, n, 2.2);
  }
  writeWav('prestige.wav', s);
}

// achievement: bell ding
{
  const n = sec(0.42);
  const s = new Array(n);
  for (let i = 0; i < n; i++) {
    const t = i / RATE;
    const a = Math.sin(2 * Math.PI * 784 * t) * decay(i, n, 4);
    const b = 0.6 * Math.sin(2 * Math.PI * 1568 * t) * decay(i, n, 6);
    s[i] = 0.26 * (a + b);
  }
  writeWav('achievement.wav', s);
}
