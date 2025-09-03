import { els } from './dom.js';
let appToast;
export function toast(text){ els.toastBody.textContent = text; els.appToastEl.classList.add('show-soft'); if (!appToast && window.bootstrap) appToast = new bootstrap.Toast(els.appToastEl); appToast?.show(); }
