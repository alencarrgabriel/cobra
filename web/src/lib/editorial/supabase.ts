import "server-only";

import { createServerClient } from "@supabase/ssr";
import type { SupabaseClient } from "@supabase/supabase-js";
import { cookies } from "next/headers";
import { connection } from "next/server";

// Supabase Auth for the editorial panel (change painel-editorial, design D1). The site has no
// accounts; only editors sign in here. The publishable key is public by design.

export function authConfig(): { url: string; key: string } | null {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  return url && key ? { url, key } : null;
}

/** Server client bound to the request cookies; null when the panel is not configured. */
export async function authClient(): Promise<SupabaseClient | null> {
  const config = authConfig();
  if (!config) return null;
  // Rendered per request: the session and its clock (Date.now) are runtime data.
  await connection();
  const store = await cookies();
  return createServerClient(config.url, config.key, {
    cookies: {
      getAll: () => store.getAll(),
      setAll: (list) => {
        try {
          for (const { name, value, options } of list)
            store.set(name, value, options);
        } catch {
          // Called from a Server Component, where cookies are read-only; the Proxy refreshes.
        }
      },
    },
  });
}
