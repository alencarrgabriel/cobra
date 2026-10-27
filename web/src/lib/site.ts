import "server-only";

import { serverEnv } from "@/config/env";

/** Public address of the site (change compartilhamento, design D5). */
export function siteUrl(): URL {
  return new URL(serverEnv().SITE_URL ?? "http://localhost:3000");
}
