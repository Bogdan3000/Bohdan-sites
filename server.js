import express from 'express';
import multer from 'multer';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import { nanoid } from 'nanoid';
import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';
import bcrypt from 'bcryptjs';
import { fileURLToPath } from 'url';

dotenv.config();
const MAX_FILE_SIZE_MB = parseInt(process.env.MAX_FILE_SIZE_MB || '10240', 10); // 10 GB by default

const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'Bogdan3000';
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();

// Static
app.use('/public', express.static(path.join(__dirname, 'public')));
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Body parsing (for small JSON bodies)
app.use(express.json({ limit: '128kb' }));

// Rate limiting for API routes
const apiLimiter = rateLimit({
    windowMs: 60 * 1000,
    max: 60, // 60 requests/minute per IP
    standardHeaders: true,
    legacyHeaders: false,
});
app.use('/api/', apiLimiter);

app.use(helmet({
    contentSecurityPolicy: {
        directives: {
            defaultSrc: ["'self'"],
            scriptSrc: ["'self'", "https://cdn.jsdelivr.net"],
            styleSrc: ["'self'", "https://cdn.jsdelivr.net", "https://bohdan.lol", "'unsafe-inline'"],
            fontSrc: ["'self'", "https://cdn.jsdelivr.net", "https://bohdan.lol", "data:"],
            imgSrc: ["'self'", "data:", "blob:"],
            connectSrc: ["'self'"],
            mediaSrc: ["'self'", "blob:"],
            frameSrc: ["'self'", "https://docs.google.com"], // <— ДЛЯ DOC/DOCX/XLS/PPT предпросмотра
            objectSrc: ["'none'"],
            baseUri: ["'self'"],
            frameAncestors: ["'self'"]
        }
    }
}));

const PORT = process.env.PORT || 3000;

// Ensure folders exist
const UPLOAD_DIR = path.join(__dirname, 'uploads');
const DATA_DIR = path.join(__dirname, 'data');
const MANIFEST_PATH = path.join(DATA_DIR, 'manifest.json');
if (!fs.existsSync(UPLOAD_DIR)) fs.mkdirSync(UPLOAD_DIR, { recursive: true });
if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
if (!fs.existsSync(MANIFEST_PATH)) fs.writeFileSync(MANIFEST_PATH, JSON.stringify({ files: [] }, null, 2));

// Multer storage
const storage = multer.diskStorage({
    destination: (_req, _file, cb) => cb(null, UPLOAD_DIR),
    filename: (_req, file, cb) => {
        const id = nanoid(12);
        const ext = path.extname(file.originalname);
        cb(null, `${id}${ext}`);
    }
});
const upload = multer({
    storage,
    limits: { files: 1 },
});

// Serve the SPA
app.get('/', (_req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

function loadManifest() {
    try {
        const raw = fs.readFileSync(MANIFEST_PATH, 'utf8');
        return JSON.parse(raw);
    } catch {
        return { files: [] };
    }
}
function saveManifest(manifest) {
    fs.writeFileSync(MANIFEST_PATH, JSON.stringify(manifest, null, 2));
}

// Upload endpoint (supports optional delete password)
app.post('/api/upload', upload.single('file'), async (req, res) => {
    try {
        if (!req.file) return res.status(400).json({ error: 'No file uploaded' });
        const { originalname, mimetype, size, filename } = req.file;
        const id = path.parse(filename).name;
        const now = new Date().toISOString();

        let deleteHash = null;
        const { deletePassword } = req.body || {};
        if (typeof deletePassword === 'string' && deletePassword.length > 0) {
            deleteHash = await bcrypt.hash(deletePassword, 10);
        }

        const manifest = loadManifest();
        manifest.files.push({
            id,
            filename,
            originalname,
            mimetype,
            size,
            uploadedAt: now,
            downloads: 0,
            deleteHash, // may be null
        });
        saveManifest(manifest);
        res.json({ ok: true, id });
    } catch (err) {
        res.status(500).json({ error: err.message || 'Upload failed' });
    }
});

// List files (everyone sees all). Do not leak deleteHash.
app.get('/api/files', (_req, res) => {
    const manifest = loadManifest();
    const files = manifest.files
        .slice()
        .sort((a, b) => b.uploadedAt.localeCompare(a.uploadedAt))
        .map(({ deleteHash, ...rest }) => ({
            ...rest,
            requiresPassword: !!deleteHash,
            url: `/uploads/${rest.filename}`,
            downloadUrl: `/d/${rest.id}`,
        }));
    res.json({ files });
});

// Download by id
app.get('/d/:id', (req, res) => {
    const { id } = req.params;
    const manifest = loadManifest();
    const item = manifest.files.find(f => f.id === id);
    if (!item) return res.status(404).send('Not found');
    const filepath = path.join(UPLOAD_DIR, item.filename);
    if (!fs.existsSync(filepath)) return res.status(404).send('File missing');
    // bump counter
    item.downloads = (item.downloads || 0) + 1;
    saveManifest(manifest);
    res.download(filepath, item.originalname);
});

// Delete by id with password logic:
// - если пароля нет в манифесте -> можно удалять без пароля
// - если пароль есть -> нужен правильный пароль ИЛИ админ-пароль
app.delete('/api/files/:id', async (req, res) => {
    const { id } = req.params;
    const { password } = req.body || {};
    const manifest = loadManifest();
    const idx = manifest.files.findIndex(f => f.id === id);
    if (idx === -1) return res.status(404).json({ error: 'Not found' });
    const item = manifest.files[idx];
    const isAdmin = typeof password === 'string' && password === ADMIN_PASSWORD;

    if (item.deleteHash) {
        // password was set at upload time -> require correct password or admin
        if (!isAdmin) {
            if (typeof password !== 'string' || password.length === 0) {
                return res.status(400).json({ error: 'Password required.' });
            }
            const ok = await bcrypt.compare(password, item.deleteHash);
            if (!ok) return res.status(401).json({ error: 'Invalid password.' });
        }
    } else {
        // no password set -> allow deletion without password
    }

    const filepath = path.join(UPLOAD_DIR, item.filename);
    try { if (fs.existsSync(filepath)) fs.unlinkSync(filepath); } catch {}
    manifest.files.splice(idx, 1);
    saveManifest(manifest);
    res.json({ ok: true });
});

// Health check
app.get('/api/health', (_req, res) => res.json({ ok: true }));

const server = app.listen(PORT, () => {
    console.log(`FileShare running on http://localhost:${PORT}`);
});
server.requestTimeout = 0;
server.headersTimeout = 120 * 1000;
server.keepAliveTimeout = 75 * 1000;
server.maxRequestsPerSocket = 0;
