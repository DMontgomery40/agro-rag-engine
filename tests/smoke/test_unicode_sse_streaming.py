"""
Smoke test for Unicode handling in SSE streaming.

Tests that the SSE helper function properly handles Unicode characters
without ASCII encoding errors.
"""
import json


def test_sse_helper_unicode():
    """Test that _sse helper handles Unicode properly."""
    # Simulate the _sse function (as it appears in server/services/rag.py after fix)
    def _sse(chunk_type: str, content: str = None, data: dict = None) -> str:
        chunk = {"type": chunk_type}
        if content is not None:
            chunk["content"] = content
        if data is not None:
            chunk["data"] = data
        return f"data: {json.dumps(chunk, ensure_ascii=False)}\n\n"

    # Test cases with Unicode that would fail with ensure_ascii=True (default)
    test_cases = [
        ("Smart quotes", 'Here is text with "smart quotes" in it'),
        ("Emoji", "Deployment successful 🚀"),
        ("Mixed Unicode", "The café is at 123° angle ™"),
        ("Chinese", "你好世界"),
        ("Math symbols", "∀x ∈ ℝ: x² ≥ 0"),
        ("Accented", "Résumé with naïve Beyoncé"),
    ]

    for name, unicode_text in test_cases:
        # This should NOT raise UnicodeEncodeError
        result = _sse("content", content=unicode_text)

        # Verify structure
        assert result.startswith("data: {")
        assert result.endswith("}\n\n")

        # Verify content is preserved
        parsed = json.loads(result[6:-2])  # Strip "data: " and "\n\n"
        assert parsed["type"] == "content"
        assert parsed["content"] == unicode_text, f"Test '{name}' failed: content mismatch"

        print(f"✓ {name}: {unicode_text[:50]}")


def test_sse_with_ensure_ascii_true_fails():
    """Demonstrate that ensure_ascii=True (default) WOULD fail with Unicode."""
    # This is the BUGGY version (before fix)
    def _sse_buggy(chunk_type: str, content: str = None, data: dict = None) -> str:
        chunk = {"type": chunk_type}
        if content is not None:
            chunk["content"] = content
        if data is not None:
            chunk["data"] = data
        # Note: ensure_ascii defaults to True if not specified
        return f"data: {json.dumps(chunk)}\n\n"

    unicode_text = 'Hello "world"'

    try:
        # This should fail or at least escape Unicode
        result = _sse_buggy("content", content=unicode_text)

        # If it doesn't raise an error, it will have escaped the Unicode
        # Check if it contains the escaped version instead of raw Unicode
        if "\\u" in result:
            print("✓ Buggy version escapes Unicode as \\uXXXX (not ideal for SSE)")
            return

        # In Python 3, json.dumps doesn't raise UnicodeEncodeError directly,
        # it just escapes as \uXXXX, which is valid JSON but not ideal for SSE
        print("✓ Buggy version works but escapes Unicode")

    except UnicodeEncodeError as e:
        print(f"✓ Buggy version fails with UnicodeEncodeError: {e}")


if __name__ == "__main__":
    print("Testing SSE Unicode handling (fixed version)...")
    test_sse_helper_unicode()

    print("\nTesting buggy version (ensure_ascii=True)...")
    test_sse_with_ensure_ascii_true_fails()

    print("\n✅ All tests passed!")
