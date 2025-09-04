import { els } from './dom.js';
import { show, hide } from './utils.js';

let turnstileToken = '';
let turnstileWidgetId = null;

/**
 * Рендерим виджет (однократно). Вызывай при выборе файлов.
 */
export function createCaptcha() {
    if (turnstileWidgetId || !window.turnstile) return;
    show(els.turnstileContainer);
    turnstileWidgetId = window.turnstile.render('#turnstile-container', {
        sitekey: '0x4AAAAAAByTHJ7wWbBRcuyf',
        theme: 'dark',
        callback: (t) => { turnstileToken = t; },
        'error-callback': () => { turnstileToken = ''; },
        'expired-callback': () => { turnstileToken = ''; },
    });
}

/**
 * Полное уничтожение виджета (после завершения загрузок/сброса формы).
 */
export function destroyCaptcha() {
    if (turnstileWidgetId && window.turnstile) {
        try { window.turnstile.remove(turnstileWidgetId); } catch {}
        turnstileWidgetId = null;
        turnstileToken = '';
    }
    hide(els.turnstileContainer);
    els.turnstileContainer.innerHTML = '';
}

/**
 * Старое поведение: просто проверяет, есть ли токен (если нет — кидает ошибку).
 * Оставляем для совместимости.
 */
export async function ensureCaptcha() {
    if (window.turnstile && turnstileWidgetId) {
        const t = window.turnstile.getResponse(turnstileWidgetId);
        if (t) turnstileToken = t;
        if (!turnstileToken) { try { window.turnstile.reset(turnstileWidgetId); } catch {} }
    }
    if (!turnstileToken) throw new Error('Please complete the captcha');
    return turnstileToken;
}

/**
 * НОВОЕ: дожидается токена, опционально форсит свежий (reset).
 * Используем перед каждой загрузкой файла.
 *
 * @param {boolean} fresh - если true, форсим новый токен (reset).
 * @returns {Promise<string>} – токен Turnstile.
 */
export async function getCaptchaToken(fresh = false) {
    if (!window.turnstile) throw new Error('Captcha not loaded yet');
    show(els.turnstileContainer);
    if (!turnstileWidgetId) createCaptcha();

    if (fresh && turnstileWidgetId) {
        // форсим новый токен
        try { window.turnstile.reset(turnstileWidgetId); } catch {}
        turnstileToken = '';
    }

    // мгновенно отдать, если уже выдан
    let t = window.turnstile.getResponse(turnstileWidgetId);
    if (t) { turnstileToken = t; return turnstileToken; }

    // Иначе ждём, пока пользователь пройдёт капчу (или автозачёт)
    return await new Promise((resolve, reject) => {
        const startedAt = Date.now();
        const timeoutMs = 120_000; // 2 минуты на решение
        const tick = () => {
            const now = Date.now();
            t = window.turnstile.getResponse(turnstileWidgetId);
            if (t) { turnstileToken = t; resolve(turnstileToken); return; }
            if (now - startedAt > timeoutMs) { reject(new Error('Captcha timeout')); return; }
            setTimeout(tick, 120);
        };
        tick();
    });
}
