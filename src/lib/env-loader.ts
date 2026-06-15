import fs from 'fs';
import path from 'path';

export function loadEnvManual() {
  const visited = new Set<string>();
  const pathsToTry: string[] = [];

  // 1. Common serverless paths
  pathsToTry.push('/mnt/code/.env');

  // 2. Traverse up from process.cwd()
  try {
    let current = path.resolve(process.cwd());
    while (current) {
      if (visited.has(current)) break;
      visited.add(current);
      pathsToTry.push(path.join(current, '.env'));
      const parent = path.dirname(current);
      if (parent === current) break;
      current = parent;
    }
  } catch {}

  // 3. Traverse up from __dirname
  try {
    let current = path.resolve(__dirname);
    while (current) {
      if (visited.has(current)) break;
      visited.add(current);
      pathsToTry.push(path.join(current, '.env'));
      const parent = path.dirname(current);
      if (parent === current) break;
      current = parent;
    }
  } catch {}

  // 4. Try parsing path of current module if available
  try {
    const mod = module as any;
    if (mod && mod.filename) {
      let current = path.dirname(mod.filename);
      while (current) {
        if (visited.has(current)) break;
        visited.add(current);
        pathsToTry.push(path.join(current, '.env'));
        const parent = path.dirname(current);
        if (parent === current) break;
        current = parent;
      }
    }
  } catch {}

  let foundPath: string | null = null;
  for (const envPath of pathsToTry) {
    try {
      if (fs.existsSync(envPath)) {
        foundPath = envPath;
        break;
      }
    } catch {}
  }

  if (foundPath) {
    try {
      const content = fs.readFileSync(foundPath, 'utf8');
      content.split(/\r?\n/).forEach(line => {
        const trimmed = line.trim();
        if (!trimmed || trimmed.startsWith('#')) return;
        const index = trimmed.indexOf('=');
        if (index > 0) {
          const key = trimmed.substring(0, index).trim();
          let val = trimmed.substring(index + 1).trim();
          if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
            val = val.substring(1, val.length - 1);
          }
          process.env[key] = val;
        }
      });
      console.log(`Loaded env variables manually from: ${foundPath}`);
    } catch (e) {
      console.error(`Failed to manually read env from ${foundPath}:`, e);
    }
  } else {
    console.error(`Manual env loader: .env file NOT found. Checked paths:`, pathsToTry);
  }
}

loadEnvManual();

