export const cspDirectives = {
  defaultSrc: ["'self'"],
  scriptSrc: ["'self'", "https://cdn.jsdelivr.net", "https://challenges.cloudflare.com"],
  styleSrc: ["'self'", "https://cdn.jsdelivr.net", "https://bohdan.lol", "'unsafe-inline'"],
  fontSrc: ["'self'", "https://cdn.jsdelivr.net", "https://bohdan.lol", "data:"],
  imgSrc: ["'self'", "data:", "blob:"],
  connectSrc: ["'self'", "https://challenges.cloudflare.com"],
  mediaSrc: ["'self'", "blob:"],
  frameSrc: ["'self'", "https://docs.google.com", "https://challenges.cloudflare.com"],
  objectSrc: ["'none'"],
  baseUri: ["'self'"],
  frameAncestors: ["'self'"]
};