/**
 * @fileoverview Splash screen component displayed during app startup.
 * Shows the app name with a fade-in/fade-out animation.
 * @module renderer/components/SplashScreen
 */

/**
 * Splash screen component with animated app branding.
 * Displays centered "open-app" text with fade animation.
 * @returns {JSX.Element} The rendered splash screen
 */
export function SplashScreen() {
  return (
    <div className="splash-screen">
      <span className="splash-logo">open-app</span>
    </div>
  );
}
