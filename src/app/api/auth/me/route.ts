import { getCurrentUser } from "@/lib/appwrite-server";
import fs from 'fs';
import path from 'path';

export const runtime = "nodejs";

export async function GET() {
  const user = await getCurrentUser();

  const cwd = process.cwd();
  let filesInCwd: string[] = [];
  try {
    filesInCwd = fs.readdirSync(cwd);
  } catch (e: any) {
    filesInCwd = [ "Error reading cwd: " + e.message ];
  }

  const envPaths = [
    path.join(cwd, '.env'),
    path.join(cwd, '..', '.env'),
    path.join(cwd, '..', '..', '.env'),
  ];
  
  try {
    envPaths.push(path.join(__dirname, '.env'));
    envPaths.push(path.join(__dirname, '..', '.env'));
    envPaths.push(path.join(__dirname, '..', '..', '.env'));
  } catch {}

  const pathExists: Record<string, boolean> = {};
  envPaths.forEach(p => {
    try {
      pathExists[p] = fs.existsSync(p);
    } catch {
      pathExists[p] = false;
    }
  });

  let envKeys: string[] = [];
  const mainEnvPath = path.join(cwd, '.env');
  if (fs.existsSync(mainEnvPath)) {
    try {
      const content = fs.readFileSync(mainEnvPath, 'utf8');
      envKeys = content.split(/\r?\n/)
        .map(line => line.trim())
        .filter(line => line && !line.startsWith('#'))
        .map(line => {
          const idx = line.indexOf('=');
          return idx > 0 ? line.substring(0, idx).trim() : line;
        });
    } catch (e: any) {
      envKeys = [ "Error reading .env: " + e.message ];
    }
  }

  return Response.json({ 
    user,
    debug: {
      adminEmails: process.env.ADMIN_EMAILS || "",
      clerkPublishableKey: process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY ? "present" : "missing",
      clerkSecretKey: process.env.CLERK_SECRET_KEY ? "present" : "missing",
      cwd,
      filesInCwd,
      pathExists,
      envKeys,
    }
  });
}


