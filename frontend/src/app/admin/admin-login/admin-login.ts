import { ChangeDetectionStrategy, Component, inject, signal } from "@angular/core";
import { CommonModule } from "@angular/common";
import { FormsModule } from "@angular/forms";
import { ActivatedRoute, Router } from "@angular/router";
import { DocumentPublishError } from "../editor/document-publish-api";
import { AdminAuth } from "../admin-auth/admin-auth";

@Component({
  selector: "app-admin-login",
  imports: [CommonModule, FormsModule],
  templateUrl: "./admin-login.html",
  styleUrl: "./admin-login.scss",
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AdminLogin {
  readonly username = signal("");
  readonly password = signal("");
  readonly submitting = signal(false);
  readonly errorMessage = signal<string | null>(null);

  private readonly auth = inject(AdminAuth);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);

  async submit(): Promise<void> {
    if (this.submitting()) {
      return;
    }

    const username = this.username().trim();
    const password = this.password();

    if (!username || !password) {
      this.errorMessage.set("Ingresá tu usuario y contraseña.");
      return;
    }

    this.submitting.set(true);
    this.errorMessage.set(null);

    try {
      await this.auth.login(username, password);
      const navigated = await this.router.navigateByUrl(
  this.destinationUrl(),
  {
    replaceUrl: true,
    onSameUrlNavigation: "reload"
  }
);

if (!navigated) {
  throw new Error("No se pudo abrir el panel de administración.");
}
    } catch (error) {
      this.errorMessage.set(this.messageFor(error));
    } finally {
      this.submitting.set(false);
    }
  }

  private destinationUrl(): string {
    const returnUrl = this.route.snapshot.queryParamMap.get("returnUrl");

    if (
      returnUrl === "/admin" ||
      returnUrl?.startsWith("/admin/") ||
      returnUrl?.startsWith("/admin?")
    ) {
      return returnUrl;
    }

    return "/admin";
  }

  private messageFor(error: unknown): string {
    if (error instanceof DocumentPublishError && error.status === 401) {
      return "Usuario o contraseña incorrectos.";
    }

    if (error instanceof Error && error.message) {
      return error.message;
    }

    return "No se pudo iniciar sesión. Intentá nuevamente.";
  }
}
