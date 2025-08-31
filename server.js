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
import crypto from 'crypto';
import { exec } from 'child_process';

dotenv.config();
const MAX_FILE_SIZE_MB = parseInt(process.env.MAX_FILE_SIZE_MB || '10240', 10); // 10 GB by default

const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD;
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Deployment/Webhook environment configuration
// - WEBHOOK_SECRET: GitHub webhook secret used to verify signatures
// - DEPLOY_BRANCH: branch to deploy on push (default: main)
// - REPO_DIR: directory of the git repo on the server (default: project root)
// - PM2_PROCESS: pm2 process name or id (default: current pm_id if under PM2)
// - PM2_CMD: pm2 executable command/path (default: 'pm2')
// - GIT_CMD: git executable command/path (default: 'git')
// - DEPLOY_INSTALL: if 'true', run 'npm ci --omit=dev' after pull (default: false)
const WEBHOOK_SECRET = process.env.WEBHOOK_SECRET;
const DEPLOY_BRANCH = process.env.DEPLOY_BRANCH || 'main';
const REPO_DIR = process.env.REPO_DIR || __dirname;
const PM2_PROCESS = process.env.PM2_PROCESS || process.env.pm_id;
const PM2_CMD = process.env.PM2_CMD || 'pm2';
const GIT_CMD = process.env.GIT_CMD || 'git';
const DEPLOY_INSTALL = String(process.env.DEPLOY_INSTALL || 'false').toLowerCase() === 'true';

const app = express();

// Respect reverse proxy headers (e.g., X-Forwarded-For) for accurate rate limiting
app.set('trust proxy', 1);

// Static
app.use('/public', express.static(path.join(__dirname, 'public')));
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Body parsing (JSON). Capture raw body for webhook signature verification.
app.use(express.json({
    limit: '2mb',
    verify: (req, _res, buf) => {
        // Store raw body buffer for HMAC verification (e.g., GitHub webhooks)
        req.rawBody = buf;
    }
}));

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
const MAX_FILE_SIZE_BYTES = MAX_FILE_SIZE_MB * 1024 * 1024;
const upload = multer({
    storage,
    limits: { files: 1, fileSize: MAX_FILE_SIZE_BYTES },
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

// GitHub Webhook for auto-deploy
function verifyGithubSignature(secret, rawBody, sigHeader) {
    try {
        if (!secret) return false;
        if (!sigHeader || !sigHeader.startsWith('sha256=')) return false;
        const theirSig = Buffer.from(sigHeader.slice('sha256='.length), 'hex');
        const hmac = crypto.createHmac('sha256', secret);
        hmac.update(rawBody || Buffer.alloc(0));
        const digest = Buffer.from(hmac.digest('hex'), 'hex');
        if (theirSig.length !== digest.length) return false;
        return crypto.timingSafeEqual(theirSig, digest);
    } catch {
        return false;
    }
}

const execAsync = (cmd, options = {}) => new Promise((resolve, reject) => {
    exec(cmd, options, (error, stdout, stderr) => {
        if (error) {
            error.stdout = stdout;
            error.stderr = stderr;
            return reject(error);
        }
        resolve({ stdout, stderr });
    });
});

async function runDeploy(branch) {
    const cwd = REPO_DIR;
    const env = { ...process.env };
    console.log(`[deploy] cwd=${cwd}, branch=${branch}`);
    // Fetch latest and hard reset to remote branch to avoid merge commits
    await execAsync(`${GIT_CMD} fetch --all --prune`, { cwd, env });
    await execAsync(`${GIT_CMD} checkout -q ${branch}`, { cwd, env });
    await execAsync(`${GIT_CMD} reset --hard origin/${branch}`, { cwd, env });

    if (DEPLOY_INSTALL) {
        const hasLock = fs.existsSync(path.join(cwd, 'package-lock.json'));
        const installCmd = hasLock ? 'npm ci --omit=dev' : 'npm install --omit=dev';
        console.log(`[deploy] running ${installCmd}`);
        await execAsync(installCmd, { cwd, env });
    }

    if (PM2_PROCESS) {
        console.log(`[deploy] restarting pm2 process: ${PM2_PROCESS}`);
        await execAsync(`${PM2_CMD} restart ${PM2_PROCESS}`, { cwd, env });
    } else {
        console.warn('[deploy] PM2_PROCESS is not set; falling back to process exit for PM2 auto-restart');
        setTimeout(() => process.exit(0), 500);
    }
}

app.post('/webhook', async (req, res) => {
    try {
        if (!WEBHOOK_SECRET) {
            return res.status(501).json({ error: 'WEBHOOK_SECRET not configured on server' });
        }
        const event = req.get('x-github-event');
        const sig = req.get('x-hub-signature-256');
        if (!verifyGithubSignature(WEBHOOK_SECRET, req.rawBody, sig)) {
            return res.status(401).json({ error: 'Invalid signature' });
        }
        if (event !== 'push') {
            return res.json({ ok: true, ignored: true, reason: 'not a push event' });
        }
        const payload = req.body || {};
        const ref = payload.ref;
        const expectedRef = `refs/heads/${DEPLOY_BRANCH}`;
        if (ref !== expectedRef) {
            return res.json({ ok: true, ignored: true, reason: `ref ${ref} != ${expectedRef}` });
        }

        res.status(202).json({ ok: true, action: 'deploy-started', branch: DEPLOY_BRANCH });
        setImmediate(async () => {
            try {
                console.log('[deploy] webhook accepted; starting deploy...');
                await runDeploy(DEPLOY_BRANCH);
                console.log('[deploy] done');
            } catch (e) {
                console.error('[deploy] failed', e?.message, e?.stderr || '');
            }
        });
    } catch (e) {
        console.error('webhook error', e);
        return res.status(500).json({ error: 'Webhook error' });
    }
});

// Centralized error handler (JSON responses)
app.use((err, req, res, _next) => {
    // Multer file size limit
    if (err && (err.code === 'LIMIT_FILE_SIZE')) {
        return res.status(413).json({ error: `File too large. Max ${MAX_FILE_SIZE_MB} MB.` });
    }
    // Other Multer errors
    if (err && err.name === 'MulterError') {
        return res.status(400).json({ error: err.message });
    }
    // JSON/body parser too large
    if (err && err.type === 'entity.too.large') {
        return res.status(413).json({ error: 'Payload too large' });
    }
    // Invalid JSON
    if (err instanceof SyntaxError && 'body' in err) {
        return res.status(400).json({ error: 'Invalid JSON' });
    }
    console.error(err);
    return res.status(500).json({ error: 'Internal Server Error' });
});

const server = app.listen(PORT, () => {
    console.log(`FileShare running on http://localhost:${PORT}`);
});
server.requestTimeout = 0;
server.headersTimeout = 120 * 1000;
server.keepAliveTimeout = 75 * 1000;
server.maxRequestsPerSocket = 0;
