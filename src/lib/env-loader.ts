import { configSecrets } from './config-secrets';

export function loadEnvManual() {
  Object.entries(configSecrets).forEach(([key, val]) => {
    process.env[key] = val;
  });
  console.log("Loaded environment variables from built-in config secrets successfully.");
}

loadEnvManual();


