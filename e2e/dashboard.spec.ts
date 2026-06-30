import { test, expect } from "@playwright/test";

test.describe("Dashboard", () => {
  test.beforeEach(async ({ page, context }) => {
    // Real UI login flow — same as a human user
    await page.goto("/cms/login");
    await page.waitForSelector("input#email");
    await page.fill("input#email", "admin@test.com");
    await page.fill("input#password", "Rabbit611");
    await page.click('button[type="submit"]');
    // Login form does router.push("/") — wait for URL to leave the login page
    await page.waitForURL((url) => !url.pathname.startsWith("/cms/login"), { timeout: 30000 });

    // Ensure sidebar is expanded (login form doesn't set this cookie)
    await context.addCookies([
      { name: "sidebar_state", value: "true", domain: "localhost", path: "/", sameSite: "Strict" as const },
    ]);
  });

  test("shows dashboard page title @smoke", async ({ page }) => {
    await page.goto("/cms/dashboard");
    await expect(page).toHaveURL(/cms\/dashboard/, { timeout: 10000 });
    await expect(page.getByRole("link", { name: "数据概览" })).toBeVisible({ timeout: 10000 });
  });

  test("sidebar navigation is visible", async ({ page }) => {
    await page.goto("/cms/dashboard");
    await expect(page).toHaveURL(/cms\/dashboard/, { timeout: 10000 });
    await expect(page.getByRole("link", { name: "Sapphire Studio" })).toBeVisible({ timeout: 10000 });
  });

  test("logged-in user account shown in sidebar", async ({ page }) => {
    await page.goto("/cms/dashboard");
    await expect(page).toHaveURL(/cms\/dashboard/, { timeout: 10000 });
    await expect(
      page.getByRole("button", { name: /admin@test\.com/ })
    ).toBeVisible({ timeout: 10000 });
  });
});
