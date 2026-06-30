import { test, expect } from "@playwright/test";

test.describe("Login Page", () => {
  test("shows login form @smoke", async ({ page }) => {
    await page.goto("/login");

    // Page has two h1s; filter to the login-panel heading
    await expect(page.locator("h1").filter({ hasText: "欢迎回来" })).toBeVisible();
    await expect(page.locator("input#email")).toBeVisible();
    await expect(page.locator("input#password")).toBeVisible();
    await expect(page.locator('button[type="submit"]')).toBeVisible();
  });

  test("shows Sapphire Studio branding", async ({ page }) => {
    await page.goto("/login");
    // Check header shows "Sapphire Studio"
    await expect(page.locator("header")).toContainText("Sapphire Studio");
  });

  test("has link to register page", async ({ page }) => {
    await page.goto("/login");
    const registerLink = page.locator("a").filter({ hasText: "立即注册" });
    await expect(registerLink).toBeVisible();
    await expect(registerLink).toHaveAttribute("href", "/register");
  });

  test("has link to admin login", async ({ page }) => {
    await page.goto("/login");
    // The link text is "点击这里登录"
    const adminLink = page.locator("a").filter({ hasText: "点击这里登录" });
    await expect(adminLink).toBeVisible();
    await expect(adminLink).toHaveAttribute("href", "/cms/login");
  });
});

test.describe("Admin Login Page", () => {
  test("loads admin login page @smoke", async ({ page }) => {
    await page.goto("/cms/login");

    // Check page loads and shows admin login form
    await expect(page.locator("h1").filter({ hasText: "欢迎回来" })).toBeVisible();
    await expect(page.locator("input#email")).toBeVisible();
    await expect(page.locator("input#password")).toBeVisible();
    await expect(page.locator('button[type="submit"]')).toBeVisible();
  });

  test("shows Sapphire Studio branding on desktop", async ({ page }) => {
    await page.goto("/cms/login");
    // Desktop branding (left panel) - use a more generic selector
    // Desktop branding panel shows site name in an h1
    await expect(page.getByRole("heading", { level: 1, name: "Sapphire Studio" })).toBeVisible();
  });
});
