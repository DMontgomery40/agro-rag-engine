"""
Interaction Tests for AGRO GUI
Tests user interactions and workflows
"""
import pytest
from playwright.sync_api import Page, expect


def test_cost_calculator_interaction(page: Page):
    """Test cost calculator interaction"""
    page.goto("http://127.0.0.1:8012/")
    
    # Fill in cost calculator inputs
    page.fill("#cost-in", "1000")
    page.fill("#cost-out", "2000")
    page.fill("#cost-rpd", "50")
    
    # Click calculate button
    page.click("#btn-estimate")
    
    # Wait for response
    page.wait_for_timeout(1000)
    
    # Check that results are displayed (not just dashes)
    daily = page.locator("#cost-daily")
    expect(daily).not_to_contain_text("—")


def test_profile_save_interaction(page: Page):
    """Test saving a profile"""
    page.goto("http://127.0.0.1:8012/")
    
    # Enter profile name
    test_profile_name = "test-profile-playwright"
    page.fill("#profile-name", test_profile_name)
    
    # Click save button
    page.click("#btn-save-profile")
    
    # Wait for save operation
    page.wait_for_timeout(1000)
    
    # Verify profile appears in list (if profiles list is visible)
    # This might show in an alert or list - adjust based on actual behavior


def test_model_selection_changes(page: Page):
    """Test changing model selections"""
    page.goto("http://127.0.0.1:8012/")
    
    # Navigate to Models tab
    page.click("button:has-text('Models')")
    
    # Change primary model
    gen_model_input = page.locator("input[name='GEN_MODEL']")
    expect(gen_model_input).to_be_visible()
    gen_model_input.fill("gpt-4o")
    
    # Verify input was changed
    expect(gen_model_input).to_have_value("gpt-4o")


def test_retrieval_parameters_editable(page: Page):
    """Test that retrieval parameters can be edited"""
    page.goto("http://127.0.0.1:8012/")
    
    # Navigate to Retrieval tab
    page.click("button:has-text('Retrieval')")
    
    # Change Multi-Query Rewrites
    mq_input = page.locator("input[name='MQ_REWRITES']")
    expect(mq_input).to_be_visible()
    mq_input.fill("5")
    expect(mq_input).to_have_value("5")
    
    # Change Final K
    final_k_input = page.locator("input[name='FINAL_K']")
    expect(final_k_input).to_be_visible()
    final_k_input.fill("20")
    expect(final_k_input).to_have_value("20")


def test_infrastructure_settings_visible(page: Page):
    """Test infrastructure settings are visible and editable"""
    page.goto("http://127.0.0.1:8012/")
    
    # Navigate to Infrastructure tab
    page.click("button:has-text('Infrastructure')")
    
    # Check Qdrant URL field
    qdrant_input = page.locator("input[name='QDRANT_URL']")
    expect(qdrant_input).to_be_visible()
    expect(qdrant_input).to_have_value("http://127.0.0.1:6333")
    
    # Check Redis URL field
    redis_input = page.locator("input[name='REDIS_URL']")
    expect(redis_input).to_be_visible()
    expect(redis_input).to_have_value("redis://127.0.0.1:6379/0")


def test_auto_profile_budget_input(page: Page):
    """Test auto-profile budget input"""
    page.goto("http://127.0.0.1:8012/")
    
    # Should be on dashboard by default
    budget_input = page.locator("#budget")
    expect(budget_input).to_be_visible()
    
    # Change budget value
    budget_input.fill("100")
    expect(budget_input).to_have_value("100")


def test_git_hooks_status_check(page: Page):
    """Test git hooks status check"""
    page.goto("http://127.0.0.1:8012/")
    
    # Navigate to Tools tab
    page.click("button:has-text('Tools')")
    
    # Check hooks status is displayed
    hooks_status = page.locator("#hooks-status")
    expect(hooks_status).to_be_visible()


def test_wizard_oneclick_button(page: Page):
    """Test the wizard one-click configuration button"""
    page.goto("http://127.0.0.1:8012/")
    
    # Should be on dashboard
    wizard_btn = page.locator("#btn-wizard-oneclick")
    expect(wizard_btn).to_be_visible()
    expect(wizard_btn).to_contain_text("Configure Automatically")


def test_responsive_sidebar(page: Page):
    """Test that sidebar is visible and contains expected sections"""
    page.goto("http://127.0.0.1:8012/")
    
    # Check sidepanel is visible
    expect(page.locator(".sidepanel")).to_be_visible()
    
    # Check all expected sections
    sections = [
        "Live Cost Calculator",
        "Profiles",
        "Auto‑Tune",
        "Secrets Ingest"
    ]
    
    for section in sections:
        expect(page.locator(f"h4:has-text('{section}')")).to_be_visible()


def test_secrets_dropzone_present(page: Page):
    """Test that secrets dropzone is present"""
    page.goto("http://127.0.0.1:8012/")
    
    dropzone = page.locator("#dropzone")
    expect(dropzone).to_be_visible()
    expect(dropzone).to_contain_text("Drop .env")
