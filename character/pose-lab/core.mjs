/** Image-space cut paths for a staged, non-final Aetheria puppet. */
export const PARTS = ['hair_back', 'head'];
export const W = 1024, H = 1536;
export function validPoint(p) {
  return Array.isArray(p) && p.length === 2 && p.every(Number.isFinite) && p[0] >= 0 && p[0] <= W && p[1] >= 0 && p[1] <= H;
}
export function validPart(part) {
  return part && validPoint(part.pivot) && Array.isArray(part.polygon) && part.polygon.length >= 3 && part.polygon.every(validPoint);
}
export function validateMasks(data) {
  const errors = [];
  if (data?.version !== 1 || !data.parts) errors.push('Formato maschere non valido');
  for (const name of PARTS) if (!validPart(data?.parts?.[name])) errors.push('Parte non valida: '+name);
  return errors;
}
export function updatePoint(data, name, i, point) {
  if (!PARTS.includes(name) || !validPoint(point) || !Number.isInteger(i) || i < 0 || i >= data.parts[name].polygon.length) return false;
  data.parts[name].polygon[i] = point.map(Math.round);
  return true;
}
export function getJointPose({head=0,hair=0}={}) {
  return {head:Math.max(-8,Math.min(8,head)),hair_back:Math.max(-14,Math.min(14,hair))};
}
export function deepCopy(data) {return JSON.parse(JSON.stringify(data));}
