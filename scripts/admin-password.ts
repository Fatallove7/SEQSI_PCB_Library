import { createPasswordHash } from "../src/lib/admin/auth";

async function hiddenPrompt(label: string): Promise<string> {
  if (!process.stdin.isTTY || !process.stdout.isTTY) throw new Error("Run this command in an interactive terminal. Password arguments and pipes are not accepted.");
  process.stdout.write(label);
  process.stdin.setRawMode(true);
  process.stdin.resume();
  process.stdin.setEncoding("utf8");
  return new Promise((resolve, reject) => {
    let value = "";
    const finish = () => {
      process.stdin.off("data", onData);
      process.stdin.setRawMode(false);
      process.stdin.pause();
      process.stdout.write("\n");
    };
    const onData = (chunk: string) => {
      for (const character of chunk) {
        if (character === "\u0003") {
          finish();
          reject(new Error("Cancelled."));
          return;
        }
        if (character === "\r" || character === "\n") {
          finish();
          resolve(value);
          return;
        }
        if (character === "\u007f" || character === "\b") value = Array.from(value).slice(0, -1).join("");
        else if (character >= " " && value.length < 1024) value += character;
      }
    };
    process.stdin.on("data", onData);
  });
}

async function main() {
  if (process.argv.length > 2) throw new Error("This command does not accept arguments.");
  const password = await hiddenPrompt("New administrator password (at least 12 characters): ");
  const confirmation = await hiddenPrompt("Confirm password: ");
  if (password !== confirmation) throw new Error("Passwords do not match.");
  process.stdout.write(`ADMIN_PASSWORD_HASH=${await createPasswordHash(password)}\n`);
}

main().catch((error: unknown) => {
  process.stderr.write(`${error instanceof Error ? error.message : "Unable to generate password hash."}\n`);
  process.exitCode = 1;
});
