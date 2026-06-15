import { configSecrets } from './config-secrets';

export function loadEnvManual() {
  Object.entries(configSecrets).forEach(([key, val]) => {
    // If not set or empty in the environment, populate from config secrets
    const existing = process.env[key];
    if (!existing || existing.trim() === '') {
      process.env[key] = val;
    }
  });
  console.log("Loaded environment variables from built-in config secrets successfully.");
}

loadEnvManual();


