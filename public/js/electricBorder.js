// public/js/electricBorder.js
// ElectricBorder (vanilla JS). Украшает любой блок с атрибутом data-eb.
// Опции через data-атрибуты: data-eb-color, data-eb-speed, data-eb-chaos, data-eb-thickness.

const INSTANCES = new WeakMap();
let COUNTER = 0;

const DEFAULTS = {
    color: '#7df9ff',
    speed: 1,
    chaos: 0.5,
    thickness: 2
};

function readOpts(el) {
    const o = { ...DEFAULTS };
    const ds = el.dataset;
    if (ds.ebColor) o.color = ds.ebColor;
    if (ds.ebSpeed && !Number.isNaN(parseFloat(ds.ebSpeed))) o.speed = parseFloat(ds.ebSpeed);
    if (ds.ebChaos && !Number.isNaN(parseFloat(ds.ebChaos))) o.chaos = parseFloat(ds.ebChaos);
    if (ds.ebThickness && !Number.isNaN(parseFloat(ds.ebThickness))) o.thickness = parseFloat(ds.ebThickness);
    return o;
}

function createSVG(filterId) {
    const svgNS = 'http://www.w3.org/2000/svg';
    const svg = document.createElementNS(svgNS, 'svg');
    svg.setAttribute('class', 'eb-svg');
    svg.setAttribute('aria-hidden', 'true');
    svg.setAttribute('focusable', 'false');

    const defs = document.createElementNS(svgNS, 'defs');
    const filter = document.createElementNS(svgNS, 'filter');
    filter.setAttribute('id', filterId);
    filter.setAttribute('colorInterpolationFilters', 'sRGB');
    filter.setAttribute('x', '-20%');
    filter.setAttribute('y', '-20%');
    filter.setAttribute('width', '140%');
    filter.setAttribute('height', '140%');

    const t1 = document.createElementNS(svgNS, 'feTurbulence');
    t1.setAttribute('type', 'turbulence');
    t1.setAttribute('baseFrequency', '0.02');
    t1.setAttribute('numOctaves', '10');
    t1.setAttribute('result', 'noise1');
    t1.setAttribute('seed', '1');

    const o1 = document.createElementNS(svgNS, 'feOffset');
    o1.setAttribute('in', 'noise1');
    o1.setAttribute('dx', '0'); o1.setAttribute('dy', '0');
    o1.setAttribute('result', 'offsetNoise1');
    const a1 = document.createElementNS(svgNS, 'animate');
    a1.setAttribute('attributeName', 'dy');
    a1.setAttribute('values', '700; 0'); // заменим после измерения
    a1.setAttribute('dur', '6s');
    a1.setAttribute('repeatCount', 'indefinite');
    a1.setAttribute('calcMode', 'linear');
    o1.appendChild(a1);

    const t2 = document.createElementNS(svgNS, 'feTurbulence');
    t2.setAttribute('type', 'turbulence');
    t2.setAttribute('baseFrequency', '0.02');
    t2.setAttribute('numOctaves', '10');
    t2.setAttribute('result', 'noise2');
    t2.setAttribute('seed', '1');

    const o2 = document.createElementNS(svgNS, 'feOffset');
    o2.setAttribute('in', 'noise2');
    o2.setAttribute('dx', '0'); o2.setAttribute('dy', '0');
    o2.setAttribute('result', 'offsetNoise2');
    const a2 = document.createElementNS(svgNS, 'animate');
    a2.setAttribute('attributeName', 'dy');
    a2.setAttribute('values', '0; -700'); // заменим после измерения
    a2.setAttribute('dur', '6s');
    a2.setAttribute('repeatCount', 'indefinite');
    a2.setAttribute('calcMode', 'linear');
    o2.appendChild(a2);

    const t3 = document.createElementNS(svgNS, 'feTurbulence');
    t3.setAttribute('type', 'turbulence');
    t3.setAttribute('baseFrequency', '0.02');
    t3.setAttribute('numOctaves', '10');
    t3.setAttribute('result', 'noise3');
    t3.setAttribute('seed', '2');

    const o3 = document.createElementNS(svgNS, 'feOffset');
    o3.setAttribute('in', 'noise3');
    o3.setAttribute('dx', '0'); o3.setAttribute('dy', '0');
    o3.setAttribute('result', 'offsetNoise3');
    const a3 = document.createElementNS(svgNS, 'animate');
    a3.setAttribute('attributeName', 'dx');
    a3.setAttribute('values', '490; 0'); // заменим после измерения
    a3.setAttribute('dur', '6s');
    a3.setAttribute('repeatCount', 'indefinite');
    a3.setAttribute('calcMode', 'linear');
    o3.appendChild(a3);

    const t4 = document.createElementNS(svgNS, 'feTurbulence');
    t4.setAttribute('type', 'turbulence');
    t4.setAttribute('baseFrequency', '0.02');
    t4.setAttribute('numOctaves', '10');
    t4.setAttribute('result', 'noise4');
    t4.setAttribute('seed', '2');

    const o4 = document.createElementNS(svgNS, 'feOffset');
    o4.setAttribute('in', 'noise4');
    o4.setAttribute('dx', '0'); o4.setAttribute('dy', '0');
    o4.setAttribute('result', 'offsetNoise4');
    const a4 = document.createElementNS(svgNS, 'animate');
    a4.setAttribute('attributeName', 'dx');
    a4.setAttribute('values', '0; -490'); // заменим после измерения
    a4.setAttribute('dur', '6s');
    a4.setAttribute('repeatCount', 'indefinite');
    a4.setAttribute('calcMode', 'linear');
    o4.appendChild(a4);

    const c1 = document.createElementNS(svgNS, 'feComposite');
    c1.setAttribute('in', 'offsetNoise1');
    c1.setAttribute('in2', 'offsetNoise2');
    c1.setAttribute('result', 'part1');

    const c2 = document.createElementNS(svgNS, 'feComposite');
    c2.setAttribute('in', 'offsetNoise3');
    c2.setAttribute('in2', 'offsetNoise4');
    c2.setAttribute('result', 'part2');

    const blend = document.createElementNS(svgNS, 'feBlend');
    blend.setAttribute('in', 'part1');
    blend.setAttribute('in2', 'part2');
    blend.setAttribute('mode', 'color-dodge');
    blend.setAttribute('result', 'combinedNoise');

    const disp = document.createElementNS(svgNS, 'feDisplacementMap');
    disp.setAttribute('in', 'SourceGraphic');
    disp.setAttribute('in2', 'combinedNoise');
    disp.setAttribute('scale', '30'); // меняем по chaos
    disp.setAttribute('xChannelSelector', 'R');
    disp.setAttribute('yChannelSelector', 'B');

    filter.append(t1, o1, t2, o2, t3, o3, t4, o4, c1, c2, blend, disp);
    defs.appendChild(filter);
    svg.appendChild(defs);

    return { svg, filter, anims: { a1, a2, a3, a4 }, disp };
}

function mount(el) {
    const id = `turbulent-displace-${++COUNTER}`;
    el.classList.add('electric-border');
    el.style.setProperty('--eb-radius', getComputedStyle(el).borderRadius || '16px');

    // слои
    const layers = document.createElement('div');
    layers.className = 'eb-layers';

    const stroke = document.createElement('div');
    stroke.className = 'eb-stroke';

    const glow1 = document.createElement('div');
    glow1.className = 'eb-glow-1';

    const glow2 = document.createElement('div');
    glow2.className = 'eb-glow-2';

    const backGlow = document.createElement('div');
    backGlow.className = 'eb-background-glow';

    layers.append(stroke, glow1, glow2, backGlow);

    // SVG фильтр
    const { svg, anims, disp } = createSVG(id);
    // применяем фильтр к stroke
    stroke.style.filter = `url(#${id})`;

    // вставляем в DOM
    el.appendChild(layers);
    el.appendChild(svg);

    // настройки из data-атрибутов
    const opts = readOpts(el);
    el.style.setProperty('--electric-border-color', opts.color);
    el.style.setProperty('--eb-border-width', `${opts.thickness}px`);

    const updateAnim = () => {
        const rect = el.getBoundingClientRect();
        const w = Math.max(1, Math.round(rect.width));
        const h = Math.max(1, Math.round(rect.height));

        // значения анимаций в px зависят от размеров блока
        anims.a1.setAttribute('values', `${h}; 0`);
        anims.a2.setAttribute('values', `0; -${h}`);
        anims.a3.setAttribute('values', `${w}; 0`);
        anims.a4.setAttribute('values', `0; -${w}`);

        const baseDur = 6;
        const dur = Math.max(0.001, baseDur / (opts.speed || 1));
        [anims.a1, anims.a2, anims.a3, anims.a4].forEach(a => a.setAttribute('dur', `${dur}s`));

        // интенсивность «электричества»
        disp.setAttribute('scale', String(30 * (opts.chaos || 1)));

        // перезапуск (не везде обязателен, но помогает)
        requestAnimationFrame(() => {
            [anims.a1, anims.a2, anims.a3, anims.a4].forEach(a => {
                try { a.beginElement && a.beginElement(); } catch {}
            });
        });
    };

    const ro = new ResizeObserver(updateAnim);
    ro.observe(el);
    updateAnim();

    INSTANCES.set(el, { ro, svg, layers });
}

function unmount(el) {
    const st = INSTANCES.get(el);
    if (!st) return;
    st.ro?.disconnect();
    st.layers?.remove();
    st.svg?.remove();
    INSTANCES.delete(el);
}

export function initElectricBorder() {
    const apply = (root=document) => {
        root.querySelectorAll('[data-eb]:not(.eb-mounted)').forEach(el => {
            mount(el);
            el.classList.add('eb-mounted');
        });
    };

    // первичный проход
    apply();

    // следим за добавлением новых карточек (рендер списка/вьювера)
    const mo = new MutationObserver(muts => {
        for (const m of muts) {
            m.addedNodes?.forEach?.(n => {
                if (n.nodeType !== 1) return;
                if (n.matches?.('[data-eb]')) apply(n.parentNode || document);
                // если прилетела целая карточка с детьми
                if (n.querySelectorAll) apply(n);
            });
        }
    });
    mo.observe(document.body, { childList: true, subtree: true });
}
