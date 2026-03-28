import bcrypt from "bcryptjs";

const ROUNDS = 12;

/** bcryptjs 2.x (CJS) — `hashSync` evita callbacks e funciona bem com o bundler do Next. */
export async function hashPassword(plain: string): Promise<string> {
  return bcrypt.hashSync(plain, ROUNDS);
}

export async function verifyPassword(plain: string, hash: string): Promise<boolean> {
  return bcrypt.compareSync(plain, hash);
}
