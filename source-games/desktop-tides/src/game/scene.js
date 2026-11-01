const TAU = Math.PI * 2;
const clamp = (x, a, b) => Math.max(a, Math.min(b, x));

export function createSceneRenderer(canvas, assets) {
  const ctx = canvas.getContext('2d', { alpha: true });
  let lastW = 0, lastH = 0;
  const motes = Array.from({ length: 95 }, (_, i) => ({
    x: ((i * 197.61 + 431) % 1510) + 45,
    y: ((i * 113.71 + 310) % 830) + 35,
    phase: i * 2.399,
    size: 0.5 + (i % 4) * 0.23,
  }));
  const variants = [0, 20, -22, 105].map(deg => {
    const image = assets.fish;
    const c = document.createElement('canvas');
    c.width = image.width; c.height = image.height;
    const cx = c.getContext('2d');
    cx.filter = `hue-rotate(${deg}deg) saturate(.82)`;
    cx.drawImage(image, 0, 0);
    return c;
  });

  function drawAnimal(c, time, night, shadow = false) {
    const image = c.type === 'fish' ? variants[(c.variant ?? c.id ?? 0) % 4] : assets[c.type];
    if (!image) return;
    const spawn = clamp((c.spawnAge ?? 10) / 0.8, 0.05, 1);
    const width = c.size * (0.65 + 0.35 * spawn);
    const height = width * image.height / image.width;
    const phase = c.phase ?? time * 2 + c.id;
    ctx.save();
    ctx.translate(c.x + (shadow ? 8 : 0), c.y + (shadow ? 13 : 0));
    ctx.rotate(c.type === 'jelly' ? Math.sin(phase * 0.18) * 0.2 : c.angle);
    ctx.globalAlpha = spawn * (shadow ? (1 - night) * 0.12 : (c.type === 'jelly' ? .68 + night * .17 : .82 - night * .22) * (.88 + .12 * (c.depth ?? 1)));
    if (shadow) {
      ctx.filter = 'brightness(0) blur(3px)';
      ctx.drawImage(image, -width / 2, -height / 2, width, height);
    } else if (c.type === 'fish') {
      // Flexible tail; the raster sprite stays recognisable while each fish swims.
      const columns = 20;
      for (let i = 0; i < columns; i++) {
        const u = i / columns;
        const tail = Math.pow(1 - u, 2.7);
        const bend = Math.sin(phase * 2.1 + u * 4.5) * height * .105 * tail;
        ctx.drawImage(image, image.width * u, 0, image.width / columns, image.height,
          -width / 2 + width * u, -height / 2 + bend, width / columns + .3, height);
      }
    } else if (c.type === 'ray') {
      const rows = 22;
      for (let i = 0; i < rows; i++) {
        const v = i / rows;
        const wing = Math.pow(Math.abs(v - .5) * 2, 1.8);
        const wave = Math.sin(phase * .85 - wing * 1.7);
        const shift = wave * width * .025 * wing;
        ctx.drawImage(image, 0, image.height * v, image.width, image.height / rows,
          -width / 2 + shift, -height / 2 + height * v, width, height / rows + .25);
      }
    } else {
      const breath = 1 + Math.sin(phase * 1.2) * .055;
      ctx.scale(breath, 1 / Math.sqrt(breath));
      if (night > .1) {
        ctx.shadowColor = `rgba(77,244,239,${night * .6})`;
        ctx.shadowBlur = 12 * night;
      }
      ctx.drawImage(image, -width / 2, -height / 2, width, height);
    }
    ctx.restore();
  }

  return {
    render({ simulation: sim, time, night, width, height, view, pointer, placement, selection, reducedMotion }) {
      const dpr = Math.min(window.devicePixelRatio || 1, 1.75);
      if (lastW !== width * dpr || lastH !== height * dpr) {
        canvas.width = Math.round(width * dpr); canvas.height = Math.round(height * dpr);
        lastW = width * dpr; lastH = height * dpr;
      }
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.setTransform(view.scale * dpr, 0, 0, view.scale * dpr, view.offsetX * dpr, view.offsetY * dpr);

      for (const c of sim.creatures) drawAnimal(c, time, night, true);
      for (const c of sim.creatures) drawAnimal(c, time, night);

      ctx.save();
      ctx.globalCompositeOperation = 'screen';
      for (const m of motes) {
        const glow = .35 + .65 * Math.pow((Math.sin(time * .5 + m.phase) + 1) / 2, 2);
        ctx.fillStyle = `rgba(137,239,231,${glow * (.055 + night * .38)})`;
        ctx.beginPath();
        ctx.arc(m.x + Math.sin(time * .08 + m.phase) * 13, m.y + Math.cos(time * .1 + m.phase) * 9, m.size * (1 + night * .5), 0, TAU);
        ctx.fill();
      }
      // Thin flow filaments make the direction of a gesture visible.
      for (const flow of sim.currents) {
        const life = Math.max(0, 1 - flow.age / flow.maxAge);
        const len = Math.hypot(flow.dx, flow.dy) || 1;
        const nx = flow.dx / len, ny = flow.dy / len;
        const alpha = life * life * (.09 + night * .2);
        ctx.lineCap = 'round';
        ctx.lineWidth = 1.4 + night;
        ctx.strokeStyle = `rgba(154,255,244,${alpha})`;
        for (let k = -1; k <= 1; k++) {
          const side = k * 7 + Math.sin(flow.age * 2 + k) * 3;
          const drift = flow.age * 18;
          ctx.beginPath();
          ctx.moveTo(flow.x - ny * side + nx * drift, flow.y + nx * side + ny * drift);
          ctx.quadraticCurveTo(flow.x + nx * (drift + 20) - ny * (side + 5), flow.y + ny * (drift + 20) + nx * (side + 5), flow.x + nx * (drift + 44) - ny * side, flow.y + ny * (drift + 44) + nx * side);
          ctx.stroke();
        }
      }
      for (const p of sim.particles) {
        const life = Math.max(0, 1 - p.age / p.maxAge);
        ctx.fillStyle = `rgba(132,255,243,${life * (.22 + night * .55)})`;
        const size = (p.size || 1) * (.65 + night * .35);
        ctx.beginPath(); ctx.arc(p.x, p.y, size, 0, TAU); ctx.fill();
      }
      ctx.restore();

      for (const r of sim.ripples) {
        const life = Math.max(0, 1 - r.age / r.maxAge);
        const radius = r.radius || 6 + r.age * 70;
        for (let ring = 0; ring < 3; ring++) {
          const rad = radius - ring * 13;
          if (rad < 3) continue;
          ctx.beginPath(); ctx.ellipse(r.x, r.y, rad, rad * .84, 0, 0, TAU);
          ctx.lineWidth = 1.3 + ring * .4;
          ctx.strokeStyle = `rgba(5,79,105,${life * .15 * (1 - night)})`; ctx.stroke();
          ctx.beginPath(); ctx.ellipse(r.x, r.y - 1.8, rad, rad * .84, 0, 0, TAU);
          ctx.lineWidth = .8;
          ctx.strokeStyle = `rgba(191,255,246,${life * (.35 + night * .23) * (1 - ring * .19)})`; ctx.stroke();
        }
      }

      if (selection) {
        const color = selection.valid ? '234,250,240' : '255,174,151';
        ctx.save();
        ctx.fillStyle = `rgba(${color},.05)`;
        ctx.fillRect(selection.x, selection.y, selection.width, selection.height);
        ctx.strokeStyle = `rgba(${color},.9)`; ctx.lineWidth = 1 / view.scale;
        ctx.setLineDash([4 / view.scale, 2 / view.scale]);
        ctx.strokeRect(selection.x, selection.y, selection.width, selection.height);
        ctx.restore();
      }
      if (placement && placement !== 'random' && selection?.valid) {
        const image = assets[placement];
        const w = placement === 'ray' ? 145 : placement === 'jelly' ? 65 : 55;
        ctx.save();
        ctx.globalAlpha = .55;
        if (image) ctx.drawImage(image, selection.centerX - w / 2, selection.centerY - w * image.height / image.width / 2, w, w * image.height / image.width);
        ctx.restore();
      }
    },
    dispose() { ctx.clearRect(0, 0, canvas.width, canvas.height); },
  };
}
