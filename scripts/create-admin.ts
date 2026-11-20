// Create an admin, or reset an existing admin's password.
// Usage: npm run admin:create -- <email> <password>
import "./env";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { db, sqlite } from "../src/db";
import { admins } from "../src/db/schema";

const input = z.object({
  email: z.string().trim().toLowerCase().email(),
  password: z.string().min(12, "Password must be at least 12 characters"),
});

async function main() {
  const parsed = input.safeParse({ email: process.argv[2], password: process.argv[3] });
  if (!parsed.success) {
    console.error("Usage: npm run admin:create -- <email> <password>");
    console.error(parsed.error.issues.map((i) => `  ${i.path.join(".")}: ${i.message}`).join("\n"));
    process.exitCode = 1;
    return;
  }
  const { email, password } = parsed.data;
  const passwordHash = await bcrypt.hash(password, 12);
  await db
    .insert(admins)
    .values({ email, passwordHash })
    .onConflictDoUpdate({ target: admins.email, set: { passwordHash } });
  console.log(`Admin saved: ${email}`);
}

main()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(() => sqlite.close());
