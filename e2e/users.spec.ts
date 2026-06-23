import { test, expect } from "@playwright/test";

test.describe("Users Management", () => {
  test("users page loads with data table", async ({ page }) => {
    await page.goto("/cms/users");

    await expect(page.locator("table")).toBeVisible({ timeout: 10000 });
  });

  test("page title is shown", async ({ page }) => {
    await page.goto("/cms/users");

    await expect(page.locator("body")).toContainText(/用户|Users/i, { timeout: 10000 });
  });
});
