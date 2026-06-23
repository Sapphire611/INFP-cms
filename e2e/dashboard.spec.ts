import { test, expect } from "@playwright/test";

test.describe("Dashboard", () => {
  test("shows dashboard page title", async ({ page }) => {
    await page.goto("/cms/dashboard");

    await expect(page.getByRole("link", { name: "数据概览" })).toBeVisible({ timeout: 10000 });
  });

  test("sidebar navigation is visible", async ({ page }) => {
    await page.goto("/cms/dashboard");

    await expect(page.getByRole("link", { name: "INFP的小窝" })).toBeVisible({ timeout: 10000 });
  });

  test("logged-in user account shown in sidebar", async ({ page }) => {
    await page.goto("/cms/dashboard");

    // Account switcher in sidebar footer confirms authenticated session
    await expect(
      page.getByRole("button", { name: /admin@test\.com/ })
    ).toBeVisible({ timeout: 10000 });
  });
});
