import '@/lib/env-loader'
import { Account, Client, Databases } from "appwrite";

const isProduction = process.env.NODE_ENV === "production";

function pickByEnv(devValue?: string, prodValue?: string): string {
  return (isProduction ? prodValue : devValue) || "";
}

const endpoint =
  pickByEnv(
    process.env.NEXT_PUBLIC_APPWRITE_ENDPOINT_DEVELOPMENT,
    process.env.NEXT_PUBLIC_APPWRITE_ENDPOINT_PRODUCTION
  ) ||
  process.env.NEXT_PUBLIC_APPWRITE_ENDPOINT ||
  "https://nyc.cloud.appwrite.io/v1";

const projectId =
  pickByEnv(
    process.env.NEXT_PUBLIC_APPWRITE_PROJECT_ID_DEVELOPMENT,
    process.env.NEXT_PUBLIC_APPWRITE_PROJECT_ID_PRODUCTION
  ) ||
  process.env.NEXT_PUBLIC_APPWRITE_PROJECT_ID ||
  "6a24e8cd0033cc19a86e";

const client = new Client()
  .setEndpoint(endpoint)
  .setProject(projectId);

const account = new Account(client);
const databases = new Databases(client);

export { client, account, databases };