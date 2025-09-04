import express from 'express';
import fs from 'fs';
import path from 'path';
import bcrypt from 'bcryptjs';
import dotenv from 'dotenv';
import { ensureDirs, loadManifest, saveManifest, UPLOAD_DIR } from '../utils/manifest.js';

dotenv.config();
ensureDirs();

const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD;

const router = express.Router();

function formatFile(item) {
  const { deleteHash, ...rest } = item;
  return {
    ...rest,
    requiresPassword: Boolean(deleteHash),
    url: `/uploads/${rest.filename}`,
    downloadUrl: `/d/${rest.id}`,
  };
}

router.get('/api/files', (_req, res) => {
  const manifest = loadManifest();
  const files = manifest.files
    .slice()
    .sort((a, b) => b.uploadedAt.localeCompare(a.uploadedAt))
    .map(formatFile);
  res.json({ files });
});

router.get('/api/files/:id', (req, res) => {
  const { id } = req.params;
  const manifest = loadManifest();
  const item = manifest.files.find(f => f.id === id);
  if (!item) return res.status(404).json({ error: 'Not found' });
  return res.json({ file: formatFile(item) });
});

router.get('/d/:id', (req, res) => {
  const { id } = req.params;
  const manifest = loadManifest();
  const item = manifest.files.find(f => f.id === id);
  if (!item) return res.status(404).send('Not found');
  const filepath = path.join(UPLOAD_DIR, item.filename);
  if (!fs.existsSync(filepath)) return res.status(404).send('File missing');
  item.downloads = (item.downloads || 0) + 1;
  saveManifest(manifest);
  res.download(filepath, item.originalname);
});

router.get('/u/:id/:name', (req, res) => {
  const { id } = req.params;
  const manifest = loadManifest();
  const item = manifest.files.find(f => f.id === id);
  if (!item) return res.status(404).send('Not found');
  const filepath = path.join(UPLOAD_DIR, item.filename);
  if (!fs.existsSync(filepath)) return res.status(404).send('File missing');
  if (item.mimetype) res.type(item.mimetype);
  res.sendFile(filepath);
});

router.delete('/api/files/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const manifest = loadManifest();
    const idx = manifest.files.findIndex(f => f.id === id);
    if (idx === -1) return res.status(404).json({ error: 'Not found' });
    const item = manifest.files[idx];

    if (item.deleteHash) {
      const pass = (req.body && req.body.password) || '';
      const admin = ADMIN_PASSWORD && pass === ADMIN_PASSWORD;
      const userOk = pass && await bcrypt.compare(pass, item.deleteHash);
      if (!(admin || userOk)) {
        return res.status(403).json({ error: 'Invalid password' });
      }
    }

    const filepath = path.join(UPLOAD_DIR, item.filename);
    try { if (fs.existsSync(filepath)) fs.unlinkSync(filepath); } catch {}
    manifest.files.splice(idx, 1);
    saveManifest(manifest);
    return res.json({ ok: true });
  } catch {
    return res.status(500).json({ error: 'Delete failed' });
  }
});

export default router;
