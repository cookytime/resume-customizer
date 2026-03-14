import { test, expect } from '@playwright/test';

test.describe('Smoke tests', () => {
  test('login page loads', async ({ page }) => {
    await page.goto('/login');
    await expect(page).toHaveTitle(/Resume Customizer/i);
    // Should have a login/signup button or Auth0 redirect
    const loginBtn = page.locator('text=/log in|sign in|get started/i');
    await expect(loginBtn.first()).toBeVisible({ timeout: 10000 });
  });

  test('unauthenticated root redirects to login', async ({ page }) => {
    const response = await page.goto('/');
    // Should redirect to /login or show login page
    const url = page.url();
    const isLoginPage = url.includes('/login') || url.includes('auth0');
    expect(isLoginPage).toBeTruthy();
  });

  test('unauthenticated dashboard redirects to login', async ({ page }) => {
    const response = await page.goto('/dashboard');
    const url = page.url();
    const isLoginPage = url.includes('/login') || url.includes('auth0');
    expect(isLoginPage).toBeTruthy();
  });
});

test.describe('API route checks (unauthenticated)', () => {
  test('GET /api/storage returns 401 or redirect', async ({ request }) => {
    const res = await request.get('/api/storage');
    // Should be 401 or the middleware redirects
    expect([401, 302, 307]).toContain(res.status());
  });

  test('GET /api/jobs returns 401 or redirect', async ({ request }) => {
    const res = await request.get('/api/jobs');
    expect([401, 302, 307]).toContain(res.status());
  });
});
