/* ===========================================================
   Simple canvas confetti — olive themed
   Usage: fireConfetti({ count: 140, originY: 0.35 })
   =========================================================== */

function fireConfetti(opts = {}) {
  const COLORS = opts.colors || ['#C5F23F', '#7A9A1F', '#E2F19A', '#FFB84B', '#FF8C66', '#FFFFFF', '#0E0F0A'];
  const COUNT  = opts.count  || 140;
  const OY     = opts.originY ?? 0.4;
  const OX     = opts.originX ?? 0.5;

  const canvas = document.createElement('canvas');
  canvas.style.cssText = 'position:fixed;inset:0;pointer-events:none;z-index:9999;';
  document.body.appendChild(canvas);
  const ctx = canvas.getContext('2d');

  const resize = () => { canvas.width = innerWidth; canvas.height = innerHeight; };
  resize();
  window.addEventListener('resize', resize);

  const particles = [];
  for (let i = 0; i < COUNT; i++) {
    const angle = (Math.random() - 0.5) * Math.PI * 0.9 - Math.PI / 2;
    const speed = 6 + Math.random() * 10;
    particles.push({
      x: canvas.width * OX,
      y: canvas.height * OY,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      gravity: 0.32 + Math.random() * 0.12,
      size: 4 + Math.random() * 7,
      color: COLORS[Math.floor(Math.random() * COLORS.length)],
      rotation: Math.random() * Math.PI * 2,
      vr: (Math.random() - 0.5) * 0.35,
      life: 0,
      maxLife: 110 + Math.random() * 50,
      shape: Math.random() < 0.5 ? 'rect' : 'circle',
    });
  }

  let raf;
  function tick() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    let alive = 0;
    for (const p of particles) {
      if (p.life >= p.maxLife) continue;
      alive++;
      p.x += p.vx;
      p.y += p.vy;
      p.vy += p.gravity;
      p.vx *= 0.992;
      p.rotation += p.vr;
      p.life++;
      const alpha = Math.max(0, 1 - p.life / p.maxLife);
      ctx.save();
      ctx.translate(p.x, p.y);
      ctx.rotate(p.rotation);
      ctx.globalAlpha = alpha;
      ctx.fillStyle = p.color;
      if (p.shape === 'rect') {
        ctx.fillRect(-p.size / 2, -p.size / 3, p.size, p.size * 0.6);
      } else {
        ctx.beginPath();
        ctx.arc(0, 0, p.size / 2, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.restore();
    }
    if (alive > 0) {
      raf = requestAnimationFrame(tick);
    } else {
      cancelAnimationFrame(raf);
      canvas.remove();
    }
  }
  tick();
}
