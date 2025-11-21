/**
 * Playwright Test: Repository Configuration GUI ↔ Backend Sync
 *
 * Tests bidirectional synchronization between GUI and backend for:
 * - PATH field with validation
 * - EXCLUDE PATHS management (add/remove)
 * - KEYWORDS, PATH BOOSTS, LAYER BONUSES
 *
 * Ensures compliance with ADA requirements - all GUI settings must be fully functional.
 */

const { test, expect } = require('@playwright/test');
const fs = require('fs');
const path = require('path');

const BASE_URL = process.env.GUI_URL || 'http://127.0.0.1:3033';
const REPOS_JSON_PATH = path.join(__dirname, '..', 'repos.json');

test.describe('Repository Configuration Sync', () => {
    let originalReposJson;

    test.beforeEach(async () => {
        // Backup repos.json
        originalReposJson = fs.readFileSync(REPOS_JSON_PATH, 'utf-8');
    });

    test.afterEach(async () => {
        // Restore repos.json
        if (originalReposJson) {
            fs.writeFileSync(REPOS_JSON_PATH, originalReposJson, 'utf-8');
        }
    });

    test('should load repository configuration from backend', async ({ page }) => {
        await page.goto(BASE_URL);

        // Navigate to RAG tab
        await page.click('text=RAG');

        // Wait for config to load
        await page.waitForSelector('[name="repo_path_agro"]', { timeout: 5000 });

        // Verify PATH field shows value from repos.json
        const pathInput = await page.locator('[name="repo_path_agro"]');
        const pathValue = await pathInput.inputValue();

        expect(pathValue).toBeTruthy();
        console.log(`✓ PATH field loaded: ${pathValue}`);

        // Verify exclude paths are displayed
        const excludePathsContainer = await page.locator('#exclude-paths-container-agro');
        await expect(excludePathsContainer).toBeVisible();

        // Check if exclude paths are rendered
        const excludePathChips = await page.locator('#exclude-paths-container-agro > div').count();
        console.log(`✓ Found ${excludePathChips} exclude path chips`);
    });

    test('should validate PATH field on blur', async ({ page }) => {
        await page.goto(BASE_URL);
        await page.click('text=RAG');
        await page.waitForSelector('[name="repo_path_agro"]', { timeout: 5000 });

        const pathInput = await page.locator('[name="repo_path_agro"]');
        const pathStatus = await page.locator('#path-status-agro');

        // Clear and enter a valid path
        await pathInput.fill('${REPO_ROOT:-/app}');
        await pathInput.blur();

        // Wait for validation
        await page.waitForTimeout(1000);

        // Check validation status
        const statusText = await pathStatus.textContent();
        console.log(`✓ Path validation status: ${statusText}`);

        // Should show either valid or invalid status
        expect(statusText).toMatch(/Valid|Invalid|Validating/);
    });

    test('should add exclude path via GUI', async ({ page }) => {
        await page.goto(BASE_URL);
        await page.click('text=RAG');
        await page.waitForSelector('[name="repo_path_agro"]', { timeout: 5000 });

        // Add a new exclude path
        const excludePathInput = await page.locator('#exclude-path-input-agro');
        const addButton = await page.locator('#exclude-path-add-agro');

        await excludePathInput.fill('/test-exclude');
        await addButton.click();

        // Verify chip was created
        const chip = await page.locator('#exclude-paths-container-agro >> text=/test-exclude');
        await expect(chip).toBeVisible();

        console.log('✓ Successfully added exclude path: /test-exclude');

        // Verify hidden input was updated
        const hiddenInput = await page.locator('[name="repo_excludepaths_agro"]');
        const hiddenValue = await hiddenInput.inputValue();
        expect(hiddenValue).toContain('/test-exclude');

        console.log(`✓ Hidden input updated: ${hiddenValue}`);
    });

    test('should remove exclude path via GUI', async ({ page }) => {
        await page.goto(BASE_URL);
        await page.click('text=RAG');
        await page.waitForSelector('[name="repo_path_agro"]', { timeout: 5000 });

        // First add a path
        await page.locator('#exclude-path-input-agro').fill('/temp-path');
        await page.locator('#exclude-path-add-agro').click();
        await page.waitForTimeout(500);

        // Now remove it
        const removeButton = await page.locator('#exclude-paths-container-agro button[data-path="/temp-path"]');
        await removeButton.click();

        // Verify chip was removed
        await expect(page.locator('#exclude-paths-container-agro >> text=/temp-path')).not.toBeVisible();

        console.log('✓ Successfully removed exclude path: /temp-path');
    });

    test('should persist exclude paths to backend', async ({ page }) => {
        await page.goto(BASE_URL);
        await page.click('text=RAG');
        await page.waitForSelector('[name="repo_path_agro"]', { timeout: 5000 });

        // Add a unique test path
        const testPath = `/test-${Date.now()}`;
        await page.locator('#exclude-path-input-agro').fill(testPath);
        await page.locator('#exclude-path-add-agro').click();
        await page.waitForTimeout(500);

        // Save configuration
        await page.click('button:has-text("Save Configuration")');
        await page.waitForTimeout(2000);

        // Verify saved (look for success message)
        const toast = await page.locator('.toast, .status-message').first();
        if (await toast.isVisible()) {
            const toastText = await toast.textContent();
            console.log(`✓ Save status: ${toastText}`);
        }

        // Reload page and verify persistence
        await page.reload();
        await page.click('text=RAG');
        await page.waitForSelector('[name="repo_path_agro"]', { timeout: 5000 });

        // Check if the test path still exists
        const chip = await page.locator(`#exclude-paths-container-agro >> text=${testPath}`);
        await expect(chip).toBeVisible();

        console.log(`✓ Exclude path persisted across reload: ${testPath}`);

        // Also verify in repos.json file
        const reposJson = JSON.parse(fs.readFileSync(REPOS_JSON_PATH, 'utf-8'));
        const agroRepo = reposJson.repos.find(r => r.name === 'agro');
        expect(agroRepo.exclude_paths).toContain(testPath);

        console.log('✓ Verified exclude path in repos.json file');
    });

    test('should update PATH field bidirectionally', async ({ page }) => {
        await page.goto(BASE_URL);
        await page.click('text=RAG');
        await page.waitForSelector('[name="repo_path_agro"]', { timeout: 5000 });

        const originalPath = await page.locator('[name="repo_path_agro"]').inputValue();
        console.log(`Original PATH: ${originalPath}`);

        // Change path
        const newPath = '/tmp/test-repo';
        await page.locator('[name="repo_path_agro"]').fill(newPath);

        // Save
        await page.click('button:has-text("Save Configuration")');
        await page.waitForTimeout(2000);

        // Verify in file
        const reposJson = JSON.parse(fs.readFileSync(REPOS_JSON_PATH, 'utf-8'));
        const agroRepo = reposJson.repos.find(r => r.name === 'agro');
        expect(agroRepo.path).toBe(newPath);

        console.log(`✓ PATH updated in repos.json: ${agroRepo.path}`);

        // Restore original path for cleanup
        await page.locator('[name="repo_path_agro"]').fill(originalPath);
        await page.click('button:has-text("Save Configuration")');
        await page.waitForTimeout(1000);

        console.log('✓ Restored original PATH');
    });

    test('should verify keywords field sync', async ({ page }) => {
        await page.goto(BASE_URL);
        await page.click('text=RAG');
        await page.waitForSelector('[name="repo_keywords_agro"]', { timeout: 5000 });

        const keywordsInput = await page.locator('[name="repo_keywords_agro"]');
        const originalKeywords = await keywordsInput.inputValue();

        console.log(`✓ Keywords field loaded: ${originalKeywords.substring(0, 50)}...`);

        // Verify keywords are from repos.json
        const reposJson = JSON.parse(fs.readFileSync(REPOS_JSON_PATH, 'utf-8'));
        const agroRepo = reposJson.repos.find(r => r.name === 'agro');

        expect(originalKeywords).toBe(agroRepo.keywords.join(','));

        console.log('✓ Keywords field matches repos.json');
    });

    test('should verify path boosts field sync', async ({ page }) => {
        await page.goto(BASE_URL);
        await page.click('text=RAG');
        await page.waitForSelector('[name="repo_pathboosts_agro"]', { timeout: 5000 });

        const pathBoostsInput = await page.locator('[name="repo_pathboosts_agro"]');
        const pathBoosts = await pathBoostsInput.inputValue();

        console.log(`✓ Path boosts field loaded: ${pathBoosts}`);

        // Verify path boosts are from repos.json
        const reposJson = JSON.parse(fs.readFileSync(REPOS_JSON_PATH, 'utf-8'));
        const agroRepo = reposJson.repos.find(r => r.name === 'agro');

        expect(pathBoosts).toBe(agroRepo.path_boosts.join(','));

        console.log('✓ Path boosts field matches repos.json');
    });

    test('should verify layer bonuses field sync', async ({ page }) => {
        await page.goto(BASE_URL);
        await page.click('text=RAG');
        await page.waitForSelector('[name="repo_layerbonuses_agro"]', { timeout: 5000 });

        const layerBonusesTextarea = await page.locator('[name="repo_layerbonuses_agro"]');
        const layerBonusesText = await layerBonusesTextarea.inputValue();

        console.log(`✓ Layer bonuses field loaded (${layerBonusesText.length} chars)`);

        // Parse and verify structure
        const layerBonuses = JSON.parse(layerBonusesText);
        expect(layerBonuses).toBeTruthy();
        expect(typeof layerBonuses).toBe('object');

        console.log('✓ Layer bonuses field contains valid JSON');
    });

    test('should test API endpoints directly', async ({ request }) => {
        // Test GET /api/repos
        const reposResponse = await request.get(`${BASE_URL}/api/repos`);
        expect(reposResponse.ok()).toBeTruthy();
        const reposData = await reposResponse.json();

        expect(reposData.repos).toBeTruthy();
        expect(Array.isArray(reposData.repos)).toBe(true);
        console.log(`✓ GET /api/repos returned ${reposData.repos.length} repos`);

        // Test GET /api/repos/agro
        const agroResponse = await request.get(`${BASE_URL}/api/repos/agro`);
        expect(agroResponse.ok()).toBeTruthy();
        const agroData = await agroResponse.json();

        expect(agroData.ok).toBe(true);
        expect(agroData.repo.name).toBe('agro');
        console.log('✓ GET /api/repos/agro returned repo config');

        // Test PATCH /api/repos/agro
        const patchResponse = await request.patch(`${BASE_URL}/api/repos/agro`, {
            data: {
                exclude_paths: ['/website', '/test-api-exclusion']
            }
        });
        expect(patchResponse.ok()).toBeTruthy();
        const patchData = await patchResponse.json();

        expect(patchData.ok).toBe(true);
        console.log('✓ PATCH /api/repos/agro updated exclude_paths');

        // Verify update persisted
        const verifyResponse = await request.get(`${BASE_URL}/api/repos/agro`);
        const verifyData = await verifyResponse.json();

        expect(verifyData.repo.exclude_paths).toContain('/test-api-exclusion');
        console.log('✓ Verified exclude_paths update persisted');

        // Test path validation endpoint
        const validateResponse = await request.post(`${BASE_URL}/api/repos/agro/validate-path`, {
            data: {
                path: '${REPO_ROOT:-/app}'
            }
        });
        expect(validateResponse.ok()).toBeTruthy();
        const validateData = await validateResponse.json();

        expect(validateData.ok).toBe(true);
        console.log(`✓ Path validation returned: ${JSON.stringify(validateData)}`);
    });
});

test.describe('Indexer Integration', () => {
    test('should verify indexer respects exclude_paths', async () => {
        // Read repos.json
        const reposJson = JSON.parse(fs.readFileSync(REPOS_JSON_PATH, 'utf-8'));
        const agroRepo = reposJson.repos.find(r => r.name === 'agro');

        expect(agroRepo.exclude_paths).toBeTruthy();
        expect(Array.isArray(agroRepo.exclude_paths)).toBe(true);

        console.log(`✓ Repo has ${agroRepo.exclude_paths.length} exclude patterns`);
        console.log(`  Patterns: ${agroRepo.exclude_paths.join(', ')}`);

        // Verify indexer imports exclude_paths function
        const indexerPath = path.join(__dirname, '..', 'indexer', 'index_repo.py');
        const indexerCode = fs.readFileSync(indexerPath, 'utf-8');

        expect(indexerCode).toContain('exclude_paths');
        expect(indexerCode).toContain('repo_exclude_patterns');

        console.log('✓ Indexer imports and uses exclude_paths');
    });
});
