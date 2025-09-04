// public/js/render.js
import { els, ensureDeleteModal } from './dom.js';
import { fmtBytes, esc, show, hide } from './utils.js';
import { apiDeleteFile } from './api.js';
import { toast } from './toast.js';

// текущее состояние для удаления через модалку
let toDelete = null;

// навешиваем обработчик подтверждения удаления (однократно)
(function bindDeleteModal() {
    if (!els.confirmDeleteBtn) return;
    els.confirmDeleteBtn.addEventListener('click', async () => {
        if (!toDelete) return;
        els.delError.classList.add('d-none');
        try {
            const pwd = els.delPassword?.value?.trim() || undefined;
            await apiDeleteFile(toDelete.id, pwd);
            ensureDeleteModal()?.hide();
            toast('File deleted');
            document.dispatchEvent(new CustomEvent('files:refresh'));
        } catch (e) {
            els.delError.textContent = e?.message || 'Delete failed';
            els.delError.classList.remove('d-none');
        }
    });
})();

/* ===================== Список файлов ===================== */

export function renderFiles(files) {
    els.filesGrid.innerHTML = '';
    if (!files || !files.length) { show(els.emptyState); return; }
    hide(els.emptyState);

    const frag = document.createDocumentFragment();

    files.forEach((f, idx) => {
        const card = document.createElement('div');
        card.className = 'file-card fade-in';
        card.style.animationDelay = (idx * 40) + 'ms';

        // превью
        const prev = document.createElement('div');
        prev.className = 'preview shimmer';
        prev.innerHTML = renderPreview(f);
        card.appendChild(prev);

        // тело
        const body = document.createElement('div');
        body.className = 'body';
        body.innerHTML = `
      <a class="file-name d-block text-truncate" href="/f/${f.id}" title="${esc(f.originalname)}">${esc(f.originalname)}</a>
      <div class="file-meta">
        <span>${fmtBytes(f.size)}</span>
        <span>•</span>
        <span>${new Date(f.uploadedAt).toLocaleString('en-GB')}</span>
        <span>•</span>
        <span><i class="bi bi-download me-1"></i>${f.downloads || 0}</span>
        ${f.requiresPassword
            ? '<span class="badge rounded-pill text-bg-secondary ms-1"><i class="bi bi-shield-lock me-1"></i>protected</span>'
            : '<span class="badge rounded-pill badge-lock ms-1"><i class="bi bi-unlock me-1"></i>open delete</span>'}
      </div>`;
        card.appendChild(body);

        // действия
        const actions = document.createElement('div');
        actions.className = 'file-actions d-flex gap-2 flex-wrap';

        const downloadHref = f.downloadUrl || `/d/${f.id}`;
        const pageUrl = `/f/${f.id}`;
        const directUrl = `/u/${f.id}/${encodeURIComponent(f.originalname)}`;

        actions.innerHTML = `
      <a class="btn btn-sm btn-primary" href="${downloadHref}" download>
        <i class="bi bi-download me-1"></i>Download
      </a>
      <a class="btn btn-sm btn-outline-secondary" href="${pageUrl}">
        <i class="bi bi-eye me-1"></i>Open
      </a>
      <button class="btn btn-sm btn-outline-success" data-act="copy-direct">
        <i class="bi bi-link-45deg me-1"></i>Copy link
      </button>
      <button class="btn btn-sm btn-danger" data-act="delete">
        <i class="bi bi-trash me-1"></i>Delete
      </button>
    `;
        card.appendChild(actions);

        // обработчики
        const copy = async (text) => {
            try { await navigator.clipboard.writeText(text); toast('Link copied'); }
            catch { toast('Failed to copy link'); }
        };

        actions.querySelector('[data-act="copy-direct"]')
            ?.addEventListener('click', () => copy(new URL(directUrl, location.origin).toString()));

        actions.querySelector('[data-act="delete"]')
            ?.addEventListener('click', async () => {
                toDelete = f;
                if (els.delFileName) els.delFileName.textContent = f.originalname;
                if (els.delPassword) els.delPassword.value = '';
                els.delError?.classList?.add('d-none');

                if (!f.requiresPassword) {
                    try {
                        await apiDeleteFile(f.id);
                        toast('File deleted');
                        document.dispatchEvent(new CustomEvent('files:refresh'));
                    } catch (e) {
                        toast(e?.message || 'Delete failed');
                    }
                    return;
                }
                ensureDeleteModal()?.show();
            });

        frag.appendChild(card);
    });

    els.filesGrid.appendChild(frag);
}

/* ===================== Превью ===================== */

export function renderPreview(f) {
    if (f.mimetype && f.mimetype.startsWith('image/')) {
        return `<img src="${f.url}" alt="${esc(f.originalname)}">`;
    }
    if (f.mimetype && f.mimetype.startsWith('video/')) {
        return `<video src="${f.url}" preload="metadata" muted></video>`;
    }
    if (f.mimetype && f.mimetype.startsWith('audio/')) {
        return `<div class="icon text-secondary"><i class="bi bi-music-note-beamed"></i></div>`;
    }
    if (f.mimetype && f.mimetype.includes('pdf')) {
        return `<div class="icon text-secondary"><i class="bi bi-filetype-pdf"></i></div>`;
    }
    if (f.mimetype && (f.mimetype.includes('zip') || f.mimetype.includes('gzip') || f.mimetype.includes('rar'))) {
        return `<div class="icon text-secondary"><i class="bi bi-file-zip"></i></div>`;
    }
    return `<div class="icon text-secondary"><i class="bi bi-file-earmark-text"></i></div>`;
}

export function renderPreviewFull(file) {
    if (file.mimetype && file.mimetype.startsWith('image/')) {
        return `<img src="${file.url}" alt="${esc(file.originalname)}" class="full-media">`;
    }
    if (file.mimetype && file.mimetype.startsWith('video/')) {
        return `<video src="${file.url}" controls preload="metadata" class="full-media"></video>`;
    }
    if (file.mimetype && file.mimetype.startsWith('audio/')) {
        return `<audio src="${file.url}" controls preload="metadata" class="w-100"></audio>`;
    }
    if (file.mimetype && file.mimetype.includes('pdf')) {
        return `<iframe src="${file.url}" class="pdf-frame" title="${esc(file.originalname)}"></iframe>`;
    }
    return `<div class="icon big text-secondary"><i class="bi bi-file-earmark-text"></i></div>`;
}

/* ===================== Одиночный просмотр ===================== */

export function renderViewer(file) {
    hide(els.emptyState);
    els.filesGrid.innerHTML = '';

    const card = document.createElement('div');
    card.className = 'file-card fade-in viewer';

    const prev = document.createElement('div');
    prev.className = 'preview';
    prev.innerHTML = renderPreviewFull(file);
    card.appendChild(prev);

    const body = document.createElement('div');
    body.className = 'body';
    body.innerHTML = `
    <div class="file-name" title="${esc(file.originalname)}">${esc(file.originalname)}</div>
    <div class="file-meta">
      <span>${fmtBytes(file.size)}</span>
      <span>•</span>
      <span>${new Date(file.uploadedAt).toLocaleString('en-GB')}</span>
      <span>•</span>
      <span><i class="bi bi-download me-1"></i>${file.downloads || 0}</span>
      ${file.requiresPassword
        ? '<span class="badge rounded-pill text-bg-secondary ms-1"><i class="bi bi-shield-lock me-1"></i>protected</span>'
        : '<span class="badge rounded-pill badge-lock ms-1"><i class="bi bi-unlock me-1"></i>open delete</span>'}
    </div>
  `;
    card.appendChild(body);

    const actions = document.createElement('div');
    actions.className = 'file-actions d-flex gap-2 flex-wrap justify-content-center';

    const viewerUrl = new URL(location.href).toString();
    const downloadHref = file.downloadUrl || `/d/${file.id}`;
    const prettyDirectUrl = new URL(`/u/${file.id}/${encodeURIComponent(file.originalname)}`, location.origin).toString();

    actions.innerHTML = `
    <a class="btn btn-primary" href="${downloadHref}" download><i class="bi bi-download me-1"></i>Download</a>
    <button class="btn btn-outline-secondary" id="btnCopyDirect"><i class="bi bi-link-45deg me-1"></i>Copy direct link</button>
    <button class="btn btn-outline-success" id="btnCopyViewer"><i class="bi bi-link-45deg me-1"></i>Copy page link</button>
    <a class="btn btn-outline-light" href="/"><i class="bi bi-collection me-1"></i>All files</a>
  `;
    card.appendChild(actions);

    els.filesGrid.appendChild(card);

    document.getElementById('btnCopyViewer')?.addEventListener('click', async () => {
        try { await navigator.clipboard.writeText(viewerUrl); toast('Link copied'); }
        catch { toast('Failed to copy link'); }
    });
    document.getElementById('btnCopyDirect')?.addEventListener('click', async () => {
        try { await navigator.clipboard.writeText(prettyDirectUrl); toast('Link copied'); }
        catch { toast('Failed to copy link'); }
    });
}
