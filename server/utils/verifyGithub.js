import crypto from 'crypto';

export function verifyGithubSignature(secret, rawBody, sigHeader) {
  if (!secret || !sigHeader?.startsWith('sha256=')) return false;
  try {
    const theirSig = Buffer.from(sigHeader.slice('sha256='.length), 'hex');
    const hmac = crypto.createHmac('sha256', secret);
    hmac.update(rawBody || Buffer.alloc(0));
    const digest = Buffer.from(hmac.digest('hex'), 'hex');
    return theirSig.length === digest.length && crypto.timingSafeEqual(theirSig, digest);
  } catch {
    return false;
  }
}
