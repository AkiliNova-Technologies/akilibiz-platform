import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";

export default defineConfig([
  ...nextVitals,
  globalIgnores([".next/**", "node_modules/**", "desktop-reference/**"]),
  {
    // Byte-for-byte copies of AkiliBiz Desktop files (scripts/sync-desktop-i18n.mjs).
    // They follow the desktop's lint rules; fixes belong in the desktop repository.
    files: ["components/akilibiz/documents/desktop/**", "components/akilibiz/products/desktop/**"],
    rules: {
      "react-hooks/set-state-in-effect": "off",
      "@next/next/no-img-element": "off",
    },
  },
]);
