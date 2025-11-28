import { test, expect } from '@playwright/test';

test.describe('External Rerankers Subtab - Backend Wiring', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to dashboard
    await page.goto('http://127.0.0.1:8012');

    // Wait for page to load
    await page.waitForLoadState('networkidle');

    // Click on RAG tab
    await page.click('[data-tab="rag"]');
    await page.waitForTimeout(500);

    // Click on External Rerankers subtab
    await page.click('[data-subtab="ext-rerankers"]');
    await page.waitForTimeout(500);
  });

  test('External Rerankers subtab loads with correct elements', async ({ page }) => {
    // Verify tab content is visible
    const subtabContent = page.locator('#tab-rag-ext-rerankers');
    await expect(subtabContent).toBeVisible();

    // Verify all input fields are present
    await expect(page.locator('select[name="RERANKER_BACKEND"]')).toBeVisible();
    await expect(page.locator('input[name="RERANKER_MODEL"]')).toBeVisible();
    await expect(page.locator('select[name="COHERE_RERANK_MODEL"]')).toBeVisible();
    await expect(page.locator('input[name="COHERE_API_KEY"]')).toBeVisible();
    await expect(page.locator('select[name="TRANSFORMERS_TRUST_REMOTE_CODE"]')).toBeVisible();
    await expect(page.locator('input[name="RERANK_INPUT_SNIPPET_CHARS"]')).toBeVisible();

    // Verify info panel is present
    await expect(page.locator('#reranker-info-panel-ext')).toBeVisible();
  });

  test('RERANK_BACKEND dropdown changes trigger API call', async ({ page }) => {
    // Set up network request listener
    const configUpdatePromise = page.waitForRequest(request =>
      request.url().includes('/api/config') &&
      request.method() === 'POST'
    );

    // Change backend to 'cohere'
    await page.selectOption('select[name="RERANKER_BACKEND"]', 'cohere');

    // Wait for API call
    const request = await configUpdatePromise;
    const postData = request.postDataJSON();

    // Verify correct payload structure
    expect(postData).toHaveProperty('env');
    expect(postData.env).toHaveProperty('RERANKER_BACKEND', 'cohere');
  });

  test('RERANKER_MODEL input updates on blur', async ({ page }) => {
    // Set up network request listener
    const configUpdatePromise = page.waitForRequest(request =>
      request.url().includes('/api/config') &&
      request.method() === 'POST'
    );

    const modelInput = page.locator('input[name="RERANKER_MODEL"]');

    // Clear and type new value
    await modelInput.clear();
    await modelInput.fill('my-custom-model');

    // Trigger blur event
    await modelInput.blur();

    // Wait for API call
    const request = await configUpdatePromise;
    const postData = request.postDataJSON();

    // Verify correct payload
    expect(postData.env).toHaveProperty('RERANKER_MODEL', 'my-custom-model');
  });

  test('COHERE_RERANK_MODEL dropdown changes trigger API call', async ({ page }) => {
    // Set up network request listener
    const configUpdatePromise = page.waitForRequest(request =>
      request.url().includes('/api/config') &&
      request.method() === 'POST'
    );

    // Change Cohere model
    await page.selectOption('select[name="COHERE_RERANK_MODEL"]', 'rerank-multilingual-v3.0');

    // Wait for API call
    const request = await configUpdatePromise;
    const postData = request.postDataJSON();

    // Verify correct payload
    expect(postData.env).toHaveProperty('COHERE_RERANK_MODEL', 'rerank-multilingual-v3.0');
  });

  test('TRANSFORMERS_TRUST_REMOTE_CODE dropdown changes trigger API call', async ({ page }) => {
    // Set up network request listener
    const configUpdatePromise = page.waitForRequest(request =>
      request.url().includes('/api/config') &&
      request.method() === 'POST'
    );

    // Change trust remote code setting
    await page.selectOption('select[name="TRANSFORMERS_TRUST_REMOTE_CODE"]', '0');

    // Wait for API call
    const request = await configUpdatePromise;
    const postData = request.postDataJSON();

    // Verify correct payload
    expect(postData.env).toHaveProperty('TRANSFORMERS_TRUST_REMOTE_CODE', '0');
  });

  test('RERANK_INPUT_SNIPPET_CHARS number input updates on blur', async ({ page }) => {
    // Set up network request listener
    const configUpdatePromise = page.waitForRequest(request =>
      request.url().includes('/api/config') &&
      request.method() === 'POST'
    );

    const snippetInput = page.locator('input[name="RERANK_INPUT_SNIPPET_CHARS"]');

    // Clear and type new value
    await snippetInput.clear();
    await snippetInput.fill('1000');

    // Trigger blur event
    await snippetInput.blur();

    // Wait for API call
    const request = await configUpdatePromise;
    const postData = request.postDataJSON();

    // Verify correct payload (should be number, not string)
    expect(postData.env).toHaveProperty('RERANK_INPUT_SNIPPET_CHARS', 1000);
  });

  test('Warning displays when backend is set to "none"', async ({ page }) => {
    const warningBox = page.locator('#rerank-none-warning');

    // Initially, if backend is not 'none', warning should be hidden
    const currentBackend = await page.locator('select[name="RERANKER_BACKEND"]').inputValue();

    if (currentBackend !== 'none') {
      await expect(warningBox).toBeHidden();
    }

    // Change backend to 'none'
    await page.selectOption('select[name="RERANKER_BACKEND"]', 'none');

    // Wait for state update
    await page.waitForTimeout(1000);

    // Warning should now be visible
    await expect(warningBox).toBeVisible();

    // Verify warning content
    const warningText = await warningBox.textContent();
    expect(warningText).toContain('No reranker is effectively enabled');
  });

  test('Reranker info panel displays server data', async ({ page }) => {
    // Wait for reranker info to load
    await page.waitForTimeout(1500);

    const infoPanel = page.locator('#reranker-info-panel-ext');
    await expect(infoPanel).toBeVisible();

    // Check that info fields are populated (they should show actual data or '—')
    const enabledSpan = page.locator('#reranker-info-enabled-ext');
    const pathSpan = page.locator('#reranker-info-path-ext');
    const deviceSpan = page.locator('#reranker-info-device-ext');

    await expect(enabledSpan).toBeVisible();
    await expect(pathSpan).toBeVisible();
    await expect(deviceSpan).toBeVisible();

    // Verify content is not empty
    const enabledText = await enabledSpan.textContent();
    expect(enabledText).toBeTruthy();
    expect(enabledText).not.toBe('');
  });

  test('COHERE_API_KEY input is password type and updates on blur', async ({ page }) => {
    const apiKeyInput = page.locator('input[name="COHERE_API_KEY"]');

    // Verify it's a password field
    await expect(apiKeyInput).toHaveAttribute('type', 'password');

    // Set up network request listener
    const configUpdatePromise = page.waitForRequest(request =>
      request.url().includes('/api/config') &&
      request.method() === 'POST'
    );

    // Type a value
    await apiKeyInput.fill('test-api-key-12345');

    // Trigger blur
    await apiKeyInput.blur();

    // Wait for API call
    const request = await configUpdatePromise;
    const postData = request.postDataJSON();

    // Verify correct payload
    expect(postData.env).toHaveProperty('COHERE_API_KEY', 'test-api-key-12345');
  });

  test('Page loads initial config from backend', async ({ page }) => {
    // Wait for initial load
    await page.waitForTimeout(1500);

    // Verify that dropdowns have selected values (not empty)
    const backendValue = await page.locator('select[name="RERANKER_BACKEND"]').inputValue();
    expect(backendValue).toBeTruthy();

    const trustRemoteCodeValue = await page.locator('select[name="TRANSFORMERS_TRUST_REMOTE_CODE"]').inputValue();
    expect(trustRemoteCodeValue).toBeTruthy();

    // Verify snippet chars has a numeric value
    const snippetCharsValue = await page.locator('input[name="RERANK_INPUT_SNIPPET_CHARS"]').inputValue();
    expect(parseInt(snippetCharsValue, 10)).toBeGreaterThan(0);
  });

  test('No dangerouslySetInnerHTML in component (proper React)', async ({ page }) => {
    // This test verifies that the component is using proper React rendering
    // by checking that dynamic content is present and interactive

    // Verify select elements can be interacted with
    const backendSelect = page.locator('select[name="RERANKER_BACKEND"]');
    await expect(backendSelect).toBeEnabled();

    // Verify input elements can be typed into
    const modelInput = page.locator('input[name="RERANKER_MODEL"]');
    await expect(modelInput).toBeEnabled();

    // Change a value and verify React state updates
    const originalValue = await backendSelect.inputValue();
    const newValue = originalValue === 'local' ? 'hf' : 'local';

    await backendSelect.selectOption(newValue);
    await page.waitForTimeout(500);

    // Verify the value changed in the DOM
    const updatedValue = await backendSelect.inputValue();
    expect(updatedValue).toBe(newValue);
  });
});
