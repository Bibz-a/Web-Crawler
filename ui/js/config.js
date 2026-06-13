export function getApiBase() {
  const viteBase =
    typeof import.meta !== 'undefined' && import.meta.env?.VITE_API_BASE;
  if (viteBase) return String(viteBase).replace(/\/$/, '');
  return window.location.origin;
}
