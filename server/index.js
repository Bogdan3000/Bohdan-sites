import express from 'express';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

import uploadRoutes from './routes/upload.js';
import filesRoutes from './routes/files.js';
import deployRoutes from './routes/deploy.js';
import { cspDirectives } from './middleware/security.js';

dotenv.config();

const app = express();
app.set('trust proxy', 1);

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = process.env.PORT || 3000;

app.use('/public', express.static(path.join(__dirname, '..', 'public')));
app.use('/uploads', express.static(path.join(__dirname, '..', 'uploads')));

app.use(express.json({
  limit: '2mb',
  verify: (req, _res, buf) => { req.rawBody = buf; }
}));

const apiLimiter = rateLimit({ windowMs: 60 * 1000, max: 60, standardHeaders: true, legacyHeaders: false });
app.use('/api/', apiLimiter);

app.use(helmet({ contentSecurityPolicy: { directives: cspDirectives } }));

// Health
app.get('/api/health', (_req, res) => res.json({ ok: true }));

// SPA entry
app.get('/', (_req, res) => {
  res.sendFile(path.join(__dirname, '..', 'public', 'index.html'));
});

// Routes
app.use(uploadRoutes);
app.use(filesRoutes);
app.use(deployRoutes);

// SPA routes for file viewer
app.get(['/f/:id','/file/:id','/view/:id'], (_req, res) => {
  res.sendFile(path.join(__dirname, '..', 'public', 'index.html'));
});

const server = app.listen(PORT, () => {
  console.log(`FileShare running on http://localhost:${PORT}`);
});

server.requestTimeout = 0;
server.headersTimeout = 120 * 1000;
server.keepAliveTimeout = 75 * 1000;
server.maxRequestsPerSocket = 0;
