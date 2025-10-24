#!/usr/bin/env python3
"""
Smoke test for Evaluation Samples format validation.
Verifies data/evaluation_dataset.json can be loaded by the eval system.
"""
import json
import sys
from pathlib import Path

# Add project root to path
project_root = Path(__file__).parent.parent.parent
sys.path.insert(0, str(project_root))

def test_evaluation_dataset_format() -> None:
    """Test that evaluation_dataset.json is valid and has required fields"""
    dataset_path = project_root / "data" / "evaluation_dataset.json"

    assert dataset_path.exists(), f"Evaluation Samples file not found at {dataset_path}"

    with open(dataset_path) as f:
        data = json.load(f)

    assert isinstance(data, list), "Evaluation Samples must be a JSON array"

    questions = [x for x in data if isinstance(x, dict) and "q" in x]

    assert len(questions) >= 50, f"Expected at least 50 questions, found {len(questions)}"

    # Verify all questions have required fields
    for i, q in enumerate(questions):
        assert "q" in q, f"Question {i} missing 'q' field"
        assert "repo" in q, f"Question {i} missing 'repo' field"
        assert "expect_paths" in q, f"Question {i} missing 'expect_paths' field"
        assert isinstance(q["expect_paths"], list), f"Question {i} expect_paths must be a list"
        assert len(q["expect_paths"]) > 0, f"Question {i} expect_paths cannot be empty"

    print(f"✓ Evaluation Samples validation passed: {len(questions)} valid questions")

def test_new_samples_present() -> None:
    """Test that new questions from tooltips and error-helpers were added"""
    dataset_path = project_root / "data" / "evaluation_dataset.json"

    with open(dataset_path) as f:
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

if __name__ == "__main__":
    try:
        test_evaluation_dataset_format()
        test_new_samples_present()
        print("\n✓ All smoke tests passed!")
        sys.exit(0)
    except AssertionError as e:
        print(f"\n✗ Test failed: {e}")
        sys.exit(1)
    except Exception as e:
        print(f"\n✗ Unexpected error: {e}")
        sys.exit(1)
