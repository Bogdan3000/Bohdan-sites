/* =========================
   MAIN.JS — CLEANED (MIN)
   Keeps: sidebar toggle, active nav, typed.js (if present), AOS init,
          scroll-top, preloader, simple form UX.
   Removes: isotope, glightbox, swiper, purecounter, portfolio filters.
   ========================= */

(function () {
    "use strict";

    const select = (el, all = false) => all ? [...document.querySelectorAll(el)] : document.querySelector(el);
    const on = (type, el, listener, all = false) => {
        let s = select(el, all);
        if (!s) return;
        if (all) s.forEach(e => e.addEventListener(type, listener));
        else s.addEventListener(type, listener);
    };
    const onscroll = (el, listener) => el.addEventListener('scroll', listener);

    /* Sidebar toggle (mobile) */
    const header = select('#header');
    const toggle = select('.header-toggle');
    if (toggle && header) {
        on('click', '.header-toggle', () => header.classList.toggle('show'));
        on('click', '#navmenu a', () => header.classList.remove('show'), true);
    }

    /* Active nav on scroll */
    const navLinks = select('#navmenu a', true);
    const sections = navLinks.map(a => {
        const id = a.getAttribute('href') || '';
        if (id.startsWith('#')) return select(id);
        return null;
    });

    const activateNav = () => {
        const pos = window.scrollY + 200;
        navLinks.forEach((a, i) => {
            const sec = sections[i];
            if (!sec) return;
            if (pos >= sec.offsetTop && pos <= (sec.offsetTop + sec.offsetHeight)) a.classList.add('active');
            else a.classList.remove('active');
        });
    };
    window.addEventListener('load', activateNav);
    onscroll(document, activateNav);

    /* Typed.js (hero) */
    const typedSpan = select('.typed');
    if (typedSpan && window.Typed) {
        const items = typedSpan.getAttribute('data-typed-items');
        const strings = items ? items.split(',').map(s => s.trim()) : [];
        new Typed('.typed', {
            strings,
            typeSpeed: 70,
            backSpeed: 40,
            backDelay: 1200,
            loop: true
        });
    }

    /* AOS init (scroll animations) */
    window.addEventListener('load', () => {
        if (window.AOS) AOS.init({ duration: 600, easing: 'ease-out', once: true, offset: 80 });
    });

    /* Scroll-top button */
    const scrollTop = select('.scroll-top');
    const toggleScrollTop = () => {
        if (!scrollTop) return;
        const show = window.scrollY > 400;
        scrollTop.style.display = show ? 'flex' : 'none';
    };
    window.addEventListener('load', toggleScrollTop);
    onscroll(document, toggleScrollTop);

    /* Smooth scroll for hash links (basic) */
    on('click', 'a[href^="#"]', function (e) {
        const id = this.getAttribute('href');
        const t = select(id);
        if (t) {
            e.preventDefault();
            window.scrollTo({ top: t.offsetTop - 10, behavior: 'smooth' });
        }
    }, true);

    /* Preloader */
    const preloader = select('#preloader');
    if (preloader) {
        window.addEventListener('load', () => {
            setTimeout(() => preloader.classList.add('hide'), 150);
            setTimeout(() => preloader.remove(), 450);
        });
    }

    /* Contact form UX (non-AJAX; shows loading/sent briefly) */
    const form = select('.php-email-form');
    if (form) {
        form.addEventListener('submit', function () {
            const loading = select('.php-email-form .loading');
            const sent = select('.php-email-form .sent-message');
            const err = select('.php-email-form .error-message');
            if (loading) loading.style.display = 'block';
            if (err) err.style.display = 'none';
            // Let server (contact.php) process; on navigation back, message will be gone anyway.
            setTimeout(() => {
                if (loading) loading.style.display = 'none';
                if (sent) sent.style.display = 'block';
                setTimeout(() => { if (sent) sent.style.display = 'none'; }, 2500);
            }, 800);
        });
    }

    document.addEventListener("DOMContentLoaded", function () {
        const form = document.getElementById("contact-form");
        const messages = document.getElementById("form-messages");

        form.addEventListener("submit", async function (e) {
            e.preventDefault();

            messages.textContent = "Sender...";
            messages.style.color = "#cbd5e1";

            try {
                const response = await fetch("https://formspree.io/f/xzzazlep", {
                    method: "POST",
                    body: new FormData(form),
                    headers: { Accept: "application/json" }
                });

                if (response.ok) {
                    messages.textContent = "Meldingen din er sendt. Takk!";
                    messages.style.color = "#86efac";
                    form.reset();
                } else {
                    messages.textContent = "Noe gikk galt. Prøv igjen senere.";
                    messages.style.color = "#fca5a5";
                }
            } catch (error) {
                messages.textContent = "Feil ved sending. Prøv igjen.";
                messages.style.color = "#fca5a5";
            }
        });
    });

})();
