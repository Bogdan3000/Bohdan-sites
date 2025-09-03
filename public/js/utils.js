export const fmtBytes = (bytes) => {
  const sizes = ['B','KB','MB','GB','TB'];
  if (!bytes && bytes !== 0) return '—';
  if (bytes === 0) return '0 B';
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  return (bytes / Math.pow(1024, i)).toFixed(2) + ' ' + sizes[i];
};
export const esc = (s='') => s.replace(/[&<>"']/g, m => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[m]));
export function show(el){ el?.classList?.remove('d-none'); }
export function hide(el){ el?.classList?.add('d-none'); }
export const viewIdFromPath = () => { const m = location.pathname.match(/^\/(?:f|file|view)\/([A-Za-z0-9_-]+)/); return m ? m[1] : null; };
