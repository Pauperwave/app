// test\e2e\public-pages.spec.ts
import { expect, test } from '@playwright/test'

const PUBLIC_PATHS = [
  '/tesseramento',
  '/calendario',
  '/classifiche/cittadino',
  '/classifiche/commander',
  '/classifiche/premodern',
  '/classifiche/pauper'
]

const PRIVATE_PATHS = [
  '/associates',
  '/players',
  '/tournaments',
  '/settings'
]

test.describe('public pages', () => {
  for (const path of PUBLIC_PATHS) {
    test(`${path} renders without logging in`, async ({ page }) => {
      const response = await page.goto(path)

      expect(response?.status()).toBe(200)
      await expect(page).toHaveURL(new RegExp(`${path}/?$`))
      await expect(page.locator('h1').first()).toBeVisible()
    })
  }

  test('/login shows the email form', async ({ page }) => {
    await page.goto('/login')

    await expect(page).toHaveURL(/\/login$/)
    await expect(page.locator('input[type="email"]')).toBeVisible()
  })
})

test.describe('private pages', () => {
  for (const path of PRIVATE_PATHS) {
    test(`${path} redirects an anonymous visitor to /login`, async ({ page }) => {
      await page.goto(path)

      await expect(page).toHaveURL(/\/login/)
    })
  }
})
