"use client";

import { useEffect } from "react";
import { client } from "@/lib/appwrite";

export default function AppwritePing() {
  useEffect(() => {
    // Ping Appwrite backend once on client mount to verify setup (no-op on failure)
    client.ping().catch(() => {});
  }, []);

  return null;
}
