import { DOCUMENT } from "@angular/common";
import { Inject, Injectable } from "@angular/core";
import type { EditorWriteRequest } from "../editor-export-json/editor-export-json";
import type { DocumentType } from "../../doc-viewer/doc-types";

export type PublishJobStatus = "queued" | "running" | "succeeded" | "failed";

export type PublishJob = {
  id: string;
  documentType: DocumentType;
  status: PublishJobStatus;
  createdAt: number;
  startedAt: number | null;
  finishedAt: number | null;
  output: string | null;
  error: string | null;
};

type ApiError = { error?: unknown };
type QueueResponse = { job?: PublishJob };
type JobResponse = { job?: PublishJob };

export type AdminSession = {
  user: { username: string };
  expiresAt: number;
};

export class DocumentPublishError extends Error {
  constructor(message: string, readonly status: number) {
    super(message);
    this.name = "DocumentPublishError";
  }
}

@Injectable({ providedIn: "root" })
export class DocumentPublishApi {
  private readonly baseUrl: string;

  constructor(@Inject(DOCUMENT) private readonly document: Document) {
    const configured = this.document.documentElement.dataset["apiBaseUrl"]?.trim();
    const local = this.document.location.hostname === "localhost" || this.document.location.hostname === "127.0.0.1";

    // In production, serve Angular and /api/v1 behind the same HTTPS proxy. A
    // data-api-base-url attribute can override this for a separate admin host.
    this.baseUrl = configured || (local ? "http://localhost:3000/api/v1" : "/api/v1");
  }

  async login(username: string, password: string): Promise<AdminSession> {
    const session = await this.fetchJson<AdminSession>(`${this.baseUrl}/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username, password })
    });

    if (!session.user || typeof session.user.username !== "string" || !Number.isFinite(session.expiresAt)) {
      throw new DocumentPublishError("La API no devolvió una sesión válida.", 500);
    }

    return session;
  }

  async currentSession(): Promise<AdminSession> {
    const session = await this.fetchJson<AdminSession>(`${this.baseUrl}/auth/me`);

    if (!session.user || typeof session.user.username !== "string" || !Number.isFinite(session.expiresAt)) {
      throw new DocumentPublishError("La API no devolvió una sesión válida.", 500);
    }

    return session;
  }

  async logout(): Promise<void> {
    const csrfToken = this.csrfToken();

    if (!csrfToken) {
      return;
    }

    await this.fetchJson<unknown>(`${this.baseUrl}/auth/logout`, {
      method: "POST",
      headers: { "X-CSRF-Token": csrfToken }
    });
  }

  async queue(documentType: DocumentType, request: EditorWriteRequest): Promise<PublishJob> {
    const csrfToken = this.csrfToken();

    if (!csrfToken) {
      throw new DocumentPublishError("Iniciá sesión antes de guardar cambios.", 401);
    }

    const data = await this.fetchJson<QueueResponse>(`${this.baseUrl}/documents/${documentType}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-CSRF-Token": csrfToken
      },
      body: JSON.stringify(request)
    });

    if (!data.job) {
      throw new DocumentPublishError("La API no devolvió el trabajo de publicación.", 500);
    }

    return data.job;
  }

  async getJob(jobId: string): Promise<PublishJob> {
    const data = await this.fetchJson<JobResponse>(`${this.baseUrl}/jobs/${encodeURIComponent(jobId)}`);

    if (!data.job) {
      throw new DocumentPublishError("La API no devolvió el estado del trabajo.", 500);
    }

    return data.job;
  }

  async waitForCompletion(
    job: PublishJob,
    onStatus: (job: PublishJob) => void,
    timeoutMs = 2 * 60 * 60 * 1_000
  ): Promise<PublishJob> {
    const deadline = Date.now() + timeoutMs;
    let current = job;

    onStatus(current);

    while (current.status === "queued" || current.status === "running") {
      if (Date.now() >= deadline) {
        throw new DocumentPublishError("La publicación tardó demasiado. Revisá el estado del servidor.", 504);
      }

      await this.delay(1_000);
      current = await this.getJob(current.id);
      onStatus(current);
    }

    if (current.status === "failed") {
      throw new DocumentPublishError(current.error || "El pipeline no pudo publicar los cambios.", 500);
    }

    return current;
  }

  private async fetchJson<T>(url: string, init: RequestInit = {}): Promise<T> {
    let response: Response;

    try {
      response = await fetch(url, {
        ...init,
        credentials: "include",
        headers: {
          Accept: "application/json",
          ...init.headers
        }
      });
    } catch {
      throw new DocumentPublishError("No se pudo conectar con la API de publicación.", 0);
    }

    const body = await this.readBody(response);

    if (!response.ok) {
      const message = typeof (body as ApiError | null)?.error === "string"
        ? (body as ApiError).error as string
        : "La API rechazó la solicitud.";
      throw new DocumentPublishError(message, response.status);
    }

    return body as T;
  }

  private async readBody(response: Response): Promise<unknown> {
    try {
      return await response.json();
    } catch {
      return null;
    }
  }

  private csrfToken(): string | null {
    const match = this.document.cookie.match(/(?:^|;\s*)cc_csrf=([^;]+)/);

    if (!match?.[1]) {
      return null;
    }

    try {
      return decodeURIComponent(match[1]);
    } catch {
      return null;
    }
  }

  private delay(milliseconds: number): Promise<void> {
    return new Promise(resolve => window.setTimeout(resolve, milliseconds));
  }
}
