#!/usr/bin/env python3
"""
Smoke test for golden questions format validation.
Verifies data/golden.json can be loaded by the eval system.
"""
import json
import sys
from pathlib import Path

# Add project root to path
project_root = Path(__file__).parent.parent.parent
sys.path.insert(0, str(project_root))

def test_golden_json_format():
    """Test that golden.json is valid and has required fields"""
    golden_path = project_root / "data" / "golden.json"

    assert golden_path.exists(), f"Golden questions file not found at {golden_path}"

    with open(golden_path) as f:
        data = json.load(f)

    assert isinstance(data, list), "Golden questions must be a JSON array"

    questions = [x for x in data if isinstance(x, dict) and "q" in x]

    assert len(questions) >= 50, f"Expected at least 50 questions, found {len(questions)}"

    # Verify all questions have required fields
    for i, q in enumerate(questions):
        assert "q" in q, f"Question {i} missing 'q' field"
        assert "repo" in q, f"Question {i} missing 'repo' field"
        assert "expect_paths" in q, f"Question {i} missing 'expect_paths' field"
        assert isinstance(q["expect_paths"], list), f"Question {i} expect_paths must be a list"
        assert len(q["expect_paths"]) > 0, f"Question {i} expect_paths cannot be empty"

    print(f"✓ Golden questions validation passed: {len(questions)} valid questions")
    return True

def test_new_questions_present():
    """Test that new questions from tooltips and error-helpers were added"""
    golden_path = project_root / "data" / "golden.json"

    with open(golden_path) as f:
        data = json.load(f)

    questions = [x for x in data if isinstance(x, dict) and "q" in x]
    question_texts = [q["q"].lower() for q in questions]

    # Check for some of the new questions we added
    assert any("qdrant url" in q for q in question_texts), "Missing Qdrant URL question"
    assert any("embedding_type" in q for q in question_texts), "Missing EMBEDDING_TYPE question"
    assert any("mq_rewrites" in q for q in question_texts), "Missing MQ_REWRITES question"
    assert any("conf_top1" in q or "confidence threshold" in q for q in question_texts), "Missing confidence threshold question"
    assert any("rerank_backend" in q for q in question_texts), "Missing RERANK_BACKEND question"
    assert any("createhelpfulerror" in q for q in question_texts), "Missing createHelpfulError question"
    assert any("tooltip" in q and ("attach" in q or "help icon" in q) for q in question_texts), "Missing tooltip system question"

    print(f"✓ New questions from tooltips.js and error-helpers.js are present")
    return True

if __name__ == "__main__":
    try:
        test_golden_json_format()
        test_new_questions_present()
        print("\n✓ All smoke tests passed!")
        sys.exit(0)
    except AssertionError as e:
        print(f"\n✗ Test failed: {e}")
        sys.exit(1)
    except Exception as e:
        print(f"\n✗ Unexpected error: {e}")
        sys.exit(1)
