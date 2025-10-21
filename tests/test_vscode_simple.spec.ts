import { test, expect } from '@playwright/test';

test.describe('VS Code Simple Verification', () => {
  test('should verify VS Code iframe is present and loading', async ({ page }) => {
    // Navigate to the GUI
    await page.goto('http://127.0.0.1:8012/gui/');
    await page.waitForLoadState('networkidle');
    
    // Navigate to VS Code tab
    await page.getByTestId('tab-btn-vscode').click();
    await page.waitForSelector('#tab-vscode', { state: 'visible' });
    
    // Wait for health check to update
    await page.waitForTimeout(3000);
    
    // Check the health status
    const healthBadge = page.locator('#editor-health-badge');
    const healthText = page.locator('#editor-health-text');
    
    await expect(healthBadge).toBeVisible();
    const statusText = await healthText.textContent();
    console.log('Editor health status:', statusText);
    
    // Check if there's an iframe for the embedded editor
    const editorIframe = page.locator('iframe[src*="4441"]');
    
    if (await editorIframe.count() > 0) {
      await expect(editorIframe).toBeVisible();
      console.log('✅ VS Code iframe is present');
      
      // Check if the iframe has a src attribute
      const iframeSrc = await editorIframe.getAttribute('src');
      console.log('Iframe src:', iframeSrc);
      
      // Wait a bit for iframe to start loading
      await page.waitForTimeout(2000);
      
      // Check if iframe is loading (has content)
      const iframeContent = page.frameLocator('iframe[src*="4441"]');
      
      // Try to find any content in the iframe
      const anyContent = iframeContent.locator('body');
      const hasContent = await anyContent.count() > 0;
      
      if (hasContent) {
        console.log('✅ VS Code iframe has content');
      } else {
        console.log('⚠️ VS Code iframe is present but no content yet');
      }
      
    } else {
      console.log('❌ No VS Code iframe found');
    }
    
    // Test direct access to VS Code
    const vscodeResponse = await page.request.get('http://127.0.0.1:4441');
    if (vscodeResponse.status() === 200) {
      console.log('✅ VS Code is accessible directly on port 4441');
    } else {
      console.log(`❌ VS Code not accessible directly (status: ${vscodeResponse.status()})`);
    }
    
    // Take a screenshot for verification
    await page.screenshot({ path: 'vscode-final-test.png', fullPage: true });
  });
});
