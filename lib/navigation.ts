import { router, type Href } from 'expo-router';

/**
 * Go back, or land somewhere sensible when there is no history.
 *
 * `router.back()` throws "The action 'GO_BACK' was not handled by any
 * navigator" whenever the current screen is the first entry in the stack. That
 * happens more often than it looks:
 *
 *   - opening a deep link straight to a screen (`dewly://timings`)
 *   - arriving via `router.replace(...)`, which leaves nothing behind
 *   - a cold start restored onto a non-root route
 *
 * Every Back / Cancel control should route through this instead of calling
 * `router.back()` directly, so the fallback is a deliberate parent screen
 * rather than a crash.
 */
export function goBackOr(fallback: Href): void {
  if (router.canGoBack()) {
    router.back();
    return;
  }
  router.replace(fallback);
}
