import crypto from 'crypto';
export function verifyGithubSignature(secret, rawBody, sigHeader){
  try {
    if (!secret) return false;
    if (!sigHeader || !sigHeader.startsWith('sha256=')) return false;
    const theirSig = Buffer.from(sigHeader.slice('sha256='.length), 'hex');
    const hmac = crypto.createHmac('sha256', secret);
    hmac.update(rawBody || Buffer.alloc(0));
    const digest = Buffer.from(hmac.digest('hex'), 'hex');
    if (theirSig.length !== digest.length) return false;
    return crypto.timingSafeEqual(theirSig, digest);
  } catch { return false; }
}