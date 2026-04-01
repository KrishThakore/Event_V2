import { v4 as uuidv4 } from 'uuid';

type SessionType = 'form_filling' | 'razorpay';

interface ActiveSession {
  lastSeen: number;
  type: SessionType;
}

class LiveStatsManager {
  private sessions: Map<string, ActiveSession> = new Map();
  private intervalId: NodeJS.Timeout | null = null;
  private readonly cleanupIntervalMs = process.env.NODE_ENV === 'production' ? 60_000 : 30_000;
  private readonly sessionTimeoutMs = process.env.NODE_ENV === 'production' ? 90_000 : 45_000;

  constructor() {
    if (typeof window === 'undefined') {
      this.startLogging();
    }
  }

  public heartbeat(sessionId: string, type: SessionType) {
    this.sessions.set(sessionId, {
      lastSeen: Date.now(),
      type
    });
  }

  private startLogging() {
    if (this.intervalId) return;

    this.intervalId = setInterval(() => {
      this.cleanup();
      this.printStats();
    }, this.cleanupIntervalMs);
  }

  private cleanup() {
    const now = Date.now();
    for (const [id, session] of this.sessions.entries()) {
      if (now - session.lastSeen > this.sessionTimeoutMs) {
        this.sessions.delete(id);
      }
    }
  }

  private printStats() {
    let formFilling = 0;
    let razorpay = 0;

    for (const session of this.sessions.values()) {
      if (session.type === 'form_filling') formFilling++;
      if (session.type === 'razorpay') razorpay++;
    }

    const timestamp = new Date().toLocaleTimeString();
    if (formFilling > 0 || razorpay > 0) {
        console.log(`📊 [LIVE_STATS] ${timestamp} | Users Filling Forms: ${formFilling} | Users on Razorpay: ${razorpay}`);
    } else if (process.env.NODE_ENV !== 'production') {
        console.log(`📊 [LIVE_STATS] ${timestamp} | System Idle (0 active payment flows)`);
    }
  }
}

const globalForStats = globalThis as unknown as {
  liveStatsManager: LiveStatsManager | undefined
}

export const liveStatsManager =
  globalForStats.liveStatsManager ?? new LiveStatsManager();

if (process.env.NODE_ENV !== 'production') globalForStats.liveStatsManager = liveStatsManager;
