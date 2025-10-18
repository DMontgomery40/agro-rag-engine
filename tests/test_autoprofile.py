"""Test auto-profile functionality"""
import pytest
from playwright.sync_api import Page, expect

def test_autoprofile_button_exists(page: Page):
    """Test that auto-profile button exists and is clickable"""
    page.goto("http://127.0.0.1:8012/")
    
    # Find the configure automatically button
    button = page.locator("#btn-wizard-oneclick")
    expect(button).to_be_visible()
    expect(button).to_contain_text("Configure Automatically")

def test_autoprofile_layout(page: Page):
    """Test that the 2-column layout is visible"""
    page.goto("http://127.0.0.1:8012/")
    
    # Check results panel exists
    results_panel = page.locator("#profile-results-panel")
    expect(results_panel).to_be_visible()
    
    # Check placeholder is visible initially
    placeholder = page.locator("#profile-placeholder")
    expect(placeholder).to_be_visible()

def test_autoprofile_button_click(page: Page):
    """Test clicking the configure button"""
    page.goto("http://127.0.0.1:8012/")
    
    # Click the button
    page.click("#btn-wizard-oneclick")
    
    # Wait a moment for any async operations
    page.wait_for_timeout(2000)
    
    # Check console for errors
    console_messages = []
    page.on("console", lambda msg: console_messages.append(f"{msg.type}: {msg.text}"))
    
    # Try clicking again to capture console
    page.reload()
    page.click("#btn-wizard-oneclick")
    page.wait_for_timeout(2000)
    
    # Print console messages for debugging
    print("\n=== Console Messages ===")
    for msg in console_messages:
        print(msg)
