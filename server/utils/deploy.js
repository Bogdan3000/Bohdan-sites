import fs from 'fs';
import path from 'path';
import { exec } from 'child_process';

const execAsync = (cmd, options = {}) => new Promise((resolve, reject) => {
  exec(cmd, options, (error, stdout, stderr) => {
    if (error) { error.stdout = stdout; error.stderr = stderr; return reject(error); }
    resolve({ stdout, stderr });
  });
});

export async function runDeploy({ GIT_CMD, REPO_DIR, DEPLOY_BRANCH, DEPLOY_INSTALL, PM2_CMD, PM2_PROCESS }){
  const cwd = REPO_DIR;
  const env = { ...process.env };
  console.log(`[deploy] cwd=${cwd}, branch=${DEPLOY_BRANCH}`);
  await execAsync(`${GIT_CMD} fetch --all --prune`, { cwd, env });
  await execAsync(`${GIT_CMD} checkout -q ${DEPLOY_BRANCH}`, { cwd, env });
  await execAsync(`${GIT_CMD} reset --hard origin/${DEPLOY_BRANCH}`, { cwd, env });

  if (DEPLOY_INSTALL) {
    const hasLock = fs.existsSync(path.join(cwd, 'package-lock.json'));
    const installCmd = hasLock ? 'npm ci --omit=dev' : 'npm install --omit=dev';
    console.log(`[deploy] running ${installCmd}`);
    await execAsync(installCmd, { cwd, env });
  }

    if (PM2_PROCESS) {
        console.log(`[deploy] starting pm2 process: ${PM2_PROCESS}`);
        await execAsync(`${PM2_CMD} start server/index.js --name ${PM2_PROCESS}`, { cwd, env });
    } else {
        console.warn('[deploy] PM2_PROCESS is not set; falling back to process exit for PM2 auto-restart');
        setTimeout(() => process.exit(0), 500);
    }
}