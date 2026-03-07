import { test, expect } from "@playwright/test";

test.describe("Authentication", () => {
  test("login page loads correctly", async ({ page }) => {
    await page.goto("/login");
    await expect(page).toHaveTitle(/Imperial/);
    await expect(page.getByLabel(/email/i)).toBeVisible();
    await expect(page.getByLabel(/contrase/i)).toBeVisible();
    await expect(page.getByRole("button", { name: /iniciar/i })).toBeVisible();
  });

  test("shows error with invalid credentials", async ({ page }) => {
    await page.goto("/login");
    await page.getByLabel(/email/i).fill("invalid@test.com");
    await page.getByLabel(/contrase/i).fill("wrongpassword");
    await page.getByRole("button", { name: /iniciar/i }).click();
    await expect(page.getByText(/error|invalid|incorrecta/i)).toBeVisible({
      timeout: 5000,
    });
  });

  test("redirects unauthenticated users to login", async ({ page }) => {
    await page.goto("/dashboard");
    await expect(page).toHaveURL(/login/);
  });

  test("redirects unauthenticated couriers to login", async ({ page }) => {
    await page.goto("/deliveries");
    await expect(page).toHaveURL(/login/);
  });
});
