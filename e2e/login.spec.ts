import { test, expect } from "@playwright/test";

test.describe("Login Page", () => {
  test("shows login form", async ({ page }) => {
    await page.goto("/login");

    // Page has two h1s; filter to the login-panel heading
    await expect(page.locator("h1").filter({ hasText: "欢迎回来" })).toBeVisible();
    await expect(page.locator("input#email")).toBeVisible();
    await expect(page.locator("input#password")).toBeVisible();
    await expect(page.locator('button[type="submit"]')).toBeVisible();
  });

  test("shows branding text", async ({ page }) => {
    await page.goto("/login");
    await expect(page.locator("body")).toContainText("INFP的小窝");
  });

  test("shows validation error for empty form submission", async ({ page }) => {
    await page.goto("/login");
    await page.click('button[type="submit"]');

    await expect(page.locator("text=请输入有效的邮箱地址")).toBeVisible({ timeout: 5000 });
  });

  test("shows validation error for invalid email", async ({ page }) => {
    await page.goto("/login");

    await page.fill("input#email", "not-an-email");
    await page.fill("input#password", "test123");

    // Bypass HTML5 validation so react-hook-form validation runs
    await page.evaluate(() => {
      const form = document.querySelector("form");
      if (form) form.noValidate = true;
    });
    await page.click('button[type="submit"]');

    await expect(page.locator("text=请输入有效的邮箱地址")).toBeVisible({ timeout: 5000 });
  });

  test("shows error toast for wrong credentials", async ({ page }) => {
    await page.goto("/login");

    await page.fill("input#email", "wrong@example.com");
    await page.fill("input#password", "wrongpassword123");
    await page.click('button[type="submit"]');

    // Should show error toast
    await expect(page.locator("[data-sonner-toast]")).toBeVisible({ timeout: 15000 });
  });
});
