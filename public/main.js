
// Elements
const fileInput = document.getElementById('fileInput');
const dropArea = document.getElementById('dropArea');
const uploadBtn = document.getElementById('uploadBtn');
const statusEl = document.getElementById('status');
const progressRow = document.getElementById('progressRow');
const progressBar = document.getElementById('progressBar');
const uploadsList = document.getElementById('uploadsList');
const preUploadRow = document.getElementById('preUploadRow');
const pwdRow = document.getElementById('pwdRow');
const deletePassword = document.getElementById('deletePassword');
const togglePwd = document.getElementById('togglePwd');
const togglePwdVisibility = document.getElementById('togglePwdVisibility');

const filesGrid = document.getElementById('filesGrid');
const emptyState = document.getElementById('emptyState');
const fabUpload = document.getElementById('fabUpload');
const filesCount = document.getElementById('filesCount');

// Delete modal
const deleteModal = new bootstrap.Modal('#deleteModal');
const delFileName = document.getElementById('delFileName');
const delPassword = document.getElementById('delPassword');
const delError = document.getElementById('delError');
const confirmDeleteBtn = document.getElementById('confirmDeleteBtn');

// Toast
const appToastEl = document.getElementById('appToast');
const appToast = new bootstrap.Toast(appToastEl);
const toastBody = document.getElementById('toastBody');

let toDelete = null;

// Data cache
let files = [];
let polling;

// Helpers
const fmtBytes = (bytes) => {
  const sizes = ['B','KB','MB','GB','TB'];
  if (!bytes && bytes !== 0) return '—';
  if (bytes === 0) return '0 B';
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  return (bytes / Math.pow(1024, i)).toFixed(2) + ' ' + sizes[i];
};
const esc = (s='') => s.replace(/[&<>"']/g, m => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[m]));

// Show/hide
function show(el){ el.classList.remove('d-none'); }
function hide(el){ el.classList.add('d-none'); }

// Drag & drop
function openFileDialog(){ fileInput.click(); }
dropArea.addEventListener('click', openFileDialog);
dropArea.addEventListener('keydown', (e) => { if (e.key === 'Enter' || e.key === ' ') openFileDialog(); });

['dragenter','dragover'].forEach(evt => dropArea.addEventListener(evt, (e) => {
  e.preventDefault(); e.stopPropagation(); dropArea.classList.add('dragover');
}));
['dragleave','drop'].forEach(evt => dropArea.addEventListener(evt, (e) => {
  e.preventDefault(); e.stopPropagation(); dropArea.classList.remove('dragover');
}));
dropArea.addEventListener('drop', (e) => {
  const fl = e.dataTransfer.files;
  if (fl && fl.length) {
    fileInput.files = fl;
    onFilePicked();
  }
});
fileInput.addEventListener('change', onFilePicked);

function onFilePicked(){
  const n = fileInput.files.length;
  if (n) {
    show(preUploadRow);
    show(uploadBtn);
    statusEl.innerHTML = `<span class="text-secondary">Selected: <b>${n}</b> file${n>1?'s':''}</span>`;
  } else {
    statusEl.textContent = '';
    hide(preUploadRow);
    hide(pwdRow);
    hide(uploadBtn);
  }
}

// Toggle password section & visibility
togglePwd?.addEventListener('click', () => { pwdRow.classList.toggle('d-none'); });
togglePwdVisibility?.addEventListener('click', () => {
  const type = deletePassword.type === 'password' ? 'text' : 'password';
  deletePassword.type = type;
  togglePwdVisibility.innerHTML = type === 'password' ? '<i class="bi bi-eye"></i>' : '<i class="bi bi-eye-slash"></i>';
});

// Upload (multi)
async function doUpload(){
  const fl = fileInput.files;
  if (!fl || !fl.length) return;
  statusEl.textContent = '';
  show(progressRow);
  show(uploadsList);
  uploadsList.innerHTML = '';

  // Per-file UI rows
  const items = [];
  for (let i = 0; i < fl.length; i++) {
    const f = fl[i];
    const el = document.createElement('div');
    el.className = 'upload-item';
    el.innerHTML = `
      <div class="name">${esc(f.name)}</div>
      <div class="meta">${(f.size?fmtBytes(f.size):'')} ${f.type?(' • ' + esc(f.type)) : ''}</div>
      <div class="progress w-100"><div class="progress-bar progress-bar-striped progress-bar-animated" style="width:0%"></div></div>
      <div class="small text-secondary text-end"><span class="pct">0%</span></div>
    `;
    uploadsList.appendChild(el);
    items.push({ file: f, bar: el.querySelector('.progress-bar'), pct: el.querySelector('.pct') });
  }

  const pwd = deletePassword.value.trim();
  const promises = items.map(({file, bar, pct}) => {
    const fd = new FormData();
    fd.append('file', file);
    if (pwd) fd.append('deletePassword', pwd);
    return xhrUpload('/api/upload', fd, (loaded, total) => {
      const p = total ? Math.round(loaded/total*100) : 0;
      bar.style.width = p + '%'; pct.textContent = p + '%';
    });
  });

  try {
    await Promise.all(promises);
    statusEl.innerHTML = '<span class="text-success"><i class="bi bi-check-circle me-1"></i>All files uploaded</span>';
    fileInput.value = '';
    deletePassword.value = '';
    hide(pwdRow); hide(preUploadRow); hide(uploadBtn);
    setTimeout(() => { hide(progressRow); uploadsList.innerHTML=''; hide(uploadsList); }, 800);
    await loadFiles();
    toast('Upload complete');
  } catch (e) {
    statusEl.innerHTML = '<span class="text-danger"><i class="bi bi-x-circle me-1"></i>' + esc(e.message) + '</span>';
  }
}

function xhrUpload(url, formData, onProgress) {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open('POST', url);
    xhr.upload.onprogress = (e) => { if (e.lengthComputable) onProgress(e.loaded, e.total); };
    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        try { resolve(JSON.parse(xhr.responseText)); } catch { resolve({}); }
      } else {
        try { reject(new Error(JSON.parse(xhr.responseText).error || 'Upload error')); } catch { reject(new Error('Upload error')); }
      }
    };
    xhr.onerror = () => reject(new Error('Network error'));
    xhr.send(formData);
  });
}

// Buttons
uploadBtn.addEventListener('click', async () => {
  if (!fileInput.files.length) {
    const once = () => { fileInput.removeEventListener('change', once); if (fileInput.files.length) doUpload(); };
    fileInput.addEventListener('change', once);
    fileInput.click();
    return;
  }
  await doUpload();
});
fabUpload?.addEventListener('click', () => uploadBtn.click());

// Auto refresh (poll) every 20s
function startPolling(){
  if (polling) clearInterval(polling);
  polling = setInterval(loadFiles, 20000);
}
function stopPolling(){
  if (polling) clearInterval(polling);
}

// Load & render
let firstLoad = true;
async function loadFiles(){
  try {
    const res = await fetch('/api/files');
    const data = await res.json();
    files = data.files || [];
    filesCount.textContent = files.length;
    render();
  } catch (e) {
    // ignore
  }
}

function render(){
  filesGrid.innerHTML = '';

  if (!files.length) {
    show(emptyState);
    return;
  }
  hide(emptyState);

  const frag = document.createDocumentFragment();
  files.forEach((f, idx) => {
    const card = document.createElement('div');
    card.className = 'file-card fade-in';
    card.style.animationDelay = (idx * 40) + 'ms';

    const prev = document.createElement('div');
    prev.className = 'preview shimmer';
    prev.innerHTML = renderPreview(f);
    card.appendChild(prev);

    const body = document.createElement('div');
    body.className = 'body';
    body.innerHTML = `
      <div class="file-name" title="${esc(f.originalname)}">${esc(f.originalname)}</div>
      <div class="file-meta">
        <span>${fmtBytes(f.size)}</span>
        <span>•</span>
        <span>${new Date(f.uploadedAt).toLocaleString('en-GB')}</span>
        <span>•</span>
        <span><i class="bi bi-download me-1"></i>${f.downloads || 0}</span>
        ${f.requiresPassword
          ? '<span class="badge rounded-pill text-bg-secondary ms-1"><i class="bi bi-shield-lock me-1"></i>protected</span>'
          : '<span class="badge rounded-pill badge-lock ms-1"><i class="bi bi-unlock me-1"></i>open delete</span>'}
      </div>
    `;
    card.appendChild(body);

    const actions = document.createElement('div');
    actions.className = 'file-actions';
    actions.innerHTML = `
      <a class="btn btn-sm btn-outline-primary" href="${f.downloadUrl}" target="_blank" rel="noopener">
        <i class="bi bi-download me-1"></i>Download
      </a>
      <a class="btn btn-sm btn-outline-secondary" href="${f.url}" target="_blank" rel="noopener">
        <i class="bi bi-eye me-1"></i>Open
      </a>
      <button class="btn btn-sm btn-outline-success btn-copy">
        <i class="bi bi-link-45deg me-1"></i>Copy link
      </button>
      <button class="btn btn-sm btn-danger btn-delete">
        <i class="bi bi-trash3 me-1"></i>Delete
      </button>
    `;
    card.appendChild(actions);

    actions.querySelector('.btn-copy').addEventListener('click', async () => {
      try {
        await navigator.clipboard.writeText(new URL(f.url, location.origin).toString());
        toast('Link copied');
      } catch {
        toast('Failed to copy link');
      }
    });

    actions.querySelector('.btn-delete').addEventListener('click', async () => {
      toDelete = { id: f.id, name: f.originalname, requiresPassword: f.requiresPassword };
      delFileName.textContent = f.originalname;
      delPassword.value = '';
      delError.classList.add('d-none');

      if (!f.requiresPassword) {
        try {
          const resp = await fetch(`/api/files/${f.id}`, {
            method: 'DELETE',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({})
          });
          const js = await resp.json().catch(() => ({}));
          if (!resp.ok) throw new Error(js.error || 'Delete failed');
          await loadFiles();
          toast('File deleted');
        } catch (e) {
          toast(e.message || 'Delete failed');
        }
        return;
      }
      deleteModal.show();
    });

    frag.appendChild(card);
  });

  filesGrid.appendChild(frag);

  if (firstLoad) {
    firstLoad = false;
    setTimeout(() => { document.querySelectorAll('.shimmer').forEach(el => el.classList.remove('shimmer')); }, 500);
  }
}

function renderPreview(f){
  if (f.mimetype && f.mimetype.startsWith('image/')) {
    return `<img src="${f.url}" alt="${esc(f.originalname)}">`;
  } else if (f.mimetype && f.mimetype.startsWith('video/')) {
    return `<video src="${f.url}" preload="metadata" controls></video>`;
  } else if (f.mimetype && f.mimetype.startsWith('audio/')) {
    return `<div class="icon text-secondary"><i class="bi bi-music-note-beamed"></i></div>`;
  } else if (f.mimetype && f.mimetype.includes('pdf')) {
    return `<div class="icon text-secondary"><i class="bi bi-filetype-pdf"></i></div>`;
  } else if (f.mimetype && (f.mimetype.includes('zip') || f.mimetype.includes('x-7z'))) {
    return `<div class="icon text-secondary"><i class="bi bi-file-zip"></i></div>`;
  } else {
    return `<div class="icon text-secondary"><i class="bi bi-file-earmark-text"></i></div>`;
  }
}

confirmDeleteBtn.addEventListener('click', async () => {
  if (!toDelete) return;
  const pwd = delPassword.value.trim();
  if (toDelete.requiresPassword && !pwd) {
    delError.textContent = 'Enter password (or admin password).';
    delError.classList.remove('d-none');
    return;
  }
  try {
    const resp = await fetch(`/api/files/${toDelete.id}`, {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(pwd ? { password: pwd } : {})
    });
    const js = await resp.json().catch(() => ({}));
    if (!resp.ok) throw new Error(js.error || 'Delete failed');
    deleteModal.hide();
    toDelete = null;
    await loadFiles();
    toast('File deleted');
  } catch (e) {
    delError.textContent = e.message;
    delError.classList.remove('d-none');
  }
});

function toast(text){
  toastBody.textContent = text;
  appToastEl.classList.add('show-soft');
  appToast.show();
}

// Init
loadFiles();
startPolling();
