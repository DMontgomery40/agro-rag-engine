"""
Basic GUI Tests for AGRO Configuration Interface
Tests core functionality and navigation
"""
import pytest
import re
from playwright.sync_api import Page, expect


def test_health_endpoint_accessible(page: Page):
    """Test that the health endpoint is accessible"""
    response = page.request.get("http://127.0.0.1:8012/health")
    assert response.ok
    data = response.json()
    assert data["status"] == "healthy"
    assert data["graph_loaded"] == True


def test_gui_loads_successfully(page: Page):
    """Test that the GUI main page loads"""
    page.goto("http://127.0.0.1:8012/")
    expect(page).to_have_title("AGRO — Local Configuration GUI")
    
    # Check that main elements are present
    expect(page.locator(".topbar")).to_be_visible()
    expect(page.locator(".brand")).to_contain_text("AGRO")


def test_tabs_are_present(page: Page):
    """Test that all major tabs are present"""
    page.goto("http://127.0.0.1:8012/")
    
    tabs = [
        "Dashboard",
        "Models",
        "Retrieval",
        "Repos & Indexing",
        "Infrastructure",
        "Tools"
    ]
    
    for tab_name in tabs:
        expect(page.locator(f"button:has-text('{tab_name}')")).to_be_visible()


def test_tab_switching_works(page: Page):
    """Test that clicking tabs changes the active content"""
    page.goto("http://127.0.0.1:8012/")
    
    # Click Models tab
    page.click("button:has-text('Models')")
    expect(page.locator("#tab-generation")).to_be_visible()
    expect(page.locator("button[data-tab='models']")).to_have_class(re.compile("active"))
    
    # Click Infrastructure tab
    page.click("button:has-text('Infrastructure')")
    expect(page.locator("#tab-infra")).to_be_visible()
    expect(page.locator("button[data-tab='infra']")).to_have_class(re.compile("active"))


def test_health_button_works(page: Page):
    """Test that the health check button works"""
    page.goto("http://127.0.0.1:8012/")
    
    # Click health button
    page.click("#btn-health")
    
    # Wait for status update
    page.wait_for_timeout(500)
    
    # Check that health status is updated
    health_status = page.locator("#health-status")
    expect(health_status).not_to_contain_text("—")


def test_dashboard_overview_visible(page: Page):
    """Test that dashboard overview section is visible"""
    page.goto("http://127.0.0.1:8012/")
    
    # Should be on dashboard by default
    expect(page.locator("#tab-dashboard")).to_be_visible()
    expect(page.locator(".settings-section.overview")).to_be_visible()
    expect(page.locator("#dash-health")).to_be_visible()


def test_cost_calculator_present(page: Page):
    """Test that the live cost calculator is present in sidebar"""
    page.goto("http://127.0.0.1:8012/")
    
    expect(page.locator(".sidepanel")).to_be_visible()
    expect(page.locator("h4:has-text('Live Cost Calculator')")).to_be_visible()
    expect(page.locator("#cost-provider")).to_be_visible()
    expect(page.locator("#btn-estimate")).to_be_visible()


def test_profiles_section_visible(page: Page):
    """Test that profiles section is visible"""
    page.goto("http://127.0.0.1:8012/")
    
    expect(page.locator("h4:has-text('Profiles')")).to_be_visible()
    expect(page.locator("#profile-name")).to_be_visible()
    expect(page.locator("#btn-save-profile")).to_be_visible()


def test_global_search_present(page: Page):
    """Test that global search is present"""
    page.goto("http://127.0.0.1:8012/")
    
    search_box = page.locator("#global-search")
    expect(search_box).to_be_visible()
    expect(search_box).to_have_attribute("placeholder", "Search settings (Ctrl+K)")


def test_apply_changes_button_present(page: Page):
    """Test that Apply All Changes button is present"""
    page.goto("http://127.0.0.1:8012/")
    
    expect(page.locator("#save-btn")).to_be_visible()
    expect(page.locator("#save-btn")).to_contain_text("Apply All Changes")


@pytest.mark.parametrize("tab,content_id", [
    ("models", "tab-generation"),
    ("retrieval", "tab-retrieval"),
    ("repos", "tab-repos"),
    ("infra", "tab-infra"),
    ("tools", "tab-tools"),
])
def test_tab_content_loads(page: Page, tab: str, content_id: str):
    """Parametrized test for tab content loading"""
    page.goto("http://127.0.0.1:8012/")
    page.click(f"button[data-tab='{tab}']")
    expect(page.locator(f"#{content_id}")).to_be_visible()
