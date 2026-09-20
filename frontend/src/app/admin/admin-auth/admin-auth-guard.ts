import { inject } from "@angular/core";
import { Router } from "@angular/router";
import type { CanMatchFn, UrlSegment } from "@angular/router";
import { AdminAuth } from "./admin-auth";

// Protects the parent /admin route, including every route beneath it.
export const adminAuthGuard: CanMatchFn = async (_route, segments) => {
  const auth = inject(AdminAuth);

  if (await auth.isAuthenticated()) {
    return true;
  }

  const router = inject(Router);
  const returnUrl = buildReturnUrl(segments);

  return router.createUrlTree(["/admin"], {
    queryParams: returnUrl === "/admin" ? {} : { returnUrl }
  });
};

function buildReturnUrl(segments: UrlSegment[]): string {
  const path = segments.map(segment => segment.toString()).join("/");

  return path ? `/${path}` : "/admin";
}
