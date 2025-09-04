import express from 'express';
import multer from 'multer';
import path from 'path';
import { nanoid } from 'nanoid';
import bcrypt from 'bcryptjs';
import fs from 'fs';
import dotenv from 'dotenv';
import { ensureDirs, loadManifest, saveManifest, UPLOAD_DIR } from '../utils/manifest.js';

dotenv.config();
ensureDirs();

const TURNSTILE_SECRET = process.env.TURNSTILE_SECRET_KEY || '';
const MAX_FILE_SIZE_MB = parseInt(process.env.MAX_FILE_SIZE_MB || '10240', 10);
const MAX_FILE_SIZE_BYTES = MAX_FILE_SIZE_MB * 1024 * 1024;

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, UPLOAD_DIR),
  filename: (req, file, cb) => {
    const id = nanoid(12);
    const ext = path.extname(file.originalname);
    const tempName = `${id}${ext}.part`;
    req._uploadId = id; req._uploadExt = ext; req._tempName = tempName; req._tempPath = path.join(UPLOAD_DIR, tempName);
    cb(null, tempName);
  }
});
const upload = multer({ storage, limits: { files: 1, fileSize: MAX_FILE_SIZE_BYTES } });

async function verifyTurnstileToken(token, ip) {
  if (!TURNSTILE_SECRET || !token) return false;
  try {
    const body = new URLSearchParams({ secret: TURNSTILE_SECRET, response: token });
    if (ip) body.append('remoteip', ip);
    const res = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
      method: 'POST',
      body,
    });
    const data = await res.json();
    return Boolean(data.success);
  } catch {
    return false;
  }
}

const router = express.Router();

router.post('/api/upload', upload.single('file'), async (req, res) => {
  const removeTempFile = () => { try { if (req._tempPath) fs.unlinkSync(req._tempPath); } catch {} };
  req.on('aborted', removeTempFile);
  req.on('close', () => { if (!res.headersSent) removeTempFile(); });

  try {
    if (!req.file) return res.status(400).json({ error: 'No file uploaded' });

    const token = (req.body && (req.body['cf-turnstile-response'] || req.body.turnstileToken)) || '';
    const ok = await verifyTurnstileToken(token, req.ip);
    if (!ok) { removeTempFile(); return res.status(403).json({ error: 'Captcha verification failed' }); }

    const { originalname, mimetype, size } = req.file;
    const id = req._uploadId || path.parse(req.file.filename).name;
    const ext = req._uploadExt || path.extname(originalname);
    const finalName = `${id}${ext}`;
    const finalPath = path.join(UPLOAD_DIR, finalName);

    try {
      fs.renameSync(req._tempPath || req.file.path, finalPath);
    } catch (e) {
      try { fs.unlinkSync(req._tempPath || req.file.path); } catch {}
      throw e;
    }

    const now = new Date().toISOString();
    let deleteHash = null;
    const { deletePassword } = req.body || {};
    if (typeof deletePassword === 'string' && deletePassword.length > 0) {
      deleteHash = await bcrypt.hash(deletePassword, 10);
    }

    const manifest = loadManifest();
    manifest.files.push({
      id, filename: finalName, originalname, mimetype, size,
      uploadedAt: now, downloads: 0, deleteHash,
    });
    saveManifest(manifest);

    res.json({ ok: true, id });
  } catch (err) {
    return res.status(500).json({ error: err.message || 'Upload failed' });
  }
});

export default router;
