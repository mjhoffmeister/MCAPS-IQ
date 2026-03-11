import { test, expect } from '@playwright/test';

test.describe('MSX Dashboard', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  // ───── Page Load & Structure ─────

  test('loads the page with correct title', async ({ page }) => {
    await expect(page).toHaveTitle('MSX Dashboard');
  });

  test('shows the header with logo and title', async ({ page }) => {
    await expect(page.locator('#dashboard-title')).toHaveText('MSX Dashboard');
    // No role selector should exist
    await expect(page.locator('#role-select')).toHaveCount(0);
  });

  test('shows the sidebar with all action sections', async ({ page }) => {
    // Portfolio section
    await expect(page.locator('[data-action="view-portfolio"]')).toBeVisible();
    await expect(page.locator('[data-action="plan-week"]')).toBeVisible();
    await expect(page.locator('[data-action="review-milestones"]')).toBeVisible();
    await expect(page.locator('[data-action="extract-ghcp-seats"]')).toBeVisible();

    // Account section
    await expect(page.locator('#account-input')).toBeVisible();
    await expect(page.locator('[data-action="analyze-account"]')).toBeVisible();
    await expect(page.locator('[data-action="check-comms"]')).toBeVisible();
    await expect(page.locator('[data-action="enrich-account"]')).toBeVisible();
    await expect(page.locator('[data-action="search-emails"]')).toBeVisible();

    // Meetings section - text input + date picker
    await expect(page.locator('#meeting-input')).toBeVisible();
    await expect(page.locator('#meeting-date')).toBeVisible();
    await expect(page.locator('[data-action="prep-meeting"]')).toBeVisible();
    await expect(page.locator('[data-action="recap-meeting"]')).toBeVisible();

    // People section
    await expect(page.locator('#person-input')).toBeVisible();
    await expect(page.locator('[data-action="lookup-person"]')).toBeVisible();
    await expect(page.locator('[data-action="search-teams"]')).toBeVisible();

    // Session
    await expect(page.locator('[data-action="reset"]')).toBeVisible();
  });

  test('chat input area is visible with send button', async ({ page }) => {
    await expect(page.locator('#chat-input')).toBeVisible();
    await expect(page.locator('#send-btn')).toBeVisible();
  });

  test('welcome message is displayed', async ({ page }) => {
    const welcome = page.locator('.message.system .message-content');
    await expect(welcome).toContainText('MSX Dashboard');
    await expect(welcome).toContainText('AccountTracker');
  });

  // ───── Theme Toggle ─────

  test('theme toggle button is visible', async ({ page }) => {
    await expect(page.locator('#theme-toggle')).toBeVisible();
  });

  test('clicking theme toggle switches to light mode', async ({ page }) => {
    // Start in dark mode (default)
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');

    // Click toggle
    await page.click('#theme-toggle');

    // Should switch to light mode
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'light');
  });

  test('clicking theme toggle twice returns to dark mode', async ({ page }) => {
    await page.click('#theme-toggle');
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'light');

    await page.click('#theme-toggle');
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
  });

  test('theme preference persists in localStorage', async ({ page }) => {
    await page.click('#theme-toggle');

    const theme = await page.evaluate(() => localStorage.getItem('msx-theme'));
    expect(theme).toBe('light');
  });

  test('light mode has visible background differences', async ({ page }) => {
    // Get dark mode background
    const darkBg = await page.evaluate(() =>
      getComputedStyle(document.body).backgroundColor
    );

    await page.click('#theme-toggle');

    // Get light mode background
    const lightBg = await page.evaluate(() =>
      getComputedStyle(document.body).backgroundColor
    );

    expect(darkBg).not.toBe(lightBg);
  });

  // ───── Account Dropdown ─────

  test('account input has a datalist for dropdown', async ({ page }) => {
    const input = page.locator('#account-input');
    await expect(input).toHaveAttribute('list', 'account-list');
    await expect(page.locator('#account-list')).toBeAttached();
  });

  test('accounts API returns array', async ({ request }) => {
    const resp = await request.get('/api/accounts');
    expect(resp.ok()).toBeTruthy();
    const body = await resp.json();
    expect(Array.isArray(body)).toBeTruthy();
  });

  test('accounts API returns objects with name field', async ({ request }) => {
    const resp = await request.get('/api/accounts');
    const accounts = await resp.json();
    if (accounts.length > 0) {
      expect(accounts[0]).toHaveProperty('name');
    }
  });

  test('datalist is populated from API on load', async ({ page }) => {
    // Wait for fetch to complete
    await page.waitForTimeout(500);

    const optionCount = await page.locator('#account-list option').count();
    // Should have at least some accounts (from .docs/_index.md or _data/)
    expect(optionCount).toBeGreaterThan(0);
  });

  // ───── Date Picker ─────

  test('meeting date picker is type=date', async ({ page }) => {
    const datePicker = page.locator('#meeting-date');
    await expect(datePicker).toHaveAttribute('type', 'date');
  });

  test('date picker accepts a date value', async ({ page }) => {
    await page.fill('#meeting-date', '2026-03-07');
    await expect(page.locator('#meeting-date')).toHaveValue('2026-03-07');
  });

  // ───── Connection ─────

  test('connection indicator shows connected status', async ({ page }) => {
    await page.waitForFunction(() => {
      const label = document.querySelector('.connection-indicator .label');
      return label && label.textContent === 'Connected';
    }, { timeout: 5000 });

    await expect(page.locator('.connection-indicator')).toHaveClass(/connected/);
  });

  // ───── Input Validation ─────

  test('action buttons requiring input flash when input is empty', async ({ page }) => {
    await page.click('[data-action="analyze-account"]');
    await expect(page.locator('#account-input')).toBeFocused();
  });

  test('action buttons send messages when input is provided', async ({ page }) => {
    await page.waitForFunction(() => {
      const label = document.querySelector('.connection-indicator .label');
      return label && label.textContent === 'Connected';
    }, { timeout: 5000 });

    await page.fill('#account-input', 'T-Mobile');
    await page.click('[data-action="analyze-account"]');

    await expect(page.locator('.message.user').first()).toContainText('T-Mobile');
  });

  test('meeting prep sends both name and date when provided', async ({ page }) => {
    await page.waitForFunction(() => {
      const label = document.querySelector('.connection-indicator .label');
      return label && label.textContent === 'Connected';
    }, { timeout: 5000 });

    await page.fill('#meeting-input', 'Quarterly Review');
    await page.fill('#meeting-date', '2026-03-10');
    await page.click('[data-action="prep-meeting"]');

    const msg = page.locator('.message.user').first();
    await expect(msg).toContainText('Quarterly Review');
    await expect(msg).toContainText('2026-03-10');
  });

  // ───── Portfolio Actions (no input required) ─────

  test('portfolio buttons work without input', async ({ page }) => {
    await page.waitForFunction(() => {
      const label = document.querySelector('.connection-indicator .label');
      return label && label.textContent === 'Connected';
    }, { timeout: 5000 });

    await page.click('[data-action="view-portfolio"]');
    await expect(page.locator('.message.user').first()).toContainText('view-portfolio');
  });

  // ───── Chat Interaction ─────

  test('chat input sends message on Enter', async ({ page }) => {
    await page.waitForFunction(() => {
      const label = document.querySelector('.connection-indicator .label');
      return label && label.textContent === 'Connected';
    }, { timeout: 5000 });

    await page.fill('#chat-input', 'Hello test');
    await page.press('#chat-input', 'Enter');

    await expect(page.locator('.message.user').first()).toContainText('Hello test');
    await expect(page.locator('#chat-input')).toHaveValue('');
  });

  test('Shift+Enter does not send, adds newline', async ({ page }) => {
    await page.fill('#chat-input', 'Line 1');
    await page.press('#chat-input', 'Shift+Enter');
    const userMessages = page.locator('.message.user');
    await expect(userMessages).toHaveCount(0);
  });

  // ───── Session Reset ─────

  test('reset session clears chat to welcome', async ({ page }) => {
    await page.waitForFunction(() => {
      const label = document.querySelector('.connection-indicator .label');
      return label && label.textContent === 'Connected';
    }, { timeout: 5000 });

    // Add a user message directly to the chat (avoids busy-state from SDK response)
    await page.evaluate(() => {
      const chat = document.getElementById('chat-messages');
      const msg = document.createElement('div');
      msg.className = 'message user';
      msg.innerHTML = '<div class="message-content">Test message</div>';
      chat.appendChild(msg);
    });
    await expect(page.locator('.message.user')).toHaveCount(1);

    await page.click('[data-action="reset"]');

    await expect(page.locator('.message.system .message-content')).toContainText('MSX Dashboard');
    await expect(page.locator('.message.user')).toHaveCount(0);
  });

  // ───── Dynamic Title ─────

  test('dashboard subtitle updates when account action is used', async ({ page }) => {
    await page.waitForFunction(() => {
      const label = document.querySelector('.connection-indicator .label');
      return label && label.textContent === 'Connected';
    }, { timeout: 5000 });

    // Subtitle should be empty initially
    await expect(page.locator('#dashboard-subtitle')).toHaveText('');

    // Enter account and click analyze
    await page.fill('#account-input', 'COMCAST');
    await page.click('[data-action="analyze-account"]');

    // Subtitle should show the account name
    await expect(page.locator('#dashboard-subtitle')).toHaveText('COMCAST');
  });

  test('subtitle clears on session reset', async ({ page }) => {
    await page.waitForFunction(() => {
      const label = document.querySelector('.connection-indicator .label');
      return label && label.textContent === 'Connected';
    }, { timeout: 5000 });

    // Set subtitle directly via JS (avoids busy-state blocking from SDK response)
    await page.evaluate(() => {
      document.getElementById('dashboard-subtitle').textContent = 'T-Mobile';
    });
    await expect(page.locator('#dashboard-subtitle')).toHaveText('T-Mobile');

    await page.click('[data-action="reset"]');
    await expect(page.locator('#dashboard-subtitle')).toHaveText('');
  });

  // ───── Health API ─────

  test('health API returns ok', async ({ request }) => {
    const resp = await request.get('/api/health');
    expect(resp.ok()).toBeTruthy();
    const body = await resp.json();
    expect(body.status).toBe('ok');
  });

  // ───── Agent Arena ─────

  test('agent arena shows idle animals by default', async ({ page }) => {
    const arena = page.locator('#agent-arena');
    await expect(arena).toHaveClass(/idle/);
    await expect(arena).toBeVisible();
  });

  test('agent arena has all animal agents', async ({ page }) => {
    const slots = page.locator('.agent-slot');
    await expect(slots).toHaveCount(11);
    await expect(page.locator('[data-agent="orchestrator"] .agent-avatar')).toContainText('🦊');
    await expect(page.locator('[data-agent="msx-crm"] .agent-avatar')).toContainText('🐘');
    await expect(page.locator('[data-agent="outlook-local"] .agent-avatar')).toContainText('🦉');
    await expect(page.locator('[data-agent="teams-local"] .agent-avatar')).toContainText('🐬');
    await expect(page.locator('[data-agent="calendar"] .agent-avatar')).toContainText('🐱');
    await expect(page.locator('[data-agent="composer"] .agent-avatar')).toContainText('🐦');
    await expect(page.locator('[data-agent="analyst"] .agent-avatar')).toContainText('🐼');
    await expect(page.locator('[data-agent="browser"] .agent-avatar')).toContainText('🐙');
    await expect(page.locator('[data-agent="researcher"] .agent-avatar')).toContainText('🦝');
    await expect(page.locator('[data-agent="sharepoint"] .agent-avatar')).toContainText('🐢');
    await expect(page.locator('[data-agent="strategy"] .agent-avatar')).toContainText('🦁');
  });

  test('agent arena has ball element', async ({ page }) => {
    const ball = page.locator('#arena-ball');
    await expect(ball).toContainText('⚽');
  });

  test('agent arena shows when busy after sending message', async ({ page }) => {
    await page.waitForFunction(() => {
      const label = document.querySelector('.connection-indicator .label');
      return label && label.textContent === 'Connected';
    }, { timeout: 5000 });

    await page.fill('#chat-input', 'Test busy state');
    await page.press('#chat-input', 'Enter');

    const arena = page.locator('#agent-arena');
    await expect(arena).not.toHaveClass(/hidden/, { timeout: 2000 });
  });

  // ───── No Role Selector ─────

  test('role selector is completely removed', async ({ page }) => {
    await expect(page.locator('.role-selector')).toHaveCount(0);
    await expect(page.locator('#role-select')).toHaveCount(0);
  });

  // ───── Responsive Design ─────

  test('sidebar collapses on small screens', async ({ page }) => {
    await page.setViewportSize({ width: 600, height: 800 });
    const sidebar = page.locator('.sidebar');
    const sidebarWidth = await sidebar.evaluate(el => el.getBoundingClientRect().width);
    expect(sidebarWidth).toBeLessThanOrEqual(80);
  });

  // ───── Visual Regression: Light vs Dark ─────

  test('light mode changes text color', async ({ page }) => {
    const darkTextColor = await page.evaluate(() =>
      getComputedStyle(document.body).color
    );

    await page.click('#theme-toggle');

    const lightTextColor = await page.evaluate(() =>
      getComputedStyle(document.body).color
    );

    expect(darkTextColor).not.toBe(lightTextColor);
  });

  test('light mode changes sidebar background', async ({ page }) => {
    const darkBg = await page.evaluate(() =>
      getComputedStyle(document.querySelector('.sidebar')).backgroundColor
    );

    await page.click('#theme-toggle');

    const lightBg = await page.evaluate(() =>
      getComputedStyle(document.querySelector('.sidebar')).backgroundColor
    );

    expect(darkBg).not.toBe(lightBg);
  });

  // ───── Footer Label (removed — no branding in chat input) ─────
});
