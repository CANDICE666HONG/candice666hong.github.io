import { WORLD_WIDTH, WORLD_HEIGHT, shorelineX } from './simulation.js';

export const SUPPORTED_CREATURE_TYPES = Object.freeze(['fish', 'jelly', 'ray']);

/** Draw only when a valid placement is committed; each creature has equal odds. */
export function randomCreatureType(random = Math.random) {
  return SUPPORTED_CREATURE_TYPES[Math.floor(random() * SUPPORTED_CREATURE_TYPES.length)];
}

const allFinite = (...values) => values.every(Number.isFinite);
const invalidSelection = () => ({ x: 0, y: 0, width: 0, height: 0, centerX: 0, centerY: 0, valid: false });

/** Normalize a drag without clamping it into a different destination. */
export function makeSelection(start, end, { worldWidth = WORLD_WIDTH, worldHeight = WORLD_HEIGHT } = {}) {
  if (!start || !end || !allFinite(start.x, start.y, end.x, end.y, worldWidth, worldHeight) || worldWidth <= 0 || worldHeight <= 0) {
    return invalidSelection();
  }
  const x = Math.min(start.x, end.x);
  const y = Math.min(start.y, end.y);
  const width = Math.abs(end.x - start.x);
  const height = Math.abs(end.y - start.y);
  const centerX = x + width / 2;
  const centerY = y + height / 2;
  if (!allFinite(x, y, width, height, centerX, centerY)) return invalidSelection();
  const corners = [[x, y], [x + width, y], [x, y + height], [x + width, y + height]];
  const valid = start.inside !== false && end.inside !== false && corners.every(([cx, cy]) =>
    cx >= 0 && cx <= worldWidth && cy >= 0 && cy <= worldHeight && cx >= shorelineX(cy),
  );
  return { x, y, width, height, centerX, centerY, valid };
}

/** Pointer position -> world position, accounting for the centered card and camera. */
export function screenToWorld(point, rect, view) {
  if (!point || !rect || !view) return { x: 0, y: 0, inside: false };
  const { clientX, clientY } = point;
  const { left, top, width, height } = rect;
  const { scale, offsetX = 0, offsetY = 0 } = view;
  if (!allFinite(clientX, clientY, left, top, width, height, scale, offsetX, offsetY) || width <= 0 || height <= 0 || scale <= 0) {
    return { x: 0, y: 0, inside: false };
  }
  const x = (clientX - left - offsetX) / scale;
  const y = (clientY - top - offsetY) / scale;
  if (!allFinite(x, y)) return { x: 0, y: 0, inside: false };
  return {
    x, y,
    inside: clientX >= left && clientX <= left + width && clientY >= top && clientY <= top + height,
  };
}
