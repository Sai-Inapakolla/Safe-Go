import "@testing-library/jest-dom";
import i18n from "i18next";
import { initReactI18next } from "react-i18next";

// Ensure safe environment variables for headless test runners
if (typeof process !== "undefined" && process.env) {
  process.env.VITE_FIREBASE_API_KEY = process.env.VITE_FIREBASE_API_KEY || "demo-api-key";
  process.env.VITE_FIREBASE_PROJECT_ID = process.env.VITE_FIREBASE_PROJECT_ID || "demo-safego";
}

// Initialize i18next mock instance for all component tests
if (!i18n.isInitialized) {
  i18n.use(initReactI18next).init({
    lng: "en",
    fallbackLng: "en",
    resources: {
      en: {
        translation: {
          "nav.home": "Home",
          "nav.safety": "Safety Center",
          "nav.drive": "Drive With Us",
          "nav.about": "About SafeGo",
          "nav.login": "Login",
          "nav.register": "Register",
        },
      },
    },
    interpolation: {
      escapeValue: false,
    },
  });
}

// Mock matchMedia for UI components
Object.defineProperty(window, "matchMedia", {
  writable: true,
  value: (query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: () => {},
    removeListener: () => {},
    addEventListener: () => {},
    removeEventListener: () => {},
    dispatchEvent: () => {},
  }),
});

// Mock navigator.vibrate
if (typeof navigator !== "undefined") {
  Object.defineProperty(navigator, "vibrate", {
    writable: true,
    value: () => true,
  });
}

// Prevent JSDOM external navigation errors when clicking tel: or mailto: links in tests
if (typeof HTMLAnchorElement !== "undefined") {
  const originalClick = HTMLAnchorElement.prototype.click;
  HTMLAnchorElement.prototype.click = function (this: HTMLAnchorElement) {
    if (this.href && (this.href.startsWith("tel:") || this.href.startsWith("mailto:"))) {
      // Handled cleanly in test environment without throwing JSDOM navigation error
      return;
    }
    return originalClick ? originalClick.call(this) : undefined;
  };
}
