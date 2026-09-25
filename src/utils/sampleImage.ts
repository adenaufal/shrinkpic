const WIDTH = 1600;
const HEIGHT = 1056;

/** Small deterministic PRNG, so every sample has the same grain. */
const lcg = (seed: number) => {
  let state = seed >>> 0;
  return () => {
    state = (Math.imul(state, 1664525) + 1013904223) >>> 0;
    return state / 0x100000000;
  };
};

/**
 * Paints a sunset landscape and returns it as a PNG `File`, so a first-time
 * visitor can try the app without a photo of their own. It is drawn locally
 * on a canvas — "try a sample" makes no network request either.
 *
 * A layer of film grain makes it behave like a real photo: lossless PNG
 * stores the noise at full cost, which is exactly what lossy formats remove.
 */
export async function createSampleImage(): Promise<File> {
  const canvas = document.createElement('canvas');
  canvas.width = WIDTH;
  canvas.height = HEIGHT;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('This browser cannot draw the sample image.');

  const sky = ctx.createLinearGradient(0, 0, 0, HEIGHT * 0.75);
  sky.addColorStop(0, '#1e3a8a');
  sky.addColorStop(0.45, '#7c3aed');
  sky.addColorStop(0.8, '#f472b6');
  sky.addColorStop(1, '#fdba74');
  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, WIDTH, HEIGHT);

  const sunX = WIDTH * 0.66;
  const sunY = HEIGHT * 0.52;
  const sun = ctx.createRadialGradient(sunX, sunY, 0, sunX, sunY, 300);
  sun.addColorStop(0, 'rgba(254, 249, 195, 1)');
  sun.addColorStop(0.2, 'rgba(253, 224, 71, 0.95)');
  sun.addColorStop(0.22, 'rgba(253, 186, 116, 0.55)');
  sun.addColorStop(1, 'rgba(253, 186, 116, 0)');
  ctx.fillStyle = sun;
  ctx.fillRect(0, 0, WIDTH, HEIGHT);

  const random = lcg(7);
  ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
  for (let i = 0; i < 140; i += 1) {
    ctx.beginPath();
    ctx.arc(random() * WIDTH, random() * HEIGHT * 0.35, random() * 2.2 + 0.4, 0, Math.PI * 2);
    ctx.fill();
  }

  const ridges = [
    { base: 0.63, amp: 76, color: '#6d28d9', phase: 1.3 },
    { base: 0.73, amp: 56, color: '#4c1d95', phase: 2.1 },
    { base: 0.85, amp: 38, color: '#1e1b4b', phase: 3.7 },
  ];
  ridges.forEach(({ base, amp, color, phase }) => {
    ctx.beginPath();
    ctx.moveTo(0, HEIGHT);
    for (let x = 0; x <= WIDTH; x += 8) {
      const wave =
        Math.sin(x * 0.0021 + phase) * 0.6 +
        Math.sin(x * 0.0057 + phase * 2) * 0.3 +
        Math.sin(x * 0.013 + phase) * 0.1;
      ctx.lineTo(x, HEIGHT * base - amp * wave);
    }
    ctx.lineTo(WIDTH, HEIGHT);
    ctx.closePath();
    ctx.fillStyle = color;
    ctx.fill();
  });

  const frame = ctx.getImageData(0, 0, WIDTH, HEIGHT);
  const data = frame.data;
  for (let i = 0; i < data.length; i += 4) {
    const grain = (random() - 0.5) * 22;
    data[i] += grain;
    data[i + 1] += grain;
    data[i + 2] += grain;
  }
  ctx.putImageData(frame, 0, 0);

  const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/png'));
  if (!blob) throw new Error('This browser could not encode the sample image.');

  return new File([blob], 'sample-sunset.png', { type: 'image/png', lastModified: Date.now() });
}
