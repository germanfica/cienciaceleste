import { inject } from "@angular/core";
import type { CanMatchFn } from "@angular/router";
import { AdminAuth } from "./admin-auth";

// This is a guest-only route. Returning false lets Angular try the protected
// /admin route declared immediately after it.
export const adminLoginGuard: CanMatchFn = async () => {
  const auth = inject(AdminAuth);

  return !(await auth.isAuthenticated());
};
