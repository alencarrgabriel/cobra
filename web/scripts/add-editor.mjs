// Creates an editor of the editorial panel (change painel-editorial, design D1): the Supabase
// Auth user, with a random password printed once, and the row in editorial.editors. The editor
// enrolls the authenticator app on the first sign-in.
//
//   node scripts/add-editor.mjs editora@exemplo.org "Nome da Editora"
//
// Needs NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SECRET_KEY and DATABASE_URL (root .env). The secret
// key never reaches the browser or the site deploy.
import { randomBytes } from "node:crypto";
import path from "node:path";

import nextEnv from "@next/env";
import { createClient } from "@supabase/supabase-js";
import postgres from "postgres";

const rootDir = path.resolve(import.meta.dirname, "..", "..");
nextEnv.loadEnvConfig(rootDir, false, { info: () => {}, error: console.error });

const [email, name] = process.argv.slice(2);
if (!email || !name) {
  console.error('Uso: node scripts/add-editor.mjs <email> "<nome>"');
  process.exit(1);
}
const {
  NEXT_PUBLIC_SUPABASE_URL: url,
  SUPABASE_SECRET_KEY: key,
  DATABASE_URL: db,
} = process.env;
for (const [variable, value] of Object.entries({
  NEXT_PUBLIC_SUPABASE_URL: url,
  SUPABASE_SECRET_KEY: key,
  DATABASE_URL: db,
})) {
  if (!value) {
    console.error(`Falta a variável ${variable}.`);
    process.exit(1);
  }
}

const password =
  process.env.EDITOR_PASSWORD ?? randomBytes(18).toString("base64url");
const admin = createClient(url, key, { auth: { persistSession: false } });
const { error } = await admin.auth.admin.createUser({
  email: email.toLowerCase(),
  password,
  email_confirm: true,
});
if (error && !/already.*registered/i.test(error.message)) {
  console.error(`Não foi possível criar o usuário: ${error.message}`);
  process.exit(1);
}

const sql = postgres(db, { max: 1 });
await sql`
  insert into editorial.editors (email, name) values (${email.toLowerCase()}, ${name})
  on conflict (email) do update set name = excluded.name, active = true`;
await sql.end();

console.log(`Editor ${email.toLowerCase()} pronto.`);
if (!error && !process.env.EDITOR_PASSWORD) {
  console.log(`Senha inicial (mostrada só agora): ${password}`);
}
