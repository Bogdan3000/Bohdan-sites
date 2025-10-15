import express from 'express';
import multer from 'multer';
import path from 'path';
import { nanoid } from 'nanoid';
import bcrypt from 'bcryptjs';
import fs from 'fs';
import dotenv from 'dotenv';
import jwt from 'jsonwebtoken';
import { ensureDirs, loadManifest, saveManifest, UPLOAD_DIR } from '../utils/manifest.js';

dotenv.config();
ensureDirs();

const TURNSTILE_SECRET = process.env.TURNSTILE_SECRET_KEY || '';
const MAX_FILE_SIZE_MB = parseInt(process.env.MAX_FILE_SIZE_MB || '10240', 10);
const MAX_FILE_SIZE_BYTES = MAX_FILE_SIZE_MB * 1024 * 1024;
const JWT_SECRET = process.env.JWT_SECRET || '';

const storage = multer.diskStorage({
    destination: (_req, _file, cb) => cb(null, UPLOAD_DIR),
    filename: (req, file, cb) => {
        const id = nanoid(12);
        const ext = path.extname(file.originalname);
        const tempName = `${id}${ext}.part`;
        req._uploadId = id;
        req._uploadExt = ext;
        req._tempName = tempName;
        req._tempPath = path.join(UPLOAD_DIR, tempName);
        cb(null, tempName);
    }
});

const upload = multer({
    storage,
    limits: { files: 1, fileSize: MAX_FILE_SIZE_BYTES }
});

async function verifyTurnstileToken(token, ip) {
    try {
        if (!TURNSTILE_SECRET) return false;
        if (!token) return false;
        const body = new URLSearchParams();
        body.append('secret', TURNSTILE_SECRET);
        body.append('response', token);
        if (ip) body.append('remoteip', ip);
        const r = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
            method: 'POST',
            body
        });
        const js = await r.json().catch(() => ({}));
        return Boolean(js.success);
    } catch {
        return false;
    }
}

const router = express.Router();

/**
 * 1) Пред-верификация капчи -> выдаём uploadToken (TTL 60 мин)
 * Клиент присылает cf-turnstile-response, мы проверяем у Cloudflare и возвращаем наш токен.
 */
router.post('/api/verify-captcha', express.json(), async (req, res) => {
    try {
        const token =
            req.body?.['cf-turnstile-response'] ||
            req.body?.turnstileToken ||
            '';
        const ok = await verifyTurnstileToken(token, req.ip);
        if (!ok) return res.status(403).json({ error: 'Captcha verification failed' });
        if (!JWT_SECRET) return res.status(501).json({ error: 'Server not configured (JWT_SECRET missing)' });

        const uploadToken = jwt.sign(
            { ip: req.ip, ua: req.get('user-agent') || '' },
            JWT_SECRET,
            { expiresIn: '60m' }
        );

        return res.json({ ok: true, uploadToken });
    } catch (e) {
        return res.status(500).json({ error: 'verify-captcha failed' });
    }
});

/**
 * 2) Middleware: проверка uploadToken ДО записи файла (до Multer)
 * Если заголовок/тело не содержит токен — пропускаем дальше и используем старую схему с капчей (обратная совместимость).
 */
function verifyUploadToken(req, res, next) {
    try {
        const hdr = req.get('x-upload-token');
        const bodyTok = req.body?.uploadToken;
        const t = hdr || bodyTok || '';
        if (!t) return next(); // старый путь с серверной проверкой капчи после аплоада
        if (!JWT_SECRET) return res.status(501).json({ error: 'Server not configured (JWT_SECRET missing)' });
        const decoded = jwt.verify(t, JWT_SECRET);
        if (decoded?.ip !== req.ip) return res.status(401).json({ error: 'Token IP mismatch' });
        if ((decoded?.ua || '') !== (req.get('user-agent') || '')) return res.status(401).json({ error: 'Token UA mismatch' });
        req._uploadTokenVerified = true;
        return next();
    } catch {
        return res.status(401).json({ error: 'Invalid or expired upload token' });
    }
}

/**
 * 3) Основной аплоад:
 * - Если uploadToken уже проверен — капчу не трогаем (решает проблему долгих загрузок).
 * - Иначе (обратная совместимость) — проверяем cf-turnstile-response, как раньше.
 */
router.post('/api/upload', verifyUploadToken, upload.single('file'), async (req, res) => {
    const cleanupOnAbort = () => {
        try { if (req._tempPath) fs.unlinkSync(req._tempPath); } catch {}
    };
    req.on('aborted', cleanupOnAbort);
    req.on('close', () => { if (!res.headersSent) cleanupOnAbort(); });

    try {
        if (!req.file) return res.status(400).json({ error: 'No file uploaded' });

        if (!req._uploadTokenVerified) {
            const token =
                (req.body && (req.body['cf-turnstile-response'] || req.body.turnstileToken)) || '';
            const ok = await verifyTurnstileToken(token, req.ip);
            if (!ok) { cleanupOnAbort(); return res.status(403).json({ error: 'Captcha verification failed' }); }
        }

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
            id,
            filename: finalName,
            originalname,
            mimetype,
            size,
            uploadedAt: now,
            downloads: 0,
            deleteHash
        });
        saveManifest(manifest);

        return res.json({ ok: true, id });
    } catch (err) {
        return res.status(500).json({ error: err.message || 'Upload failed' });
    }
});

export default router;