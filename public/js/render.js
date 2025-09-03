import { els, ensureDeleteModal } from './dom.js';
import { fmtBytes, esc, show, hide } from './utils.js';
import { apiDeleteFile } from './api.js';
import { toast } from './toast.js';
let toDelete=null;
export function renderFiles(files){ els.filesGrid.innerHTML=''; if(!files.length){ show(els.emptyState); return; } hide(els.emptyState);
  const frag=document.createDocumentFragment();
  files.forEach((f,idx)=>{ const card=document.createElement('div'); card.className='file-card fade-in'; card.style.animationDelay=(idx*40)+'ms';
    const prev=document.createElement('div'); prev.className='preview shimmer'; prev.innerHTML=renderPreview(f); card.appendChild(prev);
    const body=document.createElement('div'); body.className='body'; body.innerHTML=`
      <div class="file-name" title="${esc(f.originalname)}">${esc(f.originalname)}</div>
      <div class="file-meta">
        <span>${fmtBytes(f.size)}</span>
        <span>•</span>
        <span>${new Date(f.uploadedAt).toLocaleString('en-GB')}</span>
        <span>•</span>
        <span><i class="bi bi-download me-1"></i>${f.downloads || 0}</span>
        ${f.requiresPassword?'<span class="badge rounded-pill text-bg-secondary ms-1"><i class="bi bi-shield-lock me-1"></i>protected</span>':'<span class="badge rounded-pill badge-lock ms-1"><i class="bi bi-unlock me-1"></i>open delete</span>'}
      </div>`; card.appendChild(body);
    const actions=document.createElement('div'); actions.className='file-actions'; actions.innerHTML=`
      <a class="btn btn-sm btn-outline-primary" href="${f.downloadUrl}" target="_blank" rel="noopener"><i class="bi bi-download me-1"></i>Download</a>
      <a class="btn btn-sm btn-outline-secondary" href="/f/${f.id}"><i class="bi bi-eye me-1"></i>Open</a>
      <button class="btn btn-sm btn-outline-success btn-copy"><i class="bi bi-link-45deg me-1"></i>Copy link</button>
      <button class="btn btn-sm btn-danger btn-delete"><i class="bi bi-trash3 me-1"></i>Delete</button>`; card.appendChild(actions);
    actions.querySelector('.btn-copy').addEventListener('click', async ()=>{ try{ const shareUrl=new URL(`/f/${f.id}`, location.origin).toString(); await navigator.clipboard.writeText(shareUrl); toast('Link copied'); }catch{ toast('Failed to copy link'); } });
    actions.querySelector('.btn-delete').addEventListener('click', async ()=>{ toDelete={ id:f.id, name:f.originalname, requiresPassword:f.requiresPassword}; els.delFileName.textContent=f.originalname; els.delPassword.value=''; els.delError.classList.add('d-none');
      if(!f.requiresPassword){ try{ await apiDeleteFile(f.id); toast('File deleted'); document.dispatchEvent(new CustomEvent('files:refresh')); }catch(e){ toast(e.message || 'Delete failed'); } return; }
      ensureDeleteModal()?.show();
    });
    frag.appendChild(card);
  });
  els.filesGrid.appendChild(frag);
  setTimeout(()=>{ document.querySelectorAll('.shimmer').forEach(el=>el.classList.remove('shimmer')); },500);
}
export function renderPreview(f){ if(f.mimetype && f.mimetype.startsWith('image/')) return `<img src="${f.url}" alt="${esc(f.originalname)}">`;
  if(f.mimetype && f.mimetype.startsWith('video/')) return `<video src="${f.url}" preload="metadata" controls></video>`;
  if(f.mimetype && f.mimetype.startsWith('audio/')) return `<div class="icon text-secondary"><i class="bi bi-music-note-beamed"></i></div>`;
  if(f.mimetype && f.mimetype.includes('pdf')) return `<div class="icon text-secondary"><i class="bi bi-filetype-pdf"></i></div>`;
  if(f.mimetype && (f.mimetype.includes('zip') || f.mimetype.includes('x-7z'))) return `<div class="icon text-secondary"><i class="bi bi-file-zip"></i></div>`;
  return `<div class="icon text-secondary"><i class="bi bi-file-earmark-text"></i></div>`;
}
export function renderPreviewFull(f){ if(f.mimetype?.startsWith('image/')) return `<img src="${f.url}" alt="${esc(f.originalname)}">`;
  if(f.mimetype?.startsWith('video/')) return `<video src="${f.url}" preload="metadata" controls></video>`;
  if(f.mimetype?.startsWith('audio/')) return `<audio src="${f.url}" controls></audio>`;
  if(f.mimetype?.includes('pdf')) return `<iframe class="pdf-frame" src="${f.url}#view=FitH"></iframe>`;
  return `<div class="icon text-secondary"><i class="bi bi-file-earmark-text"></i></div>`;
}
export function renderViewer(file){
  hide(els.emptyState); els.filesGrid.innerHTML='';
  const card=document.createElement('div'); card.className='file-card fade-in viewer';
  const prev=document.createElement('div'); prev.className='preview'; prev.innerHTML=renderPreviewFull(file); card.appendChild(prev);
  const body=document.createElement('div'); body.className='body'; body.innerHTML=`
    <div class="file-name" title="\${file.originalname}">\${file.originalname}</div>
    <div class="file-meta">
      <span>\${fmtBytes(file.size)}</span>
      <span>•</span>
      <span>\${new Date(file.uploadedAt).toLocaleString('en-GB')}</span>
      <span>•</span>
      <span><i class="bi bi-download me-1"></i>\${file.downloads || 0}</span>
      \${file.requiresPassword?'<span class="badge rounded-pill text-bg-secondary ms-1"><i class="bi bi-shield-lock me-1"></i>protected</span>':'<span class="badge rounded-pill badge-lock ms-1"><i class="bi bi-unlock me-1"></i>open delete</span>'}
    </div>`; card.appendChild(body);
  const actions=document.createElement('div'); actions.className='file-actions';
  const viewerUrl=new URL(location.href).toString();
  const prettyDirectUrl=new URL(`/u/\${file.id}/\${encodeURIComponent(file.originalname)}`, location.origin).toString();
  actions.innerHTML=`
    <a class="btn btn-sm btn-outline-primary" href="\${file.downloadUrl}"><i class="bi bi-download me-1"></i>Download</a>
    <button class="btn btn-sm btn-outline-secondary" id="btnCopyDirect"><i class="bi bi-link-45deg me-1"></i>Copy direct link</button>
    <button class="btn btn-sm btn-outline-success" id="btnCopyViewer"><i class="bi bi-link-45deg me-1"></i>Copy page link</button>
    <a class="btn btn-sm btn-outline-light" href="/" id="btnBack"><i class="bi bi-arrow-left me-1"></i>All files</a>`; card.appendChild(actions);
  els.filesGrid.appendChild(card);
  document.getElementById('btnCopyViewer')?.addEventListener('click', async ()=>{ try{ await navigator.clipboard.writeText(viewerUrl); toast('Link copied'); }catch{ toast('Failed to copy link'); } });
  document.getElementById('btnCopyDirect')?.addEventListener('click', async ()=>{ try{ await navigator.clipboard.writeText(prettyDirectUrl); toast('Link copied'); }catch{ toast('Failed to copy link'); } });
}
