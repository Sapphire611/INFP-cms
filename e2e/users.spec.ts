import { test, expect } from "@playwright/test";

test.describe("Users Management", () => {
  test.beforeEach(async ({ page, context }) => {
    await page.goto("/cms/login");
    await page.waitForSelector("input#email");
    await page.fill("input#email", "admin@test.com");
    await page.fill("input#password", "Rabbit611");
    await page.click('button[type="submit"]');
    // Login form does router.push("/") — wait for URL to leave the login page
    await page.waitForURL((url) => !url.pathname.startsWith("/cms/login"), { timeout: 30000 });

    await context.addCookies([
      { name: "sidebar_state", value: "true", domain: "localhost", path: "/", sameSite: "Strict" as const },
    ]);
  });

  test("users page loads with data table @smoke", async ({ page }) => {
    await page.goto("/cms/users");
    await expect(page).toHaveURL(/cms\/users/, { timeout: 10000 });
    await expect(page.locator("table")).toBeVisible({ timeout: 10000 });
  });

  test("page title is shown", async ({ page }) => {
    await page.goto("/cms/users");
    await expect(page).toHaveURL(/cms\/users/, { timeout: 10000 });
    await expect(page.locator("body")).toContainText(/用户|Users/i, { timeout: 10000 });
  });
});
