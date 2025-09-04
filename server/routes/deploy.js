import express from 'express';
import dotenv from 'dotenv';
import path from 'path';
import { verifyGithubSignature } from '../utils/verifyGithub.js';
import { runDeploy } from '../utils/deploy.js';

dotenv.config();

const WEBHOOK_SECRET = process.env.WEBHOOK_SECRET;
const DEPLOY_BRANCH = process.env.DEPLOY_BRANCH || 'FileShare';
const REPO_DIR = process.env.REPO_DIR || path.join(process.cwd());
const PM2_PROCESS = process.env.PM2_PROCESS || process.env.pm_id;
const PM2_CMD = process.env.PM2_CMD || 'pm2';
const GIT_CMD = process.env.GIT_CMD || 'git';
const DEPLOY_INSTALL = String(process.env.DEPLOY_INSTALL || 'false').toLowerCase() === 'true';

const router = express.Router();

router.post('/webhook', async (req, res) => {
  try {
    if (!WEBHOOK_SECRET) return res.status(501).json({ error: 'WEBHOOK_SECRET not configured on server' });
    const event = req.get('x-github-event');
    const sig = req.get('x-hub-signature-256');
    if (!verifyGithubSignature(WEBHOOK_SECRET, req.rawBody, sig)) {
      return res.status(401).json({ error: 'Invalid signature' });
    }
    if (event !== 'push') {
      return res.json({ ok: true, ignored: true, reason: 'not a push event' });
    }

    const { ref = '' } = req.body || {};
    const expectedRef = `refs/heads/${DEPLOY_BRANCH}`;
    if (ref !== expectedRef) {
      return res.json({ ok: true, ignored: true, reason: `ref ${ref} != ${expectedRef}` });
    }

    res.status(202).json({ ok: true, action: 'deploy-started', branch: DEPLOY_BRANCH });
    setImmediate(async () => {
      try {
        console.log('[deploy] webhook accepted; starting deploy...');
        await runDeploy({ GIT_CMD, REPO_DIR, DEPLOY_BRANCH, DEPLOY_INSTALL, PM2_CMD, PM2_PROCESS });
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

export default router;
