// public/js/spotlightCard.js
// Навешивает эффект "spotlight" на элементы с [data-spotlight]

const DEFAULTS = {
    color: 'rgba(255, 255, 255, 0.25)',
    size: '80%',          // радиус градиента: % или px
    opacity: 0.6          // максимальная непрозрачность при hover
};

function applySpotlight(el) {
    if (el.classList.contains('spotlight-mounted')) return;
    el.classList.add('card-spotlight', 'spotlight-mounted');

    // прочитаем опции из data-атрибутов
    const color   = el.dataset.spotlightColor   || DEFAULTS.color;
    const size    = el.dataset.spotlightSize    || DEFAULTS.size;
    const opacity = (el.dataset.spotlightOpacity ?? DEFAULTS.opacity) + '';

    el.style.setProperty('--spotlight-color', color);
    el.style.setProperty('--spotlight-size', size);
    el.style.setProperty('--spotlight-opacity', opacity);

    // стартовые позиции по центру
    el.style.setProperty('--mouse-x', '50%');
    el.style.setProperty('--mouse-y', '50%');

    const onMove = (e) => {
        const r = el.getBoundingClientRect();
        const x = (e.clientX ?? (e.touches && e.touches[0]?.clientX)) - r.left;
        const y = (e.clientY ?? (e.touches && e.touches[0]?.clientY)) - r.top;
        el.style.setProperty('--mouse-x', `${Math.max(0, Math.min(x, r.width))}px`);
        el.style.setProperty('--mouse-y', `${Math.max(0, Math.min(y, r.height))}px`);
    };
    const onLeave = () => {
        // плавно вернуть в центр (необязательно)
        el.style.setProperty('--mouse-x', '50%');
        el.style.setProperty('--mouse-y', '50%');
    };

    el.addEventListener('mousemove', onMove);
    el.addEventListener('mouseleave', onLeave);
    el.addEventListener('touchstart', onMove, { passive: true });
    el.addEventListener('touchmove', onMove, { passive: true });
}

export function initSpotlight() {
    // первичная инициализация
    document.querySelectorAll('[data-spotlight]').forEach(applySpotlight);

    // инициализировать новые узлы (список/вьювер перерисовываются динамически)
    const mo = new MutationObserver((muts) => {
        for (const m of muts) {
            m.addedNodes?.forEach?.((n) => {
                if (n.nodeType !== 1) return;
                if (n.matches?.('[data-spotlight]')) applySpotlight(n);
                n.querySelectorAll?.('[data-spotlight]')?.forEach(applySpotlight);
            });
        }
    });
    mo.observe(document.body, { childList: true, subtree: true });
}
