/// <reference types="vite/client" />

interface ImportMetaEnv {
  // Optional public URL of the backend for deployed builds. Never a secret.
  readonly VITE_API_BASE_URL?: string
}
