// A small deterministic world: no DOM, engine dependencies, or per-frame I/O.
export const WORLD_WIDTH = 1600;
export const WORLD_HEIGHT = 900;
export const LIMITS = Object.freeze({ creatures: 96, ripples: 24, currents: 64, particles: 280 });
const TAU = Math.PI * 2;
const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));
const finite = (...numbers) => numbers.every(Number.isFinite);
const profiles = {
  fish: { size: [45, 65], speed: [19, 31], turn: 1.5, pulse: 4.6 },
  jelly: { size: [55, 78], speed: [3.5, 7], turn: 0.5, pulse: 1.5 },
  ray: { size: [130, 170], speed: [13, 21], turn: 0.65, pulse: 1.6 },
};

export function shorelineX(y) {
  // Matches the supplied background's upper-left sandy corner.
  return Math.max(0, 432 * (1 - y / 387));
}

function randomSource(seed) {
  let state = typeof seed === 'number' ? seed >>> 0 : [...String(seed)].reduce((n, c) => (n * 31 + c.charCodeAt(0)) >>> 0, 0);
  return () => {
    state += 0x6D2B79F5;
    let n = state;
    n = Math.imul(n ^ n >>> 15, n | 1);
    n ^= n + Math.imul(n ^ n >>> 7, n | 61);
    return ((n ^ n >>> 14) >>> 0) / 4294967296;
  };
}

function shortestAngle(from, to) {
  return Math.atan2(Math.sin(to - from), Math.cos(to - from));
}

function capPush(array, item, limit) {
  if (array.length >= limit) array.splice(0, array.length - limit + 1);
  array.push(item);
  return item;
}

function retainAlive(array) {
  let write = 0;
  for (const item of array) if (item.age < item.maxAge) array[write++] = item;
  array.length = write;
}

export function createSimulation({ seed = 27062026 } = {}) {
  const random = randomSource(seed);
  const range = (lo, hi) => lo + random() * (hi - lo);
  let nextId = 0;
  let reducedMotion = false;
  const schools = Array.from({ length: 6 }, (_, i) => ({
    x: 460 + (i % 3) * 350 + range(-60, 60),
    y: 230 + Math.floor(i / 3) * 370 + range(-45, 45),
    phase: range(0, TAU),
  }));
  const sim = {
    creatures: [], ripples: [], currents: [], particles: [], time: 0,
    addRipple, addCurrent, addCreature, update,
    setReducedMotion(value) { reducedMotion = Boolean(value); },
    snapshot() {
      return {
        time: sim.time, reducedMotion,
        creatures: sim.creatures.map(c => ({ ...c })),
        ripples: sim.ripples.map(r => ({ ...r })),
        currents: sim.currents.map(c => ({ ...c })),
        particles: sim.particles.map(p => ({ ...p })),
      };
    },
  };

  function safePosition(x, y, size = 50, borderScale = 1) {
    const margin = (size * 0.27 + 20) * borderScale;
    y = clamp(y, margin, WORLD_HEIGHT - margin);
    return { x: clamp(x, shorelineX(y) + margin, WORLD_WIDTH - margin), y };
  }

  function addCreature(type, x, y, { exactPosition = false } = {}) {
    const profile = profiles[type];
    if (!profile || sim.creatures.length >= LIMITS.creatures) return null;
    const size = range(...profile.size);
    const school = sim.creatures.filter(c => c.type === 'fish').length % schools.length;
    const group = schools[school];
    const exact = exactPosition && finite(x, y) && x >= shorelineX(y) && x <= WORLD_WIDTH && y >= 0 && y <= WORLD_HEIGHT;
    const position = safePosition(
      Number.isFinite(x) ? x : type === 'fish' ? group.x + range(-130, 130) : range(360, 1480),
      Number.isFinite(y) ? y : type === 'fish' ? group.y + range(-100, 100) : range(140, 790), size, exact ? 0 : 1,
    );
    const angle = type === 'fish' ? group.phase + range(-0.4, 0.4) : range(0, TAU);
    const speed = range(...profile.speed);
    const creature = {
      id: ++nextId, type, ...position, angle, size,
      vx: Math.cos(angle) * speed, vy: Math.sin(angle) * speed,
      phase: range(0, TAU), variant: Math.floor(random() * 4),
      school, baseSpeed: speed, wanderSeed: range(0, TAU),
      depth: range(0.65, 1), spawnAge: 0, exactPlacement: exact,
    };
    sim.creatures.push(creature);
    return creature;
  }

  function addParticles(x, y, count, dx = 0, dy = 0, type = 'flow') {
    for (let i = 0; i < count; i++) {
      const angle = range(0, TAU);
      const spread = type === 'ripple' ? range(3, 13) : range(1, 8);
      capPush(sim.particles, {
        id: ++nextId, type, x: x + Math.cos(angle) * spread, y: y + Math.sin(angle) * spread,
        vx: dx * range(6, 17) + Math.cos(angle) * range(1, 6),
        vy: dy * range(6, 17) + Math.sin(angle) * range(1, 6),
        age: 0, maxAge: range(1.5, 3.6), size: range(0.8, 2.3), phase: range(0, TAU),
      }, LIMITS.particles);
    }
  }

  function addRipple(x, y) {
    if (!finite(x, y) || x < shorelineX(y) || x > WORLD_WIDTH || x < 0 || y < 0 || y > WORLD_HEIGHT) return null;
    const ripple = capPush(sim.ripples, {
      id: ++nextId, x, y, age: 0, maxAge: 2.8, radius: 3, strength: 1,
    }, LIMITS.ripples);
    addParticles(x, y, reducedMotion ? 4 : 12, 0, 0, 'ripple');
    return ripple;
  }

  function addCurrent(x, y, dx, dy, strength = 1) {
    if (!finite(x, y, dx, dy, strength) || x < shorelineX(y) || x > WORLD_WIDTH || x < 0 || y < 0 || y > WORLD_HEIGHT) return null;
    const length = Math.hypot(dx, dy);
    if (length < 0.001) return null;
    strength = clamp(strength, 0.15, 2);
    const current = capPush(sim.currents, {
      id: ++nextId, x, y, dx: dx / length, dy: dy / length,
      strength, radius: 145 + strength * 25, age: 0, maxAge: 3.8,
    }, LIMITS.currents);
    addParticles(x, y, reducedMotion ? 1 : 4, current.dx, current.dy);
    return current;
  }

  function update(dt) {
    if (!Number.isFinite(dt) || dt <= 0) return;
    let remaining = Math.min(dt, 0.1);
    while (remaining > 0.000001) {
      const step = Math.min(remaining, 1 / 60);
      stepWorld(step);
      remaining -= step;
    }
  }

  function stepWorld(dt) {
    sim.time += dt;
    const motion = reducedMotion ? 0.42 : 1;
    for (const ripple of sim.ripples) {
      ripple.age += dt;
      ripple.radius = 3 + ripple.age * (reducedMotion ? 66 : 100);
    }
    for (const current of sim.currents) current.age += dt;
    retainAlive(sim.ripples);
    retainAlive(sim.currents);

    // Sample the previous frame together, avoiding order-biased flocking.
    const velocities = [];
    for (const creature of sim.creatures) {
      const profile = profiles[creature.type];
      const phase = creature.wanderSeed;
      const group = schools[creature.school];
      // Every resident has an interior destination. A permanent preferred
      // heading eventually parks animals at an edge, even with boundary forces.
      // Slow moving destinations keep the whole bay inhabited after idle time.
      let targetX, targetY;
      if (creature.type === 'fish') {
        targetX = group.x + Math.sin(sim.time * 0.045 + group.phase) * 135 + Math.sin(sim.time * 0.077 + phase) * 45;
        targetY = group.y + Math.cos(sim.time * 0.035 + group.phase) * 85 + Math.cos(sim.time * 0.061 + phase) * 32;
      } else if (creature.type === 'ray') {
        targetX = 880 + Math.sin(sim.time * 0.025 + phase) * 440;
        targetY = 470 + Math.cos(sim.time * 0.019 + phase * 0.8) * 240;
      } else {
        targetX = 820 + Math.sin(sim.time * 0.013 + phase) * 490;
        targetY = 480 + Math.cos(sim.time * 0.016 + phase * 0.83) * 270;
      }
      const targetDx = targetX - creature.x, targetDy = targetY - creature.y;
      const targetDistance = Math.max(0.01, Math.hypot(targetDx, targetDy));
      const towardsX = targetDx / targetDistance, towardsY = targetDy / targetDistance;
      // Nearby residents circle a loose interest area, while distant residents
      // turn predominantly homeward. No abrupt target changes are required.
      const orbitRadius = creature.type === 'fish' ? 58 : creature.type === 'ray' ? 86 : 45;
      const radial = clamp((targetDistance - orbitRadius) / 110, -0.65, 1);
      const tangent = 0.24 + 0.72 * (1 - clamp(targetDistance / 260, 0, 1));
      const direction = (creature.id % 2 ? 1 : -1);
      let guideX = towardsX * radial - towardsY * tangent * direction;
      let guideY = towardsY * radial + towardsX * tangent * direction;
      const guideLength = Math.max(0.01, Math.hypot(guideX, guideY));
      const wander = Math.sin(sim.time * 0.17 + phase) * 0.1;
      const cos = Math.cos(wander), sin = Math.sin(wander);
      const desiredSpeed = creature.baseSpeed * (0.76 + 0.24 * clamp(targetDistance / 170, 0, 1));
      let desiredX = (guideX * cos - guideY * sin) / guideLength * desiredSpeed;
      let desiredY = (guideX * sin + guideY * cos) / guideLength * desiredSpeed;

      let alignmentX = 0, alignmentY = 0, companions = 0;
      for (const other of sim.creatures) {
        if (other === creature) continue;
        const dx = creature.x - other.x, dy = creature.y - other.y;
        const distanceSquared = dx * dx + dy * dy;
        const separation = (creature.size + other.size) * 0.3 + 12;
        if (distanceSquared > 0.01 && distanceSquared < separation * separation) {
          const distance = Math.sqrt(distanceSquared);
          const force = (1 - distance / separation) * 38;
          desiredX += dx / distance * force;
          desiredY += dy / distance * force;
        }
        if (creature.type === 'fish' && other.type === 'fish' && other.school === creature.school && distanceSquared < 170 * 170) {
          alignmentX += other.vx; alignmentY += other.vy; companions++;
        }
      }
      if (companions) {
        desiredX = desiredX * 0.85 + alignmentX / companions * 0.15;
        desiredY = desiredY * 0.85 + alignmentY / companions * 0.15;
      }

      // Gentle anticipatory edge and shoreline steering.
      const margin = creature.size * 0.27 + 20;
      const left = shorelineX(creature.y) + margin;
      const soft = 115;
      desiredX += Math.max(0, (left + soft - creature.x) / soft) * 70;
      desiredX -= Math.max(0, (creature.x - (WORLD_WIDTH - margin - soft)) / soft) * 70;
      desiredY += Math.max(0, (margin + soft - creature.y) / soft) * 65;
      desiredY -= Math.max(0, (creature.y - (WORLD_HEIGHT - margin - soft)) / soft) * 65;
      if (creature.y < 440 && creature.x < shorelineX(creature.y) + margin + 110) desiredY += 12;

      let flowX = 0, flowY = 0;
      for (const current of sim.currents) {
        const distance = Math.hypot(creature.x - current.x, creature.y - current.y);
        if (distance >= current.radius) continue;
        const influence = (1 - distance / current.radius) ** 2 * (1 - current.age / current.maxAge) ** 1.2;
        const strength = influence * current.strength * 45;
        flowX += current.dx * strength;
        flowY += current.dy * strength;
      }
      const maxFlow = creature.type === 'jelly' ? 40 : 65;
      const flowLength = Math.hypot(flowX, flowY);
      if (flowLength > maxFlow) { flowX *= maxFlow / flowLength; flowY *= maxFlow / flowLength; }
      for (const ripple of sim.ripples) {
        const dx = creature.x - ripple.x, dy = creature.y - ripple.y;
        const distance = Math.hypot(dx, dy);
        if (distance < 0.1) continue;
        const ring = Math.exp(-(((distance - ripple.radius) / 28) ** 2)) * (1 - ripple.age / ripple.maxAge) * 12;
        flowX += dx / distance * ring;
        flowY += dy / distance * ring;
      }
      desiredX = (desiredX + flowX) * motion;
      desiredY = (desiredY + flowY) * motion;
      const accelerationBlend = 1 - Math.exp(-dt * (flowLength > 1 ? 1.6 : 0.65));
      let vx = creature.vx + (desiredX - creature.vx) * accelerationBlend;
      let vy = creature.vy + (desiredY - creature.vy) * accelerationBlend;
      const speed = Math.hypot(vx, vy);
      const maxSpeed = (creature.type === 'jelly' ? 42 : creature.type === 'ray' ? 60 : 80) * (reducedMotion ? 0.6 : 1);
      if (speed > maxSpeed) { vx *= maxSpeed / speed; vy *= maxSpeed / speed; }
      // Jellyfish drift freely. Fish and rays turn their motion as well as their sprite.
      if (creature.type !== 'jelly' && speed > 0.1) {
        const targetAngle = Math.atan2(vy, vx);
        const angle = creature.angle + clamp(shortestAngle(creature.angle, targetAngle), -profile.turn * dt, profile.turn * dt);
        const resultingSpeed = Math.hypot(vx, vy);
        vx = Math.cos(angle) * resultingSpeed;
        vy = Math.sin(angle) * resultingSpeed;
      }
      velocities.push([vx, vy]);
    }

    for (let i = 0; i < sim.creatures.length; i++) {
      const c = sim.creatures[i];
      const [vx, vy] = velocities[i];
      c.vx = vx; c.vy = vy;
      const x = c.x + vx * dt, y = c.y + vy * dt;
      const next = safePosition(x, y, c.size, c.exactPlacement ? Math.min(1, c.spawnAge / 1.2) : 1);
      c.x = next.x; c.y = next.y;
      // Hard safety only catches sustained input against the outside boundary.
      if (x !== next.x) c.vx = (x < next.x ? 1 : -1) * Math.abs(c.vx) * 0.4;
      if (y !== next.y) c.vy = (y < next.y ? 1 : -1) * Math.abs(c.vy) * 0.4;
      if (c.type !== 'jelly' && Math.hypot(c.vx, c.vy) > 0.1) c.angle = Math.atan2(c.vy, c.vx);
      else c.angle += Math.sin(sim.time * 0.3 + c.wanderSeed) * dt * 0.035 * motion;
      // Renderers use non-integer harmonics for tails, fins, and breathing.
      // Keep phase continuous; wrapping at 2π would snap those harmonics.
      c.phase += dt * profiles[c.type].pulse * (reducedMotion ? 0.55 : 1);
      c.spawnAge += dt;
    }

    for (const p of sim.particles) {
      p.age += dt;
      p.x += (p.vx + Math.sin(sim.time * 0.7 + p.phase) * 2) * dt * motion;
      p.y += (p.vy + Math.cos(sim.time * 0.6 + p.phase) * 2) * dt * motion;
      const damping = Math.exp(-dt * 0.25);
      p.vx *= damping; p.vy *= damping;
    }
    retainAlive(sim.particles);
  }

  for (let i = 0; i < 24; i++) addCreature('fish');
  for (let i = 0; i < 5; i++) addCreature('jelly');
  for (let i = 0; i < 3; i++) addCreature('ray');
  // Initial residents are already present; later additions may fade in.
  for (const creature of sim.creatures) creature.spawnAge = 10;
  return sim;
}
