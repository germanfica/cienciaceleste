import { Injectable, inject } from "@angular/core";
import {
  DocumentPublishApi,
  DocumentPublishError,
} from "../editor/document-publish-api";
import type { AdminSession } from "../editor/document-publish-api";

@Injectable({ providedIn: "root" })
export class AdminAuth {
  private readonly api = inject(DocumentPublishApi);

  // A valid session is reused while navigating inside /admin. An anonymous
  // result is deliberately not cached, so a later successful login is picked
  // up without requiring a page reload.
  private cachedSession: AdminSession | null = null;
  private sessionRequest: Promise<AdminSession | null> | null = null;

  async isAuthenticated(): Promise<boolean> {
    try {
      return (await this.currentSession()) !== null;
    } catch {
      // Route guards fail closed if the API is unavailable or returns an
      // unexpected response. The login page can then show the API error.
      return false;
    }
  }

  async login(username: string, password: string): Promise<AdminSession> {
    const session = await this.api.login(username, password);
    this.cachedSession = session;
    return session;
  }

  async logout(): Promise<void> {
    await this.api.logout();
    this.cachedSession = null;
  }

  private async currentSession(): Promise<AdminSession | null> {
    if (this.hasValidCachedSession()) {
      return this.cachedSession;
    }

    if (this.sessionRequest) {
      return this.sessionRequest;
    }

    const request = this.api.currentSession()
      .then(session => {
        this.cachedSession = session;
        return session;
      })
      .catch(error => {
        if (error instanceof DocumentPublishError && error.status === 401) {
          this.cachedSession = null;
          return null;
        }

        throw error;
      })
      .finally(() => {
        this.sessionRequest = null;
      });

    this.sessionRequest = request;
    return request;
  }

  private hasValidCachedSession(): boolean {
    return this.cachedSession !== null && this.cachedSession.expiresAt > Date.now();
  }
}
