import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { spawn } from 'child_process';
import { join } from 'path';
import { loadBackupSettingsFromDb } from '@/lib/backup-settings';

export async function POST() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id || session.user.role !== 'admin') {
    return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const scriptPath = join(process.cwd(), 'scripts', 'google-drive-backup.mjs');

    const output = await new Promise<{ stdout: string; stderr: string }>((resolve, reject) => {
      const child = spawn(process.execPath, [scriptPath, '--force'], {
        cwd: process.cwd(),
        env: process.env,
        windowsHide: true,
      });

      let stdout = '';
      let stderr = '';

      child.stdout.on('data', (chunk) => {
        stdout += chunk.toString();
      });

      child.stderr.on('data', (chunk) => {
        stderr += chunk.toString();
      });

      child.on('error', (error) => {
        reject(error);
      });

      child.on('close', (code) => {
        if (code === 0) {
          resolve({ stdout, stderr });
          return;
        }

        reject(new Error(stderr || stdout || `Backup worker exited with code ${code}`));
      });
    });

    const backup = await loadBackupSettingsFromDb();

    return NextResponse.json({
      success: true,
      backup,
      output,
    });
  } catch (error: any) {
    const backup = await loadBackupSettingsFromDb().catch(() => null);
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Failed to start backup',
        backup,
      },
      { status: 500 }
    );
  }
}
