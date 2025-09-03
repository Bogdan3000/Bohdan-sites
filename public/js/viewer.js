import { els } from './dom.js';
import { hide, show, viewIdFromPath } from './utils.js';
import { apiFetchFile, apiListFiles } from './api.js';
import { renderFiles, renderViewer } from './render.js';
let polling; let firstLoad=true;
async function loadFiles(){ try{ const files=await apiListFiles(); els.filesCount.textContent=files.length; renderFiles(files);}catch{} }
function startPolling(){ if(polling) clearInterval(polling); polling=setInterval(loadFiles,20000); }
export async function route(){
  const id=viewIdFromPath();
  if(id){
    document.body.classList.add('viewer-mode');
    els.leftCol?.classList.add('d-none'); els.filesHeader?.classList.add('d-none');
    els.filesCol?.classList.remove('col-lg-8'); els.filesCol?.classList.add('col-lg-12');
    els.filesGrid.classList.add('viewer-center'); if(polling) clearInterval(polling);
    try{ const file=await apiFetchFile(id); renderViewer(file); } catch { els.filesGrid.innerHTML = `<div class="text-center text-secondary py-5">File not found</div>`; }
  } else {
    document.body.classList.remove('viewer-mode');
    els.leftCol?.classList.remove('d-none'); els.filesHeader?.classList.remove('d-none');
    els.filesCol?.classList.remove('col-lg-12'); els.filesCol?.classList.add('col-lg-8');
    els.filesGrid.classList.remove('viewer-center');
    await loadFiles(); startPolling();
    if(firstLoad){ firstLoad=false; setTimeout(()=>{ document.querySelectorAll('.shimmer').forEach(el=>el.classList.remove('shimmer')); },500); }
  }
}
export function initViewer(){ window.addEventListener('popstate', route); document.addEventListener('files:refresh', loadFiles); return route(); }
