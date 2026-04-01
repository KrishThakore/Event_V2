'use client';

import { useState, useEffect, useRef } from 'react';
import { toast } from 'sonner';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Settings, Link as LinkIcon, Save, ExternalLink, HardDrive, Clock3, CloudUpload, ShieldCheck, PlayCircle, ScanLine, Zap, Eye } from 'lucide-react';

interface BackupSettings {
  enabled: boolean;
  intervalMinutes: number;
  folderUrl: string;
  backupFolderId: string;
  oauthClientId: string;
  hasOAuthClientSecret: boolean;
  hasDriveConnection: boolean;
  driveAccountEmail: string;
  daemonRunning: boolean;
  daemonStartedAt: string;
  daemonHeartbeatAt: string;
  workerRunning: boolean;
  workerPhase: string;
  workerStartedAt: string;
  lastRunAt: string;
  lastBackupName: string;
  lastStatus: string;
  lastError: string;
}

export default function AdminSettingsPage() {
  const [defaultQfixLink, setDefaultQfixLink] = useState('');
  const [attendanceScanMode, setAttendanceScanMode] = useState<'fast' | 'slow'>('fast');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [scanModeSaving, setScanModeSaving] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [backupSaving, setBackupSaving] = useState(false);
  const [backupStarting, setBackupStarting] = useState(false);
  const [oauthClientIdInput, setOauthClientIdInput] = useState('');
  const [oauthClientSecretInput, setOauthClientSecretInput] = useState('');
  const [timeUntilNextPush, setTimeUntilNextPush] = useState('');
  const [oauthRedirectUri, setOauthRedirectUri] = useState('');
  const [backupSettings, setBackupSettings] = useState<BackupSettings>({
    enabled: false,
    intervalMinutes: 30,
    folderUrl: '',
    backupFolderId: '',
    oauthClientId: '',
    hasOAuthClientSecret: false,
    hasDriveConnection: false,
    driveAccountEmail: '',
    daemonRunning: false,
    daemonStartedAt: '',
    daemonHeartbeatAt: '',
    workerRunning: false,
    workerPhase: '',
    workerStartedAt: '',
    lastRunAt: '',
    lastBackupName: '',
    lastStatus: '',
    lastError: '',
  });
  const autoTriggerInFlightRef = useRef(false);

  useEffect(() => {
    setOauthRedirectUri(`${window.location.origin}/api/admin/backup-drive/callback`);
  }, []);

  useEffect(() => {
    Promise.all([
      fetch('/api/admin/settings?key=default_qfix_link').then((res) => res.json()),
      fetch('/api/admin/settings?key=attendance_scan_mode').then((res) => res.json()),
      fetch('/api/admin/backup-settings').then((res) => res.json()),
    ])
      .then(([qfixData, scanModeData, backupData]) => {
        if (qfixData.value) {
          setDefaultQfixLink(qfixData.value);
          setIsEditing(false);
        } else {
          setIsEditing(true);
        }

        if (scanModeData.value === 'slow' || scanModeData.value === 'fast') {
          setAttendanceScanMode(scanModeData.value);
        }

        if (backupData.success && backupData.backup) {
          setBackupSettings(backupData.backup);
          setOauthClientIdInput(backupData.backup.oauthClientId || '');
        }
      })
      .catch(() => toast.error('Failed to load settings'))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    const poll = window.setInterval(() => {
      fetch('/api/admin/backup-settings', { cache: 'no-store' })
        .then((res) => res.json())
        .then((data) => {
          if (data.success && data.backup) {
            setBackupSettings((prev) => ({ ...prev, ...data.backup }));
          }
        })
        .catch(() => {});
    }, 3000);

    return () => window.clearInterval(poll);
  }, []);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const status = params.get('backupOAuth');
    if (!status) return;

    if (status === 'connected') {
      toast.success('Google Drive connected successfully');
      fetch('/api/admin/backup-settings')
        .then((res) => res.json())
        .then((data) => {
          if (data.success && data.backup) {
            setBackupSettings(data.backup);
            setOauthClientIdInput(data.backup.oauthClientId || '');
          }
        })
        .catch(() => {});
    } else if (status === 'missing-config') {
      toast.error('Save the Google OAuth client ID and secret first');
    } else {
      toast.error(`Google Drive connection failed: ${status}`);
    }

    params.delete('backupOAuth');
    const nextUrl = `${window.location.pathname}${params.toString() ? `?${params.toString()}` : ''}`;
    window.history.replaceState({}, '', nextUrl);
  }, []);

  useEffect(() => {
    const interval = window.setInterval(() => {
      setTimeUntilNextPush(getTimeUntilNextPush());
    }, 1000);

    setTimeUntilNextPush(getTimeUntilNextPush());

    return () => window.clearInterval(interval);
  }, [backupSettings.enabled, backupSettings.intervalMinutes, backupSettings.lastRunAt]);

  const handleSave = async () => {
    setSaving(true);
    try {
      const res = await fetch('/api/admin/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ key: 'default_qfix_link', value: defaultQfixLink.trim() })
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Failed to save');
      }
      toast.success('Settings saved successfully');
      setIsEditing(false);
    } catch (error: any) {
      toast.error(error.message || 'Failed to save settings');
    } finally {
      setSaving(false);
    }
  };

  const handleSaveScanMode = async () => {
    setScanModeSaving(true);
    try {
      const res = await fetch('/api/admin/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ key: 'attendance_scan_mode', value: attendanceScanMode }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Failed to save scanner mode');
      }
      toast.success(`Attendance scanner set to ${attendanceScanMode === 'fast' ? 'Fast Scanning' : 'Slow Scanning'}`);
    } catch (error: any) {
      toast.error(error.message || 'Failed to save scanner mode');
    } finally {
      setScanModeSaving(false);
    }
  };

  const handleSaveBackupSettings = async () => {
    setBackupSaving(true);
    try {
      const res = await fetch('/api/admin/backup-settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          enabled: backupSettings.enabled,
          intervalMinutes: backupSettings.intervalMinutes,
          folderUrl: backupSettings.folderUrl.trim(),
          oauthClientId: oauthClientIdInput.trim(),
          oauthClientSecret: oauthClientSecretInput.trim(),
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Failed to save backup settings');
      }

      setBackupSettings(data.backup);
      setOauthClientIdInput(data.backup.oauthClientId || '');
      setOauthClientSecretInput('');
      toast.success('Backup settings saved successfully');
    } catch (error: any) {
      toast.error(error.message || 'Failed to save backup settings');
    } finally {
      setBackupSaving(false);
    }
  };

  const handleStartBackup = async () => {
    setBackupStarting(true);
    const toastId = toast.loading('Starting backup worker...');
    autoTriggerInFlightRef.current = true;

    try {
      const res = await fetch('/api/admin/backup-run', {
        method: 'POST',
      });
      const data = await res.json();

      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Failed to start backup');
      }

      if (data.backup) {
        setBackupSettings(data.backup);
      }

      toast.success('Backup completed successfully', {
        id: toastId,
        description: data.backup?.lastBackupName || undefined,
      });
    } catch (error: any) {
      toast.error(error.message || 'Failed to start backup', { id: toastId });
    } finally {
      setBackupStarting(false);
      autoTriggerInFlightRef.current = false;
    }
  };

  const formatDateTime = (value: string) => {
    if (!value) return 'Not yet';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return value;
    return date.toLocaleString('en-IN', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });
  };

  const getTimeUntilNextPush = () => {
    if (backupSettings.workerRunning) {
      return '';
    }

    if (!backupSettings.enabled || !backupSettings.lastRunAt) {
      return '';
    }

    const lastRun = new Date(backupSettings.lastRunAt);
    if (Number.isNaN(lastRun.getTime())) {
      return '';
    }

    const nextRunAt = lastRun.getTime() + backupSettings.intervalMinutes * 60 * 1000;
    const remainingMs = nextRunAt - Date.now();

    if (remainingMs <= 0) {
      return 'Due now';
    }

    const totalSeconds = Math.floor(remainingMs / 1000);
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;

    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  };

  const isBackupDue = () => {
    if (!backupSettings.enabled || backupSettings.workerRunning || backupStarting) {
      return false;
    }

    if (!backupSettings.lastRunAt) {
      return true;
    }

    const lastRun = new Date(backupSettings.lastRunAt);
    if (Number.isNaN(lastRun.getTime())) {
      return true;
    }

    const nextRunAt = lastRun.getTime() + backupSettings.intervalMinutes * 60 * 1000;
    return Date.now() >= nextRunAt;
  };

  const phaseMeta: Record<string, { label: string; progress: number }> = {
    starting: { label: 'Starting backup worker...', progress: 10 },
    creating_sql_dump: { label: 'Creating SQL backup file...', progress: 35 },
    authorizing_google_drive: { label: 'Authorizing Google Drive...', progress: 55 },
    ensuring_backup_folder: { label: 'Preparing event-management-backups folder...', progress: 72 },
    uploading_backup_file: { label: 'Uploading backup file to Google Drive...', progress: 90 },
    finalizing: { label: 'Finalizing backup status...', progress: 98 },
    failed: { label: 'Backup failed', progress: 100 },
  };

  const activePhase = backupSettings.workerRunning ? phaseMeta[backupSettings.workerPhase] || phaseMeta.starting : null;

  useEffect(() => {
    if (!isBackupDue() || autoTriggerInFlightRef.current) {
      return;
    }

    autoTriggerInFlightRef.current = true;
    void handleStartBackup();
  }, [
    backupSettings.enabled,
    backupSettings.intervalMinutes,
    backupSettings.lastRunAt,
    backupSettings.workerRunning,
    backupStarting,
  ]);

  if (loading) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Settings</h1>
          <p className="mt-1 text-sm text-gray-500">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Settings</h1>
        <p className="mt-1 text-sm text-gray-500">Configure application-wide settings</p>
      </div>

      {/* QFIX Payment Link Section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <LinkIcon className="h-5 w-5 text-blue-600" />
            Default QFIX Payment Link
          </CardTitle>
          <CardDescription>
            Set the default QFIX payment link used for USD payments. When creating events with USD pricing,
            organizers can choose to use this default link or provide a custom one.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              QFIX Payment URL
            </label>
            <input
              type="url"
              value={defaultQfixLink}
              onChange={(e) => setDefaultQfixLink(e.target.value)}
              disabled={!isEditing}
              className={`w-full px-4 py-2.5 rounded-lg border bg-white transition-all ${
                isEditing 
                  ? 'border-blue-300 ring-2 ring-blue-100 text-gray-900' 
                  : 'border-gray-200 text-gray-500 cursor-not-allowed bg-gray-50'
              }`}
              placeholder="https://your-qfix-payment-link.com"
            />
            <p className="mt-1.5 text-xs text-gray-500">
              This link will be shown to users when they register for USD-priced events, unless the event has a custom link configured.
            </p>
          </div>

          {defaultQfixLink && (
            <div className="flex items-center gap-2 text-sm">
              <span className="text-gray-500">Current link:</span>
              <a
                href={defaultQfixLink}
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-600 hover:underline flex items-center gap-1 font-medium"
              >
                {defaultQfixLink.length > 60 ? defaultQfixLink.substring(0, 60) + '...' : defaultQfixLink}
                <ExternalLink className="w-3 h-3" />
              </a>
            </div>
          )}

          <div className="flex justify-end pt-2">
            {isEditing ? (
              <Button
                onClick={handleSave}
                disabled={saving}
                className="bg-blue-600 hover:bg-blue-700 text-white px-6 shadow-sm"
              >
                <Save className="w-4 h-4 mr-2" />
                {saving ? 'Saving...' : 'Save Settings'}
              </Button>
            ) : (
              <Button
                onClick={() => setIsEditing(true)}
                variant="outline"
                className="border-blue-600 text-blue-600 hover:bg-blue-50 px-6 font-medium"
              >
                <Settings className="w-4 h-4 mr-2" />
                Edit Link
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Help Section */}
      <Card className="border-l-4 border-l-blue-500 bg-blue-50">
        <CardContent className="p-4">
          <div className="flex items-start gap-3">
            <Settings className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" />
            <div>
              <p className="font-semibold text-gray-900 text-sm">How USD payments work</p>
              <ul className="mt-2 text-sm text-gray-600 space-y-1">
                <li>• When creating an event, choose USD as the currency</li>
                <li>• Users registering will see the QFIX payment link and must pay externally</li>
                <li>• Users must upload a screenshot/receipt as proof of payment</li>
                <li>• Registrations remain in "Pending Verification" until approved</li>
                <li>• Admins and organizers can approve/reject from the Payment Verification page</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ScanLine className="h-5 w-5 text-purple-600" />
            Attendance Scanner Mode
          </CardTitle>
          <CardDescription>
            Choose how the admin QR scanner behaves during check-in. Fast mode keeps the current instant flow. Slow mode uses the same scanner speed,
            but shows participant details first and only marks attendance after you tap the confirmation button.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-5">
          <div className="grid gap-4 md:grid-cols-2">
            <button
              type="button"
              onClick={() => setAttendanceScanMode('fast')}
              className={`rounded-2xl border p-5 text-left transition-all ${
                attendanceScanMode === 'fast'
                  ? 'border-purple-500 bg-purple-50 ring-2 ring-purple-100'
                  : 'border-gray-200 bg-white hover:border-purple-200 hover:bg-purple-50/40'
              }`}
            >
              <div className="flex items-start gap-3">
                <div className={`rounded-2xl p-3 ${attendanceScanMode === 'fast' ? 'bg-purple-600 text-white' : 'bg-gray-100 text-gray-600'}`}>
                  <Zap className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-base font-bold text-gray-900">Fast Scanning</p>
                  <p className="mt-1 text-sm text-gray-600">
                    As soon as a QR code is detected, attendance is marked immediately. This is the current instant lane for the fastest possible entry flow.
                  </p>
                </div>
              </div>
            </button>

            <button
              type="button"
              onClick={() => setAttendanceScanMode('slow')}
              className={`rounded-2xl border p-5 text-left transition-all ${
                attendanceScanMode === 'slow'
                  ? 'border-purple-500 bg-purple-50 ring-2 ring-purple-100'
                  : 'border-gray-200 bg-white hover:border-purple-200 hover:bg-purple-50/40'
              }`}
            >
              <div className="flex items-start gap-3">
                <div className={`rounded-2xl p-3 ${attendanceScanMode === 'slow' ? 'bg-purple-600 text-white' : 'bg-gray-100 text-gray-600'}`}>
                  <Eye className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-base font-bold text-gray-900">Slow Scanning</p>
                  <p className="mt-1 text-sm text-gray-600">
                    Uses the same camera scanner and speed, but after detection it opens a confirmation panel with participant details and `Mark Present` / `Cancel`.
                  </p>
                </div>
              </div>
            </button>
          </div>

          <div className="rounded-2xl border border-gray-100 bg-gray-50 p-4 text-sm text-gray-600">
            <p className="font-semibold text-gray-900">What changes and what stays the same</p>
            <ul className="mt-2 space-y-2">
              <li>Fast Scanning: no confirmation step, attendance is marked right after scan.</li>
              <li>Slow Scanning: the scanner stays the same, but marking attendance waits for your confirmation tap.</li>
              <li>This setting affects the admin attendance QR scanner only.</li>
            </ul>
          </div>

          <div className="flex justify-end">
            <Button
              onClick={handleSaveScanMode}
              disabled={scanModeSaving}
              className="bg-purple-600 hover:bg-purple-700 text-white px-6 shadow-sm"
            >
              <Save className="mr-2 h-4 w-4" />
              {scanModeSaving ? 'Saving Scanner Mode...' : 'Save Scanner Mode'}
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <HardDrive className="h-5 w-5 text-emerald-600" />
            Backup
          </CardTitle>
          <CardDescription>
            Configure automatic PostgreSQL SQL backups that are pushed into Google Drive. The backup worker creates a clearly named
            <span className="font-semibold text-gray-700"> event-management-backups </span>
            folder and stores timestamped SQL files inside it.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-8">
          <div className="grid gap-6 lg:grid-cols-2">
            <div className="space-y-4">
              <div className="flex items-center justify-between rounded-xl border border-emerald-100 bg-emerald-50 px-4 py-3">
                <div>
                  <p className="text-sm font-semibold text-gray-900">Automatic backup status</p>
                  <p className="text-xs text-gray-500">The external backup worker reads this setting and decides when a backup is due.</p>
                </div>
                <button
                  type="button"
                  onClick={() => setBackupSettings((prev) => ({ ...prev, enabled: !prev.enabled }))}
                  className={`relative inline-flex h-7 w-14 items-center rounded-full transition-colors ${backupSettings.enabled ? 'bg-emerald-500' : 'bg-gray-300'}`}
                >
                  <span
                    className={`inline-block h-5 w-5 transform rounded-full bg-white transition-transform ${backupSettings.enabled ? 'translate-x-8' : 'translate-x-1'}`}
                  />
                </button>
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-gray-700">Backup interval in minutes</label>
                <input
                  type="number"
                  min={1}
                  max={10080}
                  step={1}
                  value={backupSettings.intervalMinutes}
                  onChange={(e) => setBackupSettings((prev) => ({ ...prev, intervalMinutes: Number(e.target.value || 30) }))}
                  className="w-full rounded-lg border border-gray-200 bg-white px-4 py-2.5 text-gray-900 ring-0 transition focus:border-emerald-300 focus:outline-none focus:ring-2 focus:ring-emerald-100"
                />
                <p className="mt-1.5 text-xs text-gray-500">
                  Example: set `30` for every 30 minutes. Schedule the worker itself every 5 minutes and it will honor this interval.
                </p>
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-gray-700">Google Drive folder URL (optional)</label>
                <input
                  type="url"
                  value={backupSettings.folderUrl}
                  onChange={(e) => setBackupSettings((prev) => ({ ...prev, folderUrl: e.target.value }))}
                  className="w-full rounded-lg border border-gray-200 bg-white px-4 py-2.5 text-gray-900 ring-0 transition focus:border-emerald-300 focus:outline-none focus:ring-2 focus:ring-emerald-100"
                  placeholder="https://drive.google.com/drive/folders/your-folder-id"
                />
                <p className="mt-1.5 text-xs text-gray-500">
                  If you provide a specific folder URL, the backup worker will create or reuse the
                  <span className="font-semibold text-gray-700"> event-management-backups </span>
                  folder inside that location. If left blank, it will use the Google Drive root of the connected account.
                </p>
              </div>

              <div className="rounded-xl border border-gray-100 bg-gray-50 p-4 text-sm text-gray-600">
                <div className="flex items-start gap-3">
                  <Clock3 className="mt-0.5 h-5 w-5 text-emerald-600" />
                  <div>
                    <p className="font-semibold text-gray-900">Recommended always-on backup command</p>
                    <code className="mt-2 block rounded-lg bg-gray-900 px-3 py-2 text-xs text-emerald-200">npm run backup:daemon</code>
                    <p className="mt-2 text-xs text-gray-500">
                      Run this on an always-on server process such as PM2, Windows Task Scheduler, NSSM, or a system service. The daemon keeps checking the saved admin interval and automatically starts a backup when it is due.
                    </p>
                  </div>
                </div>
              </div>

              <div className="flex flex-wrap justify-end gap-3">
                <Button
                  onClick={handleStartBackup}
                  disabled={backupStarting}
                  variant="outline"
                  className="border-emerald-600 text-emerald-700 hover:bg-emerald-50 px-6 font-medium"
                >
                  <PlayCircle className="mr-2 h-4 w-4" />
                  {backupStarting ? 'Starting Backup...' : 'Start Backup'}
                </Button>
                <Button
                  onClick={handleSaveBackupSettings}
                  disabled={backupSaving}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white px-6 shadow-sm"
                >
                  <Save className="mr-2 h-4 w-4" />
                  {backupSaving ? 'Saving...' : 'Save Backup Settings'}
                </Button>
              </div>
            </div>

            <div className="space-y-4">
              <div className="rounded-2xl border border-sky-100 bg-sky-50 p-4">
                <div className="flex items-start gap-3">
                  <CloudUpload className="mt-0.5 h-5 w-5 text-sky-600" />
                  <div className="space-y-1">
                    <p className="text-sm font-semibold text-gray-900">Google Drive personal account</p>
                    {backupSettings.hasDriveConnection ? (
                      <p className="text-sm text-gray-600">
                        Connected as <span className="font-semibold text-gray-800">{backupSettings.driveAccountEmail}</span>
                      </p>
                    ) : (
                      <p className="text-sm text-gray-600">No Google Drive account connected yet.</p>
                    )}
                    <p className="text-xs text-gray-500">
                      Save your Google OAuth app credentials, then connect your personal Google Drive account. The backup worker will upload using your Drive quota.
                    </p>
                  </div>
                </div>
              </div>

              <div className={`rounded-2xl border p-4 ${backupSettings.daemonRunning ? 'border-emerald-100 bg-emerald-50' : 'border-amber-100 bg-amber-50'}`}>
                <div className="flex items-start gap-3">
                  <ShieldCheck className={`mt-0.5 h-5 w-5 ${backupSettings.daemonRunning ? 'text-emerald-600' : 'text-amber-600'}`} />
                  <div className="space-y-1">
                    <p className="text-sm font-semibold text-gray-900">Backup daemon status</p>
                    <p className={`text-sm font-medium ${backupSettings.daemonRunning ? 'text-emerald-700' : 'text-amber-700'}`}>
                      {backupSettings.daemonRunning ? 'Running' : 'Offline'}
                    </p>
                    <p className="text-xs text-gray-500">
                      Last heartbeat: {formatDateTime(backupSettings.daemonHeartbeatAt)}
                    </p>
                    {backupSettings.daemonStartedAt && (
                      <p className="text-xs text-gray-500">
                        Started at: {formatDateTime(backupSettings.daemonStartedAt)}
                      </p>
                    )}
                    <p className="text-xs text-gray-500">
                      Start it on the server with <span className="font-semibold text-gray-700">npm run backup:daemon</span>.
                    </p>
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="mb-2 block text-sm font-medium text-gray-700">Google OAuth Client ID</label>
                  <input
                    type="text"
                    value={oauthClientIdInput}
                    onChange={(e) => setOauthClientIdInput(e.target.value)}
                    className="w-full rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm text-gray-900 ring-0 transition focus:border-sky-300 focus:outline-none focus:ring-2 focus:ring-sky-100"
                    placeholder="1234567890-xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx.apps.googleusercontent.com"
                  />
                </div>
                <div>
                  <label className="mb-2 block text-sm font-medium text-gray-700">Google OAuth Client Secret</label>
                  <input
                    type="password"
                    value={oauthClientSecretInput}
                    onChange={(e) => setOauthClientSecretInput(e.target.value)}
                    className="w-full rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm text-gray-900 ring-0 transition focus:border-sky-300 focus:outline-none focus:ring-2 focus:ring-sky-100"
                    placeholder={backupSettings.hasOAuthClientSecret ? 'Saved in backup settings. Paste only if you want to replace it.' : 'GOCSPX-...'}
                  />
                  <p className="mt-1.5 text-xs text-gray-500">
                    Add this exact redirect URI in Google Cloud:{' '}
                    <span className="font-semibold text-gray-700">
                      {oauthRedirectUri || '/api/admin/backup-drive/callback'}
                    </span>
                  </p>
                </div>
              </div>

              <div className="flex flex-wrap justify-end gap-3">
                <Button
                  onClick={handleSaveBackupSettings}
                  disabled={backupSaving}
                  variant="outline"
                  className="border-sky-600 text-sky-700 hover:bg-sky-50 px-6 font-medium"
                >
                  <Save className="mr-2 h-4 w-4" />
                  {backupSaving ? 'Saving OAuth App...' : 'Save OAuth App'}
                </Button>
                <Button
                  onClick={() => {
                    const connectUrl = new URL('/api/admin/backup-drive/connect', window.location.origin);
                    connectUrl.searchParams.set('origin', window.location.origin);
                    window.location.href = connectUrl.toString();
                  }}
                  disabled={!backupSettings.oauthClientId || !backupSettings.hasOAuthClientSecret}
                  className="bg-sky-600 hover:bg-sky-700 text-white px-6 shadow-sm"
                >
                  <CloudUpload className="mr-2 h-4 w-4" />
                  Connect Google Drive
                </Button>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="rounded-xl border border-gray-100 bg-gray-50 p-4">
                  <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">Last successful backup</p>
                  <p className="mt-2 text-sm font-medium text-gray-900">{formatDateTime(backupSettings.lastRunAt)}</p>
                </div>
                <div className="rounded-xl border border-gray-100 bg-gray-50 p-4">
                  <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">Last backup file</p>
                  <p className="mt-2 break-all text-sm font-medium text-gray-900">{backupSettings.lastBackupName || 'Not yet'}</p>
                </div>
              </div>

              <div className="rounded-xl border border-purple-100 bg-purple-50 p-4">
                <div className="flex items-start gap-3">
                  <Clock3 className="mt-0.5 h-5 w-5 text-purple-600" />
                  <div>
                    <p className="text-sm font-semibold text-gray-900">Next scheduled push</p>
                    {activePhase ? (
                      <div className="mt-2 space-y-3">
                        <div className="flex items-center justify-between gap-4">
                          <p className="text-base font-bold tracking-wide text-emerald-700">{activePhase.label}</p>
                          <span className="text-sm font-semibold text-emerald-600">{activePhase.progress}%</span>
                        </div>
                        <div className="h-3 w-full overflow-hidden rounded-full bg-emerald-100">
                          <div
                            className="h-full rounded-full bg-gradient-to-r from-emerald-500 via-green-400 to-teal-500 transition-all duration-700"
                            style={{ width: `${activePhase.progress}%` }}
                          />
                        </div>
                        <p className="text-xs text-gray-500">
                          Backup is running in the background. The timer will start again once the SQL file is uploaded.
                        </p>
                      </div>
                    ) : (
                      <>
                        <p className="mt-1 text-lg font-bold tracking-wide text-purple-700">{timeUntilNextPush || 'Waiting for first successful backup'}</p>
                        <p className="mt-1 text-xs text-gray-500">
                          Countdown is based on the last successful backup time plus the configured interval.
                        </p>
                      </>
                    )}
                  </div>
                </div>
              </div>

              <div className={`rounded-xl border p-4 ${backupSettings.lastStatus === 'FAILED' ? 'border-red-200 bg-red-50' : 'border-emerald-100 bg-emerald-50'}`}>
                <div className="flex items-start gap-3">
                  <ShieldCheck className={`mt-0.5 h-5 w-5 ${backupSettings.lastStatus === 'FAILED' ? 'text-red-600' : 'text-emerald-600'}`} />
                  <div>
                    <p className="text-sm font-semibold text-gray-900">Last worker status</p>
                    <p className="mt-1 text-sm text-gray-700">{backupSettings.lastStatus || 'No runs yet'}</p>
                    {backupSettings.lastError && (
                      <p className="mt-2 text-xs text-red-600">{backupSettings.lastError}</p>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
