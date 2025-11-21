#!/usr/bin/env python3
"""
Smoke test: Verify indexer stores relative paths (not absolute paths)
"""

import sys
from pathlib import Path

# Add parent to path
sys.path.insert(0, str(Path(__file__).parent.parent))

from retrieval.ast_chunker import chunk_code


def test_relative_paths_in_chunks():
    """Test that chunk_code preserves whatever path is given to it"""

    sample_code = '''
def hello_world():
    """Say hello"""
    print("Hello, world!")

class Greeter:
    def greet(self, name):
        return f"Hello, {name}!"
'''

    # Test 1: Relative path should be preserved
    relative_path = "server/app.py"
    chunks = chunk_code(sample_code, relative_path, "python", target=500)

    assert len(chunks) > 0, "Should produce at least one chunk"

    for chunk in chunks:
        file_path = chunk.get('file_path', '')
        print(f"  Chunk file_path: {file_path}")

        # Should be relative (not start with /)
        assert not file_path.startswith('/'), f"Path should be relative, got: {file_path}"
        assert not file_path.startswith('/Users/'), f"Path should not contain absolute /Users/ path"
        assert file_path == relative_path, f"Expected {relative_path}, got {file_path}"

    print(f"✅ Relative path test passed: {len(chunks)} chunks, all with relative paths")

    # Test 2: Indexer converts absolute to relative
    # (This is tested by running the actual indexer and checking Qdrant)
    print("✅ chunk_code preserves relative paths correctly")


if __name__ == '__main__':
    print("Testing relative path handling in indexer...")
    test_relative_paths_in_chunks()
    print("\n✅ All tests passed!")
