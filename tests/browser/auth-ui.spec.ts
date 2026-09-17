import { test, expect, type Page } from "@playwright/test";

async function fillCredentials(page: Page) {
  await page.getByLabel("Username", { exact: true }).fill("browser-test-admin");
  await page.getByLabel("Password", { exact: true }).fill("Browser-test-password-2026");
}

test("catalog sign in preserves the exact URL and supports Escape and focus return", async ({ page }, testInfo) => {
  await page.goto("/boards/?q=demo&year=2026");
  const publicUrl = page.url();
  const signIn = page.getByRole("button", { name: "Sign In", exact: true });
  await signIn.click();
  const dialog = page.getByRole("dialog", { name: "Sign in" });
  await expect(dialog).toBeVisible();
  await page.screenshot({path:testInfo.outputPath("sign-in-dialog.png")});
  await page.keyboard.press("Escape");
  await expect(dialog).not.toBeVisible();
  await expect(signIn).toBeFocused();
  await signIn.click();
  await fillCredentials(page);
  await dialog.getByRole("button", { name: "Sign in", exact: true }).click();
  await expect(dialog).not.toBeVisible();
  await expect(page).toHaveURL(publicUrl);
  await expect(page.getByRole("link", { name: "+ Upload PCB", exact: true })).toBeVisible();
  await page.getByRole("button", { name: "browser-test-admin", exact: true }).click();
  await expect(page.getByRole("link", { name: "Management", exact: true })).toBeVisible();
  await expect(page.getByRole("link", { name: "Archived Boards", exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Sign Out", exact: true }).click();
  await expect(signIn).toBeVisible();
  await expect(page).toHaveURL(publicUrl);
  await expect(page.getByRole("link", { name: "+ Upload PCB", exact: true })).toHaveCount(0);
});

test("fallback sign in honors a local target and administrative sign out returns to the catalog", async ({ page }) => {
  await page.goto("/admin/login/?next=%2Fadmin%2Farchive");
  await fillCredentials(page);
  await page.locator("main").getByRole("button", { name: "Sign in", exact: true }).click();
  await expect(page).toHaveURL(/\/admin\/archive\/?$/);
  await page.getByRole("button", { name: "browser-test-admin", exact: true }).click();
  await page.getByRole("button", { name: "Sign Out", exact: true }).click();
  await expect(page).toHaveURL(/\/boards\/?$/);
  await page.goto("/admin/archive/");
  await expect(page).toHaveURL(/\/admin\/login/);
});

test("fallback sign in rejects an external return target", async ({ page }) => {
  await page.goto("/admin/login/?next=https%3A%2F%2Fexample.com%2F");
  await fillCredentials(page);
  await page.locator("main").getByRole("button", { name: "Sign in", exact: true }).click();
  await expect(page).toHaveURL(/\/admin\/boards\/?$/);
});
