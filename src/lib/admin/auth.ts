import { createHash, randomBytes, scrypt, timingSafeEqual } from "node:crypto";
import { getIronSession } from "iron-session";
import { cookies } from "next/headers";
import { appOrigin, HttpError } from "./http";

export type Permission = "upload" | "edit" | "publish" | "archive" | "restore" | "delete" | "manage-users" | "manage-categories";
export type User = { username: string; role: "admin" | "editor" };
type Session = { username?: string; role?: string; fingerprint?: string; expiresAt?: number };
const SESSION_SECONDS = 8 * 60 * 60;
const HASH_PATTERN = /^scrypt:32768:8:1:([a-f0-9]{32}):([a-f0-9]{128})$/;

export function can(role: User["role"], permission: Permission): boolean {
  return role === "admin" || (role === "editor" && ["upload", "edit", "publish", "archive"].includes(permission));
}

function derive(password: string, salt: Buffer): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    scrypt(password, salt, 64, { N: 32768, r: 8, p: 1, maxmem: 64 * 1024 * 1024 }, (error, key) => error ? reject(error) : resolve(key));
  });
}

export async function createPasswordHash(password: string): Promise<string> {
  if (password.length < 12 || password.length > 1024) throw new Error("Use a password between 12 and 1024 characters.");
  const salt = randomBytes(16);
  const key = await derive(password, salt);
  return `scrypt:32768:8:1:${salt.toString("hex")}:${key.toString("hex")}`;
}

export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  const match = HASH_PATTERN.exec(hash);
  if (!match || password.length > 1024) return false;
  const actual = await derive(password, Buffer.from(match[1], "hex"));
  return timingSafeEqual(actual, Buffer.from(match[2], "hex"));
}

export function loadAuthConfig(env: Record<string, string | undefined> = process.env) {
  const username = env.ADMIN_USERNAME;
  const passwordHash = env.ADMIN_PASSWORD_HASH;
  const secret = env.SESSION_SECRET;
  if (!username || username.length > 128 || !passwordHash || !HASH_PATTERN.test(passwordHash) || !secret || secret.length < 32) {
    throw new HttpError(503, "Administrator authentication is not configured.");
  }
  appOrigin(env);
  return {
    username,
    passwordHash,
    secret,
    fingerprint: createHash("sha256").update(`${username}\0${passwordHash}`).digest("hex"),
  };
}

type AuthConfig = ReturnType<typeof loadAuthConfig>;

export async function verifyCredentials(username: string, password: string, config = loadAuthConfig()): Promise<boolean> {
  // Derive the password even for an incorrect username to avoid a username timing oracle.
  const valid = await verifyPassword(password, config.passwordHash);
  return valid && username === config.username;
}

export function sessionUser(session: Session, config: AuthConfig, now = Date.now()): User | null {
  if (session.username !== config.username || session.role !== "admin" || session.fingerprint !== config.fingerprint ||
      typeof session.expiresAt !== "number" || !Number.isFinite(session.expiresAt) || session.expiresAt <= now) return null;
  return { username: config.username, role: "admin" };
}

async function getSession(config: AuthConfig) {
  return getIronSession<Session>(await cookies(), {
    cookieName: "pcb-admin-session",
    password: config.secret,
    ttl: SESSION_SECONDS,
    cookieOptions: {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
      path: process.env.NEXT_PUBLIC_BASE_PATH || "/",
      maxAge: SESSION_SECONDS,
    },
  });
}

export async function getUser(): Promise<User | null> {
  let config: AuthConfig;
  try {
    config = loadAuthConfig();
  } catch (error) {
    if (error instanceof HttpError && error.status === 503) return null;
    throw error;
  }
  return sessionUser(await getSession(config), config);
}

export async function requireUser(permission?: Permission): Promise<User> {
  const user = await getUser();
  if (!user) throw new HttpError(401, "Sign in to continue.");
  if (permission && !can(user.role, permission)) throw new HttpError(403, "You do not have permission for this action.");
  return user;
}

export async function signIn(username: string, password: string): Promise<void> {
  const config = loadAuthConfig();
  if (!await verifyCredentials(username, password, config)) throw new HttpError(401, "Invalid username or password.");
  const session = await getSession(config);
  session.username = config.username;
  session.role = "admin";
  session.fingerprint = config.fingerprint;
  session.expiresAt = Date.now() + SESSION_SECONDS * 1000;
  await session.save();
}

export async function signOut(): Promise<void> {
  (await getSession(loadAuthConfig())).destroy();
}

// A shared process-wide budget cannot be bypassed by spoofing forwarded IP headers.
// This single-server V1 budget resets on restart; deploy an edge limiter as well.
let loginBudget = { attempts: 0, resetsAt: 0 };
export function consumeLoginAttempt(now = Date.now()): void {
  if (now >= loginBudget.resetsAt) loginBudget = { attempts: 0, resetsAt: now + 15 * 60 * 1000 };
  if (loginBudget.attempts >= 30) throw new HttpError(429, "Too many sign-in attempts. Try again in 15 minutes.");
  loginBudget.attempts += 1;
}
