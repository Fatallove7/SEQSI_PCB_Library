import { test, expect } from "@playwright/test";
import { randomUUID } from "node:crypto";

test("administrator manages runtime categories and reference checks protect existing boards", async ({ page, browser }, testInfo) => {
  const suffix = randomUUID().slice(0, 8);
  const name = `Quantum Control ${suffix}`;
  const slug = `quantum-control-${suffix}`;
  const visitor = await browser.newContext();
  try {
    expect((await visitor.request.get("/api/admin/categories/")).status()).toBe(401);
    expect((await visitor.request.post("/api/admin/categories/", { headers: { Origin: "http://localhost:4173" }, data: { name, slug } })).status()).toBe(401);
    expect((await visitor.request.delete("/api/admin/categories/missing/", { headers: { Origin: "http://localhost:4173" } })).status()).toBe(401);
    await page.goto("/admin/login/");
    await page.getByLabel("Username", { exact: true }).fill("browser-test-admin");
    await page.getByLabel("Password", { exact: true }).fill("Browser-test-password-2026");
    await page.getByRole("button", { name: "Sign in", exact: true }).click();
    await expect(page).toHaveURL(/\/admin\/boards/);
    await page.getByRole("button", { name: "browser-test-admin", exact: true }).click();
    await page.getByRole("link", { name: "Manage categories", exact: true }).click();
    await page.getByLabel("Category name", { exact: true }).fill(name);
    await page.getByLabel("Category slug", { exact: true }).fill(slug);
    await page.getByRole("button", { name: "Create category", exact: true }).click();
    await expect(page.getByRole("status")).toContainText(`Created ${name}`);
    await page.getByLabel("Category name", { exact: true }).fill(`  ${name.toUpperCase()}  `);
    await page.getByLabel("Category slug", { exact: true }).fill(`${slug}-duplicate`);
    await page.getByRole("button", { name: "Create category", exact: true }).click();
    await expect(page.locator("main").getByRole("alert")).toContainText("already exists");
    await page.screenshot({ path: testInfo.outputPath("manage-categories.png"), fullPage: true });
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);

    await page.goto("/admin/boards/new/");
    await page.getByRole("combobox", { name: "Category", exact: true }).selectOption({ label: name });
    const category = await page.getByRole("combobox", { name: "Category", exact: true }).inputValue();
    await page.getByLabel("PCB ID", { exact: true }).fill(`CATEGORY-${suffix}`);
    await page.getByLabel("URL slug", { exact: true }).fill(`category-${suffix}`);
    await page.getByLabel("PCB name", { exact: true }).fill(`Category test ${suffix}`);
    await page.getByLabel("Description", { exact: true }).fill("Category browser fixture");
    await page.getByRole("button", { name: "Publish", exact: true }).click();
    await expect(page.getByRole("status")).toContainText("Published.");
    const editUrl = page.url();
    const publicPage = await visitor.newPage();
    await publicPage.goto(`/boards/?q=${encodeURIComponent(name)}&category=${category}`);
    await expect(publicPage.locator(".board-card")).toHaveCount(1);
    await expect(publicPage.locator(".board-card")).toContainText(name);
    await publicPage.locator(".board-card").click();
    await expect(publicPage.locator(".overview-meta")).toContainText(name);
    await publicPage.goto("/categories/");
    await expect(publicPage.getByRole("heading", { name, exact: true })).toBeVisible();

    await page.goto("/admin/categories/");
    await page.getByRole("button", { name: `Delete ${name}`, exact: true }).click();
    await page.getByRole("dialog").getByRole("button", { name: "Delete category", exact: true }).click();
    await expect(page.locator("main").getByRole("alert")).toContainText("1 board references");
    await page.goto(editUrl);
    await page.getByRole("button", { name: "Archive", exact: true }).click();
    await expect(page.getByRole("status")).toContainText("Archived.");
    await page.getByRole("button", { name: "Delete", exact: true }).click();
    await page.getByRole("dialog").getByLabel(`Type CATEGORY-${suffix} to confirm`).fill(`CATEGORY-${suffix}`);
    await page.getByRole("button", { name: "Delete permanently", exact: true }).click();
    await expect(page).toHaveURL(/\/admin\/boards/);
    await page.goto("/admin/categories/");
    await page.getByRole("button", { name: `Delete ${name}`, exact: true }).click();
    await page.getByRole("dialog").getByRole("button", { name: "Delete category", exact: true }).click();
    await expect(page.getByRole("status")).toContainText(`Deleted ${name}`);
    await page.reload();
    await expect(page.getByRole("button", { name: `Delete ${name}`, exact: true })).toHaveCount(0);
  } finally { await visitor.close(); }
});
