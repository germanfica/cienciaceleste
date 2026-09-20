import { createHash, randomUUID } from "node:crypto";
import { chmodSync, existsSync, mkdirSync } from "node:fs";
import { dirname } from "node:path";
import { DatabaseSync } from "node:sqlite";
import type { DocumentType, JobRecord, JobStatus, PublicJob } from "./types.js";
import { hashPassword } from "./password.js";

export type UserRecord = {
  id: string;
  username: string;
  passwordHash: string;
  createdAt: number;
};

export type SessionRecord = {
  id: string;
  userId: string;
  username: string;
  csrfTokenHash: string;
  expiresAt: number;
};

export class ActiveJobConflictError extends Error {
  readonly statusCode = 409;

  constructor() {
    super("Ya hay un guardado pendiente para este documento.");
    this.name = "ActiveJobConflictError";
  }
}

type UserRow = {
  id: string;
  username: string;
  password_hash: string;
  created_at: number;
};

type SessionRow = {
  id: string;
  user_id: string;
  username: string;
  csrf_token_hash: string;
  expires_at: number;
};

type JobRow = {
  id: string;
  user_id: string;
  document_type: DocumentType;
  request_json: string;
  status: JobStatus;
  created_at: number;
  started_at: number | null;
  finished_at: number | null;
  output: string | null;
  error_text: string | null;
};

export function hashOpaqueToken(token: string): string {
  return createHash("sha256").update(token).digest("base64url");
}

function rowToUser(row: UserRow): UserRecord {
  return {
    id: row.id,
    username: row.username,
    passwordHash: row.password_hash,
    createdAt: row.created_at
  };
}

function rowToSession(row: SessionRow): SessionRecord {
  return {
    id: row.id,
    userId: row.user_id,
    username: row.username,
    csrfTokenHash: row.csrf_token_hash,
    expiresAt: row.expires_at
  };
}

function rowToJob(row: JobRow): JobRecord {
  return {
    id: row.id,
    userId: row.user_id,
    documentType: row.document_type,
    requestJson: row.request_json,
    status: row.status,
    createdAt: row.created_at,
    startedAt: row.started_at,
    finishedAt: row.finished_at,
    output: row.output,
    error: row.error_text
  };
}

export function toPublicJob(job: JobRecord): PublicJob {
  const { userId: _userId, requestJson: _requestJson, ...publicJob } = job;
  return publicJob;
}

export class Repository {
  private readonly db: DatabaseSync;

  constructor(databasePath: string) {
    mkdirSync(dirname(databasePath), { recursive: true, mode: 0o700 });
    const isNewDatabase = !existsSync(databasePath);
    this.db = new DatabaseSync(databasePath, { timeout: 5_000 });

    if (isNewDatabase) {
      chmodSync(databasePath, 0o600);
    }

    this.db.exec(`
      PRAGMA foreign_keys = ON;
      PRAGMA journal_mode = WAL;
      PRAGMA synchronous = NORMAL;
      PRAGMA trusted_schema = OFF;
    `);
    this.migrate();
  }

  close(): void {
    this.db.close();
  }

  private migrate(): void {
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS users (
        id TEXT PRIMARY KEY,
        username TEXT NOT NULL COLLATE NOCASE UNIQUE,
        password_hash TEXT NOT NULL,
        created_at INTEGER NOT NULL,
        updated_at INTEGER NOT NULL
      ) STRICT;

      CREATE TABLE IF NOT EXISTS sessions (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        token_hash TEXT NOT NULL UNIQUE,
        csrf_token_hash TEXT NOT NULL,
        created_at INTEGER NOT NULL,
        last_seen_at INTEGER NOT NULL,
        expires_at INTEGER NOT NULL,
        revoked_at INTEGER
      ) STRICT;

      CREATE INDEX IF NOT EXISTS sessions_active_idx
        ON sessions(token_hash, expires_at)
        WHERE revoked_at IS NULL;

      CREATE TABLE IF NOT EXISTS publish_jobs (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
        document_type TEXT NOT NULL CHECK (document_type IN ('rollo', 'minirollo', 'ley')),
        document_key TEXT NOT NULL,
        request_json TEXT NOT NULL,
        status TEXT NOT NULL CHECK (status IN ('queued', 'running', 'succeeded', 'failed')),
        created_at INTEGER NOT NULL,
        started_at INTEGER,
        finished_at INTEGER,
        output TEXT,
        error_text TEXT
      ) STRICT;

      CREATE INDEX IF NOT EXISTS publish_jobs_queue_idx
        ON publish_jobs(status, created_at);

      CREATE INDEX IF NOT EXISTS publish_jobs_active_document_idx
        ON publish_jobs(document_key, status);

      CREATE TABLE IF NOT EXISTS audit_events (
        id TEXT PRIMARY KEY,
        user_id TEXT REFERENCES users(id) ON DELETE SET NULL,
        action TEXT NOT NULL,
        job_id TEXT REFERENCES publish_jobs(id) ON DELETE SET NULL,
        ip_address TEXT,
        details_json TEXT NOT NULL,
        created_at INTEGER NOT NULL
      ) STRICT;

      CREATE INDEX IF NOT EXISTS audit_events_created_idx
        ON audit_events(created_at DESC);
    `);
  }

  async ensureBootstrapUser(username: string, password: string): Promise<void> {
    const existing = this.db
      .prepare("SELECT id, username, password_hash, created_at FROM users WHERE username = ?")
      .get(username) as UserRow | undefined;

    if (existing) {
      return;
    }

    const now = Date.now();
    const passwordHash = await hashPassword(password);
    this.db
      .prepare(`
        INSERT INTO users (id, username, password_hash, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?)
      `)
      .run(randomUUID(), username, passwordHash, now, now);
  }

  findUserByUsername(username: string): UserRecord | null {
    const row = this.db
      .prepare("SELECT id, username, password_hash, created_at FROM users WHERE username = ?")
      .get(username) as UserRow | undefined;

    return row ? rowToUser(row) : null;
  }

  createSession(userId: string, tokenHash: string, csrfTokenHash: string, expiresAt: number): void {
    const now = Date.now();
    this.db
      .prepare(`
        INSERT INTO sessions (
          id, user_id, token_hash, csrf_token_hash, created_at, last_seen_at, expires_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?)
      `)
      .run(randomUUID(), userId, tokenHash, csrfTokenHash, now, now, expiresAt);
  }

  findActiveSession(tokenHash: string): SessionRecord | null {
    const now = Date.now();
    const row = this.db
      .prepare(`
        SELECT s.id, s.user_id, u.username, s.csrf_token_hash, s.expires_at
        FROM sessions AS s
        JOIN users AS u ON u.id = s.user_id
        WHERE s.token_hash = ?
          AND s.revoked_at IS NULL
          AND s.expires_at > ?
      `)
      .get(tokenHash, now) as SessionRow | undefined;

    if (!row) {
      return null;
    }

    this.db.prepare("UPDATE sessions SET last_seen_at = ? WHERE id = ?").run(now, row.id);
    return rowToSession(row);
  }

  revokeSession(tokenHash: string): void {
    this.db
      .prepare("UPDATE sessions SET revoked_at = ? WHERE token_hash = ? AND revoked_at IS NULL")
      .run(Date.now(), tokenHash);
  }

  pruneExpiredSessions(): void {
    this.db
      .prepare("DELETE FROM sessions WHERE expires_at <= ? OR revoked_at IS NOT NULL")
      .run(Date.now());
  }

  createJob(
    userId: string,
    documentType: DocumentType,
    documentKey: string,
    requestJson: string
  ): JobRecord {
    const active = this.db
      .prepare(`
        SELECT id
        FROM publish_jobs
        WHERE document_key = ? AND status IN ('queued', 'running')
        LIMIT 1
      `)
      .get(documentKey) as { id: string } | undefined;

    if (active) {
      throw new ActiveJobConflictError();
    }

    const job: JobRecord = {
      id: randomUUID(),
      userId,
      documentType,
      requestJson,
      status: "queued",
      createdAt: Date.now(),
      startedAt: null,
      finishedAt: null,
      output: null,
      error: null
    };

    this.db
      .prepare(`
        INSERT INTO publish_jobs (
          id, user_id, document_type, document_key, request_json, status, created_at,
          started_at, finished_at, output, error_text
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `)
      .run(
        job.id,
        job.userId,
        job.documentType,
        documentKey,
        job.requestJson,
        job.status,
        job.createdAt,
        job.startedAt,
        job.finishedAt,
        job.output,
        job.error
      );

    return job;
  }

  getJobForUser(id: string, userId: string): JobRecord | null {
    const row = this.db
      .prepare(`
        SELECT id, user_id, document_type, request_json, status, created_at,
               started_at, finished_at, output, error_text
        FROM publish_jobs
        WHERE id = ? AND user_id = ?
      `)
      .get(id, userId) as JobRow | undefined;

    return row ? rowToJob(row) : null;
  }

  claimNextQueuedJob(): JobRecord | null {
    let transactionOpen = false;

    try {
      this.db.exec("BEGIN IMMEDIATE");
      transactionOpen = true;

      const row = this.db
        .prepare(`
          SELECT id, user_id, document_type, request_json, status, created_at,
                 started_at, finished_at, output, error_text
          FROM publish_jobs
          WHERE status = 'queued'
          ORDER BY created_at ASC
          LIMIT 1
        `)
        .get() as JobRow | undefined;

      if (!row) {
        this.db.exec("COMMIT");
        transactionOpen = false;
        return null;
      }

      const startedAt = Date.now();
      const result = this.db
        .prepare(`
          UPDATE publish_jobs
          SET status = 'running', started_at = ?, finished_at = NULL,
              output = NULL, error_text = NULL
          WHERE id = ? AND status = 'queued'
        `)
        .run(startedAt, row.id);

      if (result.changes !== 1) {
        this.db.exec("ROLLBACK");
        transactionOpen = false;
        return null;
      }

      this.db.exec("COMMIT");
      transactionOpen = false;

      return {
        ...rowToJob(row),
        status: "running",
        startedAt,
        finishedAt: null,
        output: null,
        error: null
      };
    } catch (error) {
      if (transactionOpen) {
        this.db.exec("ROLLBACK");
      }

      throw error;
    }
  }

  markJobSucceeded(id: string, output: string): void {
    this.db
      .prepare(`
        UPDATE publish_jobs
        SET status = 'succeeded', finished_at = ?, output = ?, error_text = NULL,
            request_json = ''
        WHERE id = ? AND status = 'running'
      `)
      .run(Date.now(), output, id);
  }

  markJobFailed(id: string, errorText: string, output: string): void {
    this.db
      .prepare(`
        UPDATE publish_jobs
        SET status = 'failed', finished_at = ?, output = ?, error_text = ?,
            request_json = ''
        WHERE id = ? AND status = 'running'
      `)
      .run(Date.now(), output, errorText, id);
  }

  failInterruptedJobs(): void {
    const now = Date.now();
    this.db
      .prepare(`
        UPDATE publish_jobs
        SET status = 'failed', finished_at = ?,
            error_text = 'La API se reinició mientras este trabajo estaba en ejecución.',
            request_json = ''
        WHERE status = 'running'
      `)
      .run(now);
  }

  addAudit(
    action: string,
    options: { userId?: string; jobId?: string; ipAddress?: string; details?: Record<string, unknown> } = {}
  ): void {
    this.db
      .prepare(`
        INSERT INTO audit_events (id, user_id, action, job_id, ip_address, details_json, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `)
      .run(
        randomUUID(),
        options.userId ?? null,
        action,
        options.jobId ?? null,
        options.ipAddress ?? null,
        JSON.stringify(options.details ?? {}),
        Date.now()
      );
  }
}
