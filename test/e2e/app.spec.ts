import { expect, test } from "@playwright/test";

test("connects to a target and sends a message", async ({ page }) => {
  await page.route("http://192.168.1.20:8080/v1/about", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ version: "1.0", build: "playwright" }),
    });
  });

  await page.route("http://192.168.1.20:8080/v1/contacts/**", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify([{ number: "+4922222222", name: "Playwright Jane" }]),
    });
  });

  await page.route("http://192.168.1.20:8080/v1/accounts", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify(["+4911111111"]),
    });
  });

  await page.route("http://192.168.1.20:8080/v1/devices/**", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify([{ id: 1, name: "Playwright Desktop" }]),
    });
  });

  await page.route("http://192.168.1.20:8080/v2/send", async (route) => {
    await route.fulfill({
      status: 201,
      contentType: "application/json",
      body: JSON.stringify({ timestamp: "9999" }),
    });
  });

  await page.goto("/connect");
  await page.getByLabel("Profile label").fill("Playwright Node");
  await page.getByLabel("Base URL").fill("http://192.168.1.20:8080");
  await page.getByRole("button", { name: "Test and save profile" }).click();
  await expect(page.getByRole("heading", { name: "Playwright Node" })).toBeVisible();

  await page.goto("/accounts");
  await page.getByRole("button", { name: "Use account" }).click();

  await page.goto("/messages");
  await page.getByLabel("Recipients").fill("+4922222222");
  await page.getByLabel(/^Message$/).fill("hello from playwright");
  await page.getByRole("button", { name: "Send message" }).click();

  await expect(page.getByText("timestamp 9999")).toBeVisible();
});
