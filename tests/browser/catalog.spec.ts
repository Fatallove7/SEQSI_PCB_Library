import { test, expect } from "@playwright/test";

test("home navigation and responsive layouts", async ({ page }, testInfo) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { name: "PCB Library", exact: true })).toBeVisible();
  await expect(page.locator(".board-card")).toHaveCount(3);
  await expect(page.locator(".board-card").first()).toContainText("DEMO-A");
  await expect(page.locator(".category-card")).toHaveCount(9);
  await page.screenshot({ path: testInfo.outputPath("home.png"), fullPage: true });
  await page.getByRole("searchbox", { name: "Search PCB archive" }).fill("DEMO-A");
  await page.getByRole("button", { name: "Search", exact: false }).click();
  await expect(page.locator(".board-card")).toHaveCount(1);
  await expect(page).toHaveURL(/q=DEMO-A/);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
});

test("combined filters, reload, history, sorting, and empty states", async ({ page }) => {
  await page.goto("/boards/");
  await page.getByRole("combobox", { name: "Category", exact: true }).selectOption("adapter-board");
  await page.getByRole("combobox", { name: "Year", exact: true }).selectOption("2026");
  await page.getByRole("combobox", { name: "Designer", exact: true }).selectOption("Demo contributor A");
  await expect(page.locator(".board-card")).toHaveCount(1);
  await page.reload();
  await expect(page.getByRole("combobox", { name: "Category", exact: true })).toHaveValue("adapter-board");
  await expect(page.locator(".board-card")).toHaveCount(1);
  await page.getByRole("button", { name: "Clear filters" }).click();
  await expect(page.locator(".board-card")).toHaveCount(3);
  await page.goBack();
  await expect(page.locator(".board-card")).toHaveCount(1);
  await page.getByRole("button", { name: "Clear filters" }).click();
  await page.getByRole("combobox", { name: "Sort by" }).selectOption("oldest");
  await expect(page.locator(".board-card").first()).toContainText("DEMO-C");
  await page.getByRole("searchbox", { name: "Search the archive" }).fill("no-such-board");
  await expect(page.getByRole("heading", { name: "No PCB works match the current filters." })).toBeVisible();
  await page.goto("/boards/?category=unknown");
  await expect(page.locator("main [role=alert]")).toContainText("not in the archive");
});

test("detail galleries, keyboard focus, missing media, and 404", async ({ page }, testInfo) => {
  await page.goto("/boards/demo-a-complete/");
  await expect(page).toHaveTitle(/DEMO-A Complete record example/);
  for (const image of await page.locator("main img").all()) {
    await image.scrollIntoViewIfNeeded();
    await expect(image).toHaveJSProperty("complete", true);
    expect(await image.evaluate((element: HTMLImageElement) => element.naturalWidth)).toBeGreaterThan(0);
  }
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.screenshot({ path: testInfo.outputPath("detail.png"), fullPage: true });
  const trigger = page.getByRole("button", { name: "Enlarge Top view — layout placeholder" });
  await trigger.click();
  const dialog = page.getByRole("dialog");
  await expect(dialog).toBeVisible();
  await expect(dialog).toContainText("1 / 2");
  await page.keyboard.press("ArrowRight");
  await expect(dialog).toContainText("2 / 2");
  await page.keyboard.press("Escape");
  await expect(dialog).not.toBeVisible();
  await expect(trigger).toBeFocused();
  const file = page.getByRole("link", { name: /Example documentation/ });
  const response = await page.request.get((await file.getAttribute("href"))!);
  expect(response.ok()).toBe(true);
  expect(await response.text()).toContain("DEMO CONTENT ONLY");
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  await page.goto("/boards/demo-b-renders/");
  await expect(page.getByRole("button", { name: "Load interactive 3D model" })).toHaveCount(0);
  await expect(page.locator("#model img")).toBeVisible();
  await page.goto("/boards/demo-c-partial/");
  for (const section of ["schematic", "layout", "model"]) await expect(page.locator(`#${section}`)).toContainText("Preview not available");
  for (const section of ["photos", "downloads"]) await expect(page.locator(`#${section}`)).toContainText("Not available yet.");
  const missing = await page.goto("/boards/no-such-board/");
  expect(missing?.status()).toBe(404);
  await expect(page.getByRole("heading", { name: "This page is not in the archive." })).toBeVisible();
});

test("model loads only on request and exposes reset controls", async ({ page }) => {
  const models: string[] = [];
  page.on("request", request => { if (request.url().endsWith(".glb")) models.push(request.url()); });
  await page.goto("/boards/demo-a-complete/");
  await expect(page.getByRole("button", { name: "Load interactive 3D model" })).toBeVisible();
  expect(models).toHaveLength(0);
  await page.getByRole("button", { name: "Load interactive 3D model" }).click();
  await expect(page.locator("model-viewer")).toBeVisible();
  await expect(page.locator(".model-status")).toContainText("Drag to rotate", { timeout: 30000 });
  expect(models.length).toBeGreaterThan(0);
  await page.getByRole("button", { name: "Reset camera" }).click();
});
