import assert from "node:assert/strict";
import test from "node:test";
import { can, consumeLoginAttempt, createPasswordHash, loadAuthConfig, sessionUser, verifyCredentials, verifyPassword } from "../src/lib/admin/auth";
import { assertSameOrigin, HttpError, jsonError, readJson } from "../src/lib/admin/http";

test("editor permissions exclude restore, delete and user management", () => {
  for (const permission of ["upload", "edit", "publish", "archive"] as const) assert.equal(can("editor", permission), true);
  for (const permission of ["restore", "delete", "manage-users"] as const) {
    assert.equal(can("editor", permission), false);
    assert.equal(can("admin", permission), true);
  }
});

test("password hashes are salted and reject wrong passwords and malformed hashes", async () => {
  const password = "a-long-test-password";
  const first = await createPasswordHash(password);
  assert.notEqual(first, await createPasswordHash(password));
  assert.equal(await verifyPassword(password, first), true);
  assert.equal(await verifyPassword("incorrect", first), false);
  assert.equal(await verifyPassword(password, "scrypt:999999999:8:1:00:00"), false);
  await assert.rejects(createPasswordHash("short"));
});

test("authentication fails closed without configured secrets and production origin", async () => {
  assert.throws(() => loadAuthConfig({}), HttpError);
  const hash = await createPasswordHash("another-long-password");
  const env = { ADMIN_USERNAME: "owner", ADMIN_PASSWORD_HASH: hash, SESSION_SECRET: "a".repeat(32) };
  assert.equal(loadAuthConfig(env).username, "owner");
  assert.throws(() => loadAuthConfig({ ...env, NODE_ENV: "production" }), HttpError);
  assert.throws(() => loadAuthConfig({ ...env, SESSION_SECRET: "short" }), HttpError);
  const config = loadAuthConfig(env);
  assert.equal(await verifyCredentials("wrong", "another-long-password", config), false);
  assert.equal(await verifyCredentials("owner", "wrong", config), false);
  assert.equal(await verifyCredentials("owner", "another-long-password", config), true);
});

test("sessions expire and are revoked when administrator credentials change", async () => {
  const env = { ADMIN_USERNAME: "owner", ADMIN_PASSWORD_HASH: await createPasswordHash("another-long-password"), SESSION_SECRET: "b".repeat(32) };
  const config = loadAuthConfig(env);
  const session = { username: "owner", role: "admin" as const, fingerprint: config.fingerprint, expiresAt: 2000 };
  assert.deepEqual(sessionUser(session, config, 1000), { username: "owner", role: "admin" });
  assert.equal(sessionUser(session, config, 2000), null);
  assert.equal(sessionUser({ ...session, role: "editor" }, config, 1000), null);
  assert.equal(sessionUser(session, loadAuthConfig({ ...env, ADMIN_USERNAME: "replacement" }), 1000), null);
  assert.equal(sessionUser(session, loadAuthConfig({ ...env, ADMIN_PASSWORD_HASH: await createPasswordHash("replacement-password") }), 1000), null);
});

test("mutations require exact configured origin, independent of Host", () => {
  const env = { APP_ORIGIN: "https://boards.example" };
  assert.doesNotThrow(() => assertSameOrigin(new Request("http://internal/api", { headers: { origin: "https://boards.example" } }), env));
  for (const origin of ["https://evil.example", "null", "https://boards.example.evil", ""]) {
    assert.throws(() => assertSameOrigin(new Request("http://internal/api", { headers: { origin, host: "boards.example" } }), env), HttpError);
  }
  assert.throws(() => assertSameOrigin(new Request("http://internal/api"), { NODE_ENV: "production" }), HttpError);
});

test("JSON request limit checks actual bytes and malformed JSON; errors do not expose internals", async () => {
  const request = (body: string) => new Request("http://localhost", { method: "POST", headers: { "content-type": "application/json" }, body });
  assert.deepEqual(await readJson(request('{"ok":true}')), { ok: true });
  await assert.rejects(readJson(request('"oversized"'), 3), (error: unknown) => error instanceof HttpError && error.status === 413);
  await assert.rejects(readJson(request("invalid")), HttpError);
  assert.deepEqual(await jsonError(new Error("private filesystem secret")).json(), { error: "An unexpected error occurred." });
  assert.equal(jsonError(new HttpError(403, "Access denied.")).status, 403);
});

test("login attempt budget blocks repeated requests and reopens after its window", () => {
  const now = Date.now() + 60 * 60 * 1000;
  for (let index = 0; index < 30; index += 1) consumeLoginAttempt(now);
  assert.throws(() => consumeLoginAttempt(now), (error: unknown) => error instanceof HttpError && error.status === 429);
  assert.doesNotThrow(() => consumeLoginAttempt(now + 15 * 60 * 1000));
});
