import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
export const ROOT = path.join(__dirname, '..');

export const UPLOAD_DIR = path.join(ROOT, '..', 'uploads');
export const DATA_DIR = path.join(ROOT, '..', 'data');
export const MANIFEST_PATH = path.join(DATA_DIR, 'manifest.json');

export function ensureDirs(){
  if (!fs.existsSync(UPLOAD_DIR)) fs.mkdirSync(UPLOAD_DIR, { recursive: true });
  if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
  if (!fs.existsSync(MANIFEST_PATH)) fs.writeFileSync(MANIFEST_PATH, JSON.stringify({ files: [] }, null, 2));
  for (const f of fs.readdirSync(UPLOAD_DIR)) {
    if (f.endsWith('.part')) { try { fs.unlinkSync(path.join(UPLOAD_DIR, f)); } catch {} }
  }
}

export function loadManifest(){
  try { return JSON.parse(fs.readFileSync(MANIFEST_PATH, 'utf8')); }
  catch { return { files: [] }; }
}

export function saveManifest(manifest){
  fs.writeFileSync(MANIFEST_PATH, JSON.stringify(manifest, null, 2));
}