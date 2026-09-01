import { Alert, Platform, type AlertButton } from 'react-native';

/**
 * `Alert.alert` that also works in a browser.
 *
 * ## Why this exists
 *
 * react-native-web ships `Alert` as a literal no-op:
 *
 *   class Alert { static alert() {} }
 *
 * It does not throw and it does not warn — the call simply returns and none of
 * the buttons' `onPress` handlers ever run. Every confirmation in the app is
 * built as "ask, then act in `onPress`", so on web that silently disabled:
 *
 *   - Profile -> Sign out
 *   - Profile -> Reset onboarding
 *   - Shelf -> remove a product
 *
 * and swallowed every failure message (`product.tsx` save, onboarding save,
 * shelf delete, the source-link fallback in `TimingEvidence`). Buttons that do
 * nothing at all, with no error anywhere.
 *
 * ## Mapping to the browser
 *
 * One button (or none) is a message, so it becomes `window.alert`. Two or more
 * is a decision, so it becomes `window.confirm`: OK runs the action, Cancel
 * runs the `style: 'cancel'` handler if there is one. That is a narrower model
 * than `Alert` — no third option, no button labels — but every call site in
 * this app is either a message or a cancel/confirm pair, and a native browser
 * dialog is honest about being a browser.
 *
 * Native is untouched: it delegates straight to `Alert.alert` with the same
 * arguments, so iOS and Android behaviour is unchanged.
 */
export function showAlert(title: string, message?: string, buttons?: AlertButton[]): void {
  if (Platform.OS !== 'web') {
    Alert.alert(title, message, buttons);
    return;
  }

  // Rendered without JS in a non-browser context (a test runner, a future
  // static render) there is no dialog to show. Dropping it is better than
  // throwing inside what the caller thinks is a fire-and-forget notification.
  if (typeof window === 'undefined') return;

  const text = message ? `${title}\n\n${message}` : title;

  if (!buttons || buttons.length <= 1) {
    window.alert(text);
    buttons?.[0]?.onPress?.();
    return;
  }

  const cancel = buttons.find((button) => button.style === 'cancel');
  // The action is the last non-cancel button — matching the native layout,
  // where the confirming choice sits after the cancel.
  const confirm = [...buttons].reverse().find((button) => button.style !== 'cancel');

  if (window.confirm(text)) confirm?.onPress?.();
  else cancel?.onPress?.();
}
