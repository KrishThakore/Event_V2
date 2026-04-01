import { spawn } from 'child_process';
import { existsSync } from 'fs';
import { join } from 'path';
import { loadEnvFile } from 'node:process';
import { PrismaClient } from '@prisma/client';

for (const envFileName of ['.env', '.env.local']) {
  const envFilePath = join(process.cwd(), envFileName);
  if (existsSync(envFilePath)) {
    loadEnvFile(envFilePath);
  }
}

const workerScriptPath = join(process.cwd(), 'scripts', 'google-drive-backup.mjs');
const minPollMs = Math.max(30_000, Number(process.env.BACKUP_DAEMON_MIN_POLL_MS) || 60_000);
const maxPollMs = Math.max(minPollMs, Number(process.env.BACKUP_DAEMON_MAX_POLL_MS) || 300_000);
const prisma = new PrismaClient();
const DAEMON_KEYS = {
  running: 'backup_google_drive_daemon_running',
  startedAt: 'backup_google_drive_daemon_started_at',
  heartbeatAt: 'backup_google_drive_daemon_heartbeat_at',
  enabled: 'backup_google_drive_enabled',
  intervalMinutes: 'backup_google_drive_interval_minutes',
  lastRunAt: 'backup_google_drive_last_run_at',
};

let running = false;
let stopRequested = false;
let heartbeatInterval;

function timestamp() {
  return new Date().toISOString();
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function setSetting(key, value) {
  await prisma.site_settings.upsert({
    where: { key },
    update: { value, updated_at: new Date() },
    create: { key, value },
  });
}

async function markDaemonState({ running: isRunning, startedAt, heartbeatAt }) {
  const updates = [setSetting(DAEMON_KEYS.running, isRunning ? 'true' : 'false')];

  if (startedAt !== undefined) {
    updates.push(setSetting(DAEMON_KEYS.startedAt, startedAt));
  }

  if (heartbeatAt !== undefined) {
    updates.push(setSetting(DAEMON_KEYS.heartbeatAt, heartbeatAt));
  }

  await Promise.all(updates);
}

async function loadDaemonSchedule() {
  const settings = await prisma.site_settings.findMany({
    where: {
      key: {
        in: [DAEMON_KEYS.enabled, DAEMON_KEYS.intervalMinutes, DAEMON_KEYS.lastRunAt],
      },
    },
    select: {
      key: true,
      value: true,
    },
  });

  const map = new Map(settings.map((setting) => [setting.key, setting.value]));
  const enabled = map.get(DAEMON_KEYS.enabled) === 'true';
  const intervalMinutes = Math.max(1, Number(map.get(DAEMON_KEYS.intervalMinutes)) || 30);
  const lastRunAt = map.get(DAEMON_KEYS.lastRunAt) || '';

  return { enabled, intervalMinutes, lastRunAt };
}

async function getSleepDurationMs() {
  try {
    const { enabled, intervalMinutes, lastRunAt } = await loadDaemonSchedule();
    if (!enabled) {
      return maxPollMs;
    }

    if (!lastRunAt) {
      return minPollMs;
    }

    const lastRunMs = new Date(lastRunAt).getTime();
    if (!Number.isFinite(lastRunMs)) {
      return minPollMs;
    }

    const nextDueMs = lastRunMs + intervalMinutes * 60_000;
    const remainingMs = nextDueMs - Date.now();

    if (remainingMs <= minPollMs) {
      return minPollMs;
    }

    return Math.min(maxPollMs, remainingMs);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error(`[BACKUP_DAEMON] ${timestamp()} Failed to read backup schedule: ${message}`);
    return minPollMs;
  }
}

async function runWorkerOnce() {
  if (running) {
    return;
  }

  running = true;
  console.log(`[BACKUP_DAEMON] ${timestamp()} Checking whether a backup is due...`);

  try {
    await new Promise((resolve, reject) => {
      const child = spawn(process.execPath, [workerScriptPath], {
        cwd: process.cwd(),
        env: process.env,
        windowsHide: true,
        stdio: 'inherit',
      });

      child.on('error', reject);
      child.on('close', (code) => {
        if (code === 0) {
          resolve();
          return;
        }

        reject(new Error(`Backup worker exited with code ${code}`));
      });
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error(`[BACKUP_DAEMON] ${timestamp()} Worker error: ${message}`);
  } finally {
    running = false;
  }
}

async function main() {
  console.log(`[BACKUP_DAEMON] ${timestamp()} Started. Poll interval window: ${minPollMs}-${maxPollMs} ms`);
  console.log(`[BACKUP_DAEMON] ${timestamp()} The worker reads backup settings from the database and only runs when due.`);
  await markDaemonState({
    running: true,
    startedAt: new Date().toISOString(),
    heartbeatAt: new Date().toISOString(),
  });

  heartbeatInterval = setInterval(() => {
    void markDaemonState({
      running: true,
      heartbeatAt: new Date().toISOString(),
    });
  }, 120_000);

  while (!stopRequested) {
    await runWorkerOnce();

    if (stopRequested) {
      break;
    }

    await sleep(await getSleepDurationMs());
  }

  if (heartbeatInterval) {
    clearInterval(heartbeatInterval);
  }

  await markDaemonState({
    running: false,
    heartbeatAt: new Date().toISOString(),
  });
  await prisma.$disconnect();
  console.log(`[BACKUP_DAEMON] ${timestamp()} Stopped.`);
}

function requestStop(signal) {
  console.log(`[BACKUP_DAEMON] ${timestamp()} Received ${signal}. Waiting for the current cycle to finish...`);
  stopRequested = true;
}

process.on('SIGINT', () => requestStop('SIGINT'));
process.on('SIGTERM', () => requestStop('SIGTERM'));

main().catch(async (error) => {
  const message = error instanceof Error ? error.message : String(error);
  console.error(`[BACKUP_DAEMON] ${timestamp()} Fatal error: ${message}`);
  if (heartbeatInterval) {
    clearInterval(heartbeatInterval);
  }
  await markDaemonState({
    running: false,
    heartbeatAt: new Date().toISOString(),
  });
  await prisma.$disconnect();
  process.exit(1);
});
