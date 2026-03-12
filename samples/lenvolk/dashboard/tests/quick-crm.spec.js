import { test, expect } from '@playwright/test';

// Quick CRM + new features integration tests
// Covers: Quick CRM, log viewer, tooltips, screenshot paste, owner filter, email filter, CRM links

test.describe('Quick CRM & Features', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  // ───── UI Structure ─────

  test('CRM-Direct section is visible in sidebar', async ({ page }) => {
    const heading = page.locator('.crm-section-toggle', { hasText: 'CRM-Direct' });
    await expect(heading).toBeVisible();
  });

  test('CRM-MCP section is visible in sidebar', async ({ page }) => {
    const heading = page.locator('.crm-section-toggle', { hasText: 'CRM-MCP' });
    await expect(heading).toBeVisible();
  });

  test('CRM search input is visible with placeholder', async ({ page }) => {
    const input = page.locator('#crm-search-input');
    await expect(input).toBeVisible();
    await expect(input).toHaveAttribute('placeholder', /Account|TPID|milestone/i);
  });

  test('all six Quick CRM action buttons are visible', async ({ page }) => {
    await expect(page.locator('[data-crm-action="drill"]')).toBeVisible();
    await expect(page.locator('[data-crm-action="milestones"]')).toBeVisible();
    await expect(page.locator('[data-crm-action="opportunities"]')).toBeVisible();
    await expect(page.locator('[data-crm-action="accounts"]')).toBeVisible();
    await expect(page.locator('[data-crm-action="my-milestones"]')).toBeVisible();
    await expect(page.locator('[data-crm-action="owner-milestones"]')).toBeVisible();
  });

  test('Account Drill-Down button has accent styling', async ({ page }) => {
    const btn = page.locator('[data-crm-action="drill"]');
    await expect(btn).toHaveClass(/accent/);
  });

  // ───── Owner Input ─────

  test('owner email input is visible', async ({ page }) => {
    const input = page.locator('#crm-owner-input');
    await expect(input).toBeVisible();
    await expect(input).toHaveAttribute('placeholder', /microsoft\.com/i);
  });

  test('owner milestones button validates email format', async ({ page }) => {
    await page.fill('#crm-owner-input', 'invalid-email');
    await page.click('[data-crm-action="owner-milestones"]');
    const errorMsg = page.locator('.message.error');
    await expect(errorMsg.first()).toContainText('microsoft.com');
  });

  test('owner milestones button rejects non-microsoft emails', async ({ page }) => {
    await page.fill('#crm-owner-input', 'user@gmail.com');
    await page.click('[data-crm-action="owner-milestones"]');
    const errorMsg = page.locator('.message.error');
    await expect(errorMsg.first()).toContainText('microsoft.com');
  });

  // ───── Input Validation ─────

  test('CRM buttons requiring input flash red when empty', async ({ page }) => {
    const input = page.locator('#crm-search-input');
    await page.click('[data-crm-action="drill"]');
    await expect(input).toBeFocused();
  });

  test('My Active Milestones does not require search input', async ({ page }) => {
    await page.click('[data-crm-action="my-milestones"]');
    const statusLine = page.locator('#crm-status-line');
    await expect(statusLine).not.toHaveText('');
  });

  // ───── CRM API Endpoints ─────

  test('CRM accounts endpoint requires q parameter', async ({ request }) => {
    const resp = await request.get('/api/crm/accounts');
    expect(resp.status()).toBe(400);
    const body = await resp.json();
    expect(body.ok).toBe(false);
  });

  test('CRM drill endpoint requires q parameter', async ({ request }) => {
    const resp = await request.get('/api/crm/drill');
    expect(resp.status()).toBe(400);
    const body = await resp.json();
    expect(body.ok).toBe(false);
  });

  test('CRM query endpoint requires entitySet', async ({ request }) => {
    const resp = await request.post('/api/crm/query', { data: {} });
    expect(resp.status()).toBe(400);
    const body = await resp.json();
    expect(body.error).toContain('entitySet');
  });

  // ───── Log API ─────

  test('log API returns log directory info', async ({ request }) => {
    const resp = await request.get('/api/logs');
    expect(resp.ok()).toBeTruthy();
    const body = await resp.json();
    expect(body).toHaveProperty('logDir');
    expect(body).toHaveProperty('files');
  });

  test('log toggle endpoint works', async ({ request }) => {
    const resp = await request.post('/api/logs/toggle', {
      data: { enabled: true }
    });
    expect(resp.ok()).toBeTruthy();
    const body = await resp.json();
    expect(body.ok).toBe(true);
  });

  test('log clear endpoint works', async ({ request }) => {
    const resp = await request.delete('/api/logs');
    expect(resp.ok()).toBeTruthy();
    const body = await resp.json();
    expect(body.ok).toBe(true);
  });

  // ───── Tooltips ─────

  test('Quick CRM buttons have tooltip attributes', async ({ page }) => {
    await expect(page.locator('[data-crm-action="drill"]')).toHaveAttribute('data-tooltip');
    await expect(page.locator('[data-crm-action="milestones"]')).toHaveAttribute('data-tooltip');
    await expect(page.locator('[data-crm-action="opportunities"]')).toHaveAttribute('data-tooltip');
    await expect(page.locator('[data-crm-action="accounts"]')).toHaveAttribute('data-tooltip');
  });

  test('tooltip popup element exists and is hidden', async ({ page }) => {
    const tooltip = page.locator('#tooltip-popup');
    await expect(tooltip).toHaveClass(/hidden/);
  });

  test('hovering a button with tooltip shows popup', async ({ page }) => {
    const btn = page.locator('[data-crm-action="drill"]');
    await btn.hover();
    await page.waitForTimeout(500);
    const tooltip = page.locator('#tooltip-popup');
    await expect(tooltip).not.toHaveClass(/hidden/);
    await expect(tooltip).toContainText(/anything|TPID|opportunity|milestone|GUID/i);
  });

  // ───── Log Viewer FAB ─────

  test('log viewer FAB with Matrix canvas is visible', async ({ page }) => {
    const fab = page.locator('#log-fab');
    await expect(fab).toBeVisible();
    const canvas = fab.locator('#matrix-canvas');
    await expect(canvas).toBeVisible();
    // Matrix canvas should have expected dimensions
    await expect(canvas).toHaveAttribute('width', '52');
    await expect(canvas).toHaveAttribute('height', '52');
  });

  test('Matrix canvas is rendering (has non-transparent pixels)', async ({ page }) => {
    // Wait for a few animation frames
    await page.waitForTimeout(500);
    const hasPixels = await page.evaluate(() => {
      const c = document.getElementById('matrix-canvas');
      if (!c) return false;
      const ctx = c.getContext('2d');
      const data = ctx.getImageData(0, 0, c.width, c.height).data;
      for (let i = 3; i < data.length; i += 4) {
        if (data[i] > 0) return true;  // any non-transparent pixel
      }
      return false;
    });
    expect(hasPixels).toBe(true);
  });

  // ───── Owner Auto-Redirect ─────

  test('clicking drill-down with only owner email auto-redirects to owner-milestones', async ({ page }) => {
    // Fill owner email but leave main search empty
    await page.fill('#crm-owner-input', 'test@microsoft.com');
    await page.click('[data-crm-action="drill"]');
    // Should trigger CRM query (status changes from empty) not just flash the input
    const statusLine = page.locator('#crm-status-line');
    await expect(statusLine).not.toHaveText('');
  });

  test('clicking accounts with only owner email auto-redirects to owner-milestones', async ({ page }) => {
    await page.fill('#crm-owner-input', 'sautalwar@microsoft.com');
    await page.click('[data-crm-action="accounts"]');
    const statusLine = page.locator('#crm-status-line');
    await expect(statusLine).not.toHaveText('');
  });

  test('clicking log FAB opens popup', async ({ page }) => {
    const popup = page.locator('#log-popup');
    await expect(popup).toHaveClass(/hidden/);
    await page.click('#log-fab');
    await expect(popup).not.toHaveClass(/hidden/);
  });

  test('log popup has view, toggle, and clear buttons', async ({ page }) => {
    await page.click('#log-fab');
    await expect(page.locator('#log-view-btn')).toBeVisible();
    await expect(page.locator('#log-toggle-btn')).toBeVisible();
    await expect(page.locator('#log-clear-btn')).toBeVisible();
  });

  test('clicking view logs button loads log content', async ({ page }) => {
    await page.click('#log-fab');
    await page.click('#log-view-btn');
    const content = page.locator('#log-popup-content');
    await expect(content).not.toHaveClass(/hidden/);
  });

  test('log popup close button works', async ({ page }) => {
    await page.click('#log-fab');
    await expect(page.locator('#log-popup')).not.toHaveClass(/hidden/);
    await page.click('#log-popup-close');
    await expect(page.locator('#log-popup')).toHaveClass(/hidden/);
  });

  // ───── Screenshot Paste ─────

  test('screenshot preview is hidden by default', async ({ page }) => {
    await expect(page.locator('#screenshot-preview')).toHaveClass(/hidden/);
  });

  test('chat input placeholder mentions screenshots', async ({ page }) => {
    const placeholder = await page.locator('#chat-input').getAttribute('placeholder');
    expect(placeholder).toContain('screenshot');
  });

  // ───── Email Filter ─────

  test('email filter input is visible', async ({ page }) => {
    const input = page.locator('#email-filter-input');
    await expect(input).toBeVisible();
  });

  test('search emails button has tooltip', async ({ page }) => {
    await expect(page.locator('[data-action="search-emails"]')).toHaveAttribute('data-tooltip');
  });

  // ───── Quick CRM section order ─────

  test('CRM-Direct section appears before Portfolio', async ({ page }) => {
    const texts = await page.locator('.sidebar-section h3, .crm-section-toggle').allTextContents();
    const crmIdx = texts.findIndex(t => t.includes('CRM-Direct'));
    const portfolioIdx = texts.findIndex(t => t.includes('Portfolio'));
    expect(crmIdx).toBeGreaterThanOrEqual(0);
    expect(portfolioIdx).toBeGreaterThan(crmIdx);
  });

  // ───── End-to-End Live CRM ─────

  test('Smart Lookup shows results or auth error', async ({ page }) => {
    await page.fill('#crm-search-input', '10078633');
    await page.click('[data-crm-action="drill"]');
    await page.waitForFunction(() => {
      const s = document.getElementById('crm-status-line');
      return s && s.textContent && !s.textContent.includes('Querying');
    }, { timeout: 30000 });
    const msgs = page.locator('.message.assistant, .message.error');
    await expect(msgs.first()).toBeVisible({ timeout: 5000 });
  });

  test('CRM opportunity search by name works', async ({ page }) => {
    await page.fill('#crm-search-input', 'T-Mobile');
    await page.click('[data-crm-action="opportunities"]');
    await page.waitForFunction(() => {
      const s = document.getElementById('crm-status-line');
      return s && s.textContent && !s.textContent.includes('Querying');
    }, { timeout: 30000 });
    const msgs = page.locator('.message.assistant, .message.error');
    await expect(msgs.first()).toBeVisible({ timeout: 5000 });
  });

  // ───── Quit Button ─────

  test('quit button is visible next to Matrix FAB', async ({ page }) => {
    const fabGroup = page.locator('.fab-group');
    await expect(fabGroup).toBeVisible();
    const quitBtn = page.locator('#quit-btn');
    await expect(quitBtn).toBeVisible();
    await expect(quitBtn).toContainText('Quit');
    await expect(fabGroup.locator('#matrix-canvas')).toBeVisible();
  });

  // ───── Existing features still work ─────

  test('existing sidebar actions still work', async ({ page }) => {
    await expect(page.locator('[data-action="view-portfolio"]')).toBeVisible();
    await expect(page.locator('[data-action="analyze-account"]')).toBeVisible();
    await expect(page.locator('[data-action="reset"]')).toBeVisible();
  });

  test('health API still works', async ({ request }) => {
    const resp = await request.get('/api/health');
    expect(resp.ok()).toBeTruthy();
    const body = await resp.json();
    expect(body.status).toBe('ok');
  });
});
