import { els } from './dom.js';
import { show, hide } from './utils.js';
import { xhrUpload } from './api.js';
import { createCaptcha, destroyCaptcha, getCaptchaToken } from './captcha.js';
import { toast } from './toast.js';

let ACTIVE_UPLOADS = 0;
function syncBeforeUnload() {
    if (ACTIVE_UPLOADS > 0) {
        window.onbeforeunload = (e) => { e.preventDefault(); e.returnValue = ''; };
    } else {
        window.onbeforeunload = null;
    }
}
function openFileDialog() { els.fileInput.click(); }

function onFilePicked() {
    const n = els.fileInput.files.length;
    if (n) {
        show(els.preUploadRow); show(els.uploadBtn); createCaptcha();
        els.statusEl.innerHTML = `<span class="text-secondary">Selected: <b>${n}</b> file${n>1?'s':''}</span>`;
    } else {
        els.statusEl.textContent=''; hide(els.preUploadRow); hide(els.pwdRow); hide(els.uploadBtn); destroyCaptcha();
    }
}

export function bindUploadUI() {
    els.dropArea.addEventListener('click', openFileDialog);
    els.dropArea.addEventListener('keydown', (e) => { if (e.key === 'Enter' || e.key === ' ') openFileDialog(); });

    const isFileDrag = (e) => e && e.dataTransfer && Array.from(e.dataTransfer.types || []).includes('Files');
    ['dragenter','dragover'].forEach(evt => els.dropArea.addEventListener(evt,(e)=>{ e.preventDefault(); e.stopPropagation(); els.dropArea.classList.add('dragover'); }));
    ['dragleave','drop'].forEach(evt => els.dropArea.addEventListener(evt,(e)=>{ e.preventDefault(); e.stopPropagation(); els.dropArea.classList.remove('dragover'); }));
    els.dropArea.addEventListener('drop', (e) => { const fl = e.dataTransfer.files; if (fl && fl.length) { els.fileInput.files = fl; onFilePicked(); } });
    els.fileInput.addEventListener('change', onFilePicked);

    ['dragover','drop'].forEach(evt => { window.addEventListener(evt,(e)=>{ if(isFileDrag(e)) e.preventDefault(); }, { passive:false }); });

    els.togglePwd?.addEventListener('click', () => { els.pwdRow.classList.toggle('d-none'); });
    els.togglePwdVisibility?.addEventListener('click', () => {
        const type = els.deletePassword.type === 'password' ? 'text' : 'password';
        els.deletePassword.type = type;
        els.togglePwdVisibility.innerHTML = type === 'password' ? '<i class="bi bi-eye"></i>' : '<i class="bi bi-eye-slash"></i>';
    });

    els.uploadBtn.addEventListener('click', async () => {
        if (!els.fileInput.files.length) {
            const once = () => { els.fileInput.removeEventListener('change', once); if (els.fileInput.files.length) doUpload(); };
            els.fileInput.addEventListener('change', once); els.fileInput.click(); return;
        }
        await doUpload();
    });
    els.fabUpload?.addEventListener('click', () => els.uploadBtn.click());
}

async function doUpload() {
    const fl = els.fileInput.files;
    if (!fl || !fl.length) return;

    els.statusEl.textContent = '';
    show(els.progressRow); show(els.uploadsList); els.uploadsList.innerHTML = '';

    const items = [];
    for (let i = 0; i < fl.length; i++) {
        const f = fl[i];
        const el = document.createElement('div');
        el.className = 'upload-item';
        el.innerHTML = `
      <div class="name">${f.name.replace(/[&<>"']/g, m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[m]))}</div>
      <div class="meta">${(f.size?(Math.round(f.size/1024/1024*100)/100)+' MB':'')} ${f.type?(' • '+f.type):''}</div>
      <div class="progress w-100"><div class="progress-bar progress-bar-striped progress-bar-animated" style="width:0"></div></div>
      <div class="small text-secondary text-end"><span class="pct">0%</span></div>`;
        els.uploadsList.appendChild(el);
        items.push({ file: f, row: el, bar: el.querySelector('.progress-bar'), pct: el.querySelector('.pct') });
    }

    const VISIBLE_MAX = 8;
    if (items.length > VISIBLE_MAX) {
        for (let i = VISIBLE_MAX; i < els.uploadsList.children.length; i++) {
            const row = els.uploadsList.children[i];
            if (row.classList.contains('upload-item')) row.classList.add('is-hidden');
        }
        const btnMore = document.createElement('button');
        btnMore.type = 'button';
        btnMore.className = 'btn btn-outline-secondary btn-sm w-100 mt-1';
        btnMore.id = 'btnShowMore';
        btnMore.textContent = `Показать ещё ${items.length - VISIBLE_MAX}`;
        els.uploadsList.appendChild(btnMore);
        btnMore.addEventListener('click', () => { els.uploadsList.querySelectorAll('.upload-item.is-hidden').forEach(el => el.classList.remove('is-hidden')); btnMore.remove(); });
    }

    const pwd = els.deletePassword.value.trim();
    let okCount = 0, failCount = 0;

    // Загружаем ПО ОДНОМУ файлу, получая новый токен капчи для каждого.
    for (let i = 0; i < items.length; i++) {
        const { file, bar, pct, row } = items[i];
        try {
            els.statusEl.innerHTML = `<span class="text-secondary">Captcha for file ${i+1}/${items.length}…</span>`;
            // Для первого файла берём текущий токен, для остальных — форсим новый
            const token = await getCaptchaToken(i > 0);

            const fd = new FormData();
            fd.append('file', file);
            if (pwd) fd.append('deletePassword', pwd);
            fd.append('cf-turnstile-response', token);

            await new Promise((resolve, reject) => {
                ACTIVE_UPLOADS++; syncBeforeUnload();
                xhrUpload('/api/upload', fd, (loaded, total) => {
                    const p = total ? Math.round(loaded / total * 100) : 0;
                    bar.style.width = p + '%';
                    pct.textContent = p + '%';
                })
                    .then(resolve)
                    .catch(reject)
                    .finally(() => { ACTIVE_UPLOADS = Math.max(0, ACTIVE_UPLOADS - 1); syncBeforeUnload(); });
            });

            okCount++;
            pct.textContent = 'Done';
        } catch (e) {
            failCount++;
            bar.classList.remove('progress-bar-striped','progress-bar-animated');
            bar.classList.add('bg-danger');
            pct.textContent = 'Error';
            row.classList.add('shake');
            console.error(e);
        }
    }

    // Итог
    if (failCount === 0) {
        els.statusEl.innerHTML = '<span class="text-success"><i class="bi bi-check-circle me-1"></i>All files uploaded</span>';
        toast('Upload complete');
        els.fileInput.value = '';
        els.deletePassword.value = '';
        hide(els.pwdRow); hide(els.preUploadRow); hide(els.uploadBtn);
        destroyCaptcha();
        setTimeout(() => { hide(els.progressRow); els.uploadsList.innerHTML = ''; hide(els.uploadsList); }, 800);
        document.dispatchEvent(new CustomEvent('files:refresh'));
    } else {
        els.statusEl.innerHTML = `<span class="text-warning"><i class="bi bi-exclamation-triangle me-1"></i>Uploaded: ${okCount}, failed: ${failCount}</span>`;
        toast('Some files failed');
        // Капчу не уничтожаем, чтобы юзер мог дозалить неудачные.
    }
}
