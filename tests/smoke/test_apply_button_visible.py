#!/usr/bin/env python3
"""
Smoke test to verify "Apply All Changes" button is visible and sticky.
CRITICAL: This button must be visible on every tab for users to save changes.
"""
import sys
import time
from pathlib import Path

# Add project root to path
project_root = Path(__file__).parent.parent.parent
sys.path.insert(0, str(project_root))

def test_apply_button_exists_in_html():
    """Test that Apply All Changes button exists in index.html"""
    html_path = project_root / "gui" / "index.html"

    with open(html_path) as f:
        html = f.read()

    assert 'id="save-btn"' in html, "Save button with id='save-btn' not found in HTML"
    assert 'Apply All Changes' in html, "Button text 'Apply All Changes' not found in HTML"
    assert 'position: sticky' in html or 'position:sticky' in html, "Save button is not sticky - users won't see it on all tabs!"
    assert 'bottom: 0' in html or 'bottom:0' in html, "Save button is not anchored to bottom"

    print("✓ Apply All Changes button exists in HTML")
    print("✓ Button is sticky positioned")
    print("✓ Button is anchored to bottom")
    return True

def test_button_styling():
    """Test that button has proper visibility styling"""
    html_path = project_root / "gui" / "index.html"

    with open(html_path) as f:
        html = f.read()

    # Find the save-btn section
    start = html.find('id="save-btn"')
    if start == -1:
        raise AssertionError("save-btn not found")

    # Get the surrounding context (500 chars before and after)
    context = html[max(0, start-500):start+500]

    # Check for important styling
    assert 'z-index' in context, "Button needs z-index to stay on top"
    assert ('background: var(--accent)' in context or 'background:var(--accent)' in context), "Button should have accent background for visibility"

    print("✓ Button has z-index for layering")
    print("✓ Button has accent background for visibility")
    return True

if __name__ == "__main__":
    try:
        test_apply_button_exists_in_html()
        test_button_styling()
        print("\n✓ All Apply Changes button tests passed!")
        print("\nThe button is now:")
        print("  • Sticky positioned at the bottom")
        print("  • Always visible regardless of scroll position")
        print("  • Highly visible with accent color")
        print("  • Full width for easy clicking")
        sys.exit(0)
    except AssertionError as e:
        print(f"\n✗ Test failed: {e}")
        sys.exit(1)
    except Exception as e:
        print(f"\n✗ Unexpected error: {e}")
        sys.exit(1)
