import fs from 'fs';
import path from 'path';

export function loadEnvManual() {
  if (process.env.CLERK_SECRET_KEY) return;
  
  const pathsToTry = [
    path.join(/*turbopackIgnore: true*/ process.cwd(), '.env'),
    path.join(/*turbopackIgnore: true*/ process.cwd(), '..', '.env'),
    path.join(/*turbopackIgnore: true*/ process.cwd(), '..', '..', '.env'),
  ];
  
  try {
    pathsToTry.push(path.join(/*turbopackIgnore: true*/ __dirname, '.env'));
    pathsToTry.push(path.join(/*turbopackIgnore: true*/ __dirname, '..', '.env'));
    pathsToTry.push(path.join(/*turbopackIgnore: true*/ __dirname, '..', '..', '.env'));
    pathsToTry.push(path.join(/*turbopackIgnore: true*/ __dirname, '..', '..', '..', '.env'));
    pathsToTry.push(path.join(/*turbopackIgnore: true*/ __dirname, '..', '..', '..', '..', '.env'));
  } catch {}

  for (const envPath of pathsToTry) {
    try {
      if (fs.existsSync(envPath)) {
        const content = fs.readFileSync(envPath, 'utf8');
        content.split(/\r?\n/).forEach(line => {
          const trimmed = line.trim();
          if (!trimmed || trimmed.startsWith('#')) return;
          const index = trimmed.indexOf('=');
          if (index > 0) {
            const key = trimmed.substring(0, index).trim();
            let val = trimmed.substring(index + 1).trim();
            // Remove quotes if present
            if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
              val = val.substring(1, val.length - 1);
            }
            if (!process.env[key]) {
              process.env[key] = val;
            }
          }
        });
        console.log(`Loaded env variables manually from: ${envPath}`);
        break;
      }
    } catch (e) {
      console.error(`Failed to manually load env from ${envPath}:`, e);
    }
  }
}

// Automatically invoke on import
loadEnvManual();
