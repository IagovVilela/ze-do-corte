import bcrypt from "bcryptjs";

const ROUNDS = 12;

/**
 * Hash bcrypt válido só para equalizar tempo em login quando o usuário não existe
 * (evita timing que revela se o e-mail está cadastrado).
 */
export const DUMMY_PASSWORD_HASH =
  "$2a$12$3PuM8glZ8dA0i.X8H6GOyePZMCE82um6Kg1.oMIN2mZYURfctWWki";

/** bcryptjs 2.x (CJS) — `hashSync` evita callbacks e funciona bem com o bundler do Next. */
export async function hashPassword(plain: string): Promise<string> {
  return bcrypt.hashSync(plain, ROUNDS);
}

export async function verifyPassword(plain: string, hash: string): Promise<boolean> {
  return bcrypt.compareSync(plain, hash);
}
