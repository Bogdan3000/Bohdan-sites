export const cspDirectives = {
    defaultSrc: ["'self'"],

    // добавили unpkg и esm.sh (+ CDN-сабдомен)
    scriptSrc: [
        "'self'",
        "https://cdn.jsdelivr.net",
        "https://unpkg.com",
        "https://esm.sh",
        "https://cdn.esm.sh",
        "https://challenges.cloudflare.com",
    ],

    styleSrc: [
        "'self'",
        "https://cdn.jsdelivr.net",
        "https://bohdan.lol",
        "'unsafe-inline'",
    ],
    fontSrc: [
        "'self'",
        "https://cdn.jsdelivr.net",
        "https://bohdan.lol",
        "data:",
    ],
    imgSrc: ["'self'", "data:", "blob:"],

    // на будущее: некоторые CDN дергают подресурсы — добавил сюда тоже
    connectSrc: [
        "'self'",
        "https://challenges.cloudflare.com",
        "https://unpkg.com",
        "https://esm.sh",
        "https://cdn.esm.sh",
        "https://cdn.jsdelivr.net",
    ],

    mediaSrc: ["'self'", "blob:"],
    frameSrc: ["'self'", "https://docs.google.com", "https://challenges.cloudflare.com"],
    objectSrc: ["'none'"],
    baseUri: ["'self'"],
    frameAncestors: ["'self'"],
};
