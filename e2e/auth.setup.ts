import { test as setup, expect } from "@playwright/test";

const authFile = "e2e/.auth/user.json";

setup("authenticate", async ({ page }) => {
  await page.goto("/login");

  await page.fill("input#email", "admin@test.com");
  await page.fill("input#password", "Rabbit611");

  await page.click('button[type="submit"]');

  await page.waitForURL("**/cms/dashboard", { timeout: 30000 });

  await page.context().storageState({ path: authFile });
});
