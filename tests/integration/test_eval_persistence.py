"""
Integration tests for eval persistence - ensures streaming endpoint saves results to disk.

TDD tests for verifying that /api/eval/run/stream properly persists results to data/evals/.
"""
import json
import pytest
import time
import asyncio
from pathlib import Path
from datetime import datetime
from fastapi.testclient import TestClient
from unittest.mock import patch, MagicMock


@pytest.fixture
def eval_dir(tmp_path):
    """Create temporary eval directory."""
    eval_path = tmp_path / "data" / "evals"
    eval_path.mkdir(parents=True, exist_ok=True)
    return eval_path


@pytest.fixture
def mock_search():
    """Mock search functions to avoid actual RAG calls."""
    # Patch at import location inside the function
    with patch('retrieval.hybrid_search.search_routed') as mock_single, \
         patch('retrieval.hybrid_search.search_routed_multi') as mock_multi:

        # Return mock search results
        mock_single.return_value = [
            {'file_path': '/test/file.py', 'score': 0.95},
            {'file_path': '/test/other.py', 'score': 0.85}
        ]
        mock_multi.return_value = [
            {'file_path': '/test/file.py', 'score': 0.95},
            {'file_path': '/test/other.py', 'score': 0.85}
        ]

        yield mock_single, mock_multi


@pytest.fixture
def mock_golden_file(tmp_path):
    """Create a mock golden questions file."""
    golden_path = tmp_path / "test_golden.json"
    golden_data = [
        {
            "q": "What is the main entry point?",
            "repo": "test-repo",
            "expect_paths": ["/test/file.py"]
        },
        {
            "q": "Where is the config?",
            "repo": "test-repo",
            "expect_paths": ["/test/config.py"]
        }
    ]
    with open(golden_path, 'w') as f:
        json.dump(golden_data, f)
    return str(golden_path)


@pytest.fixture
def mock_config(mock_golden_file, eval_dir):
    """Mock config registry to use test paths."""
    mock_registry = MagicMock()
    mock_registry.get_str.side_effect = lambda key, default=None: {
        'GOLDEN_PATH': mock_golden_file,
    }.get(key, default)
    mock_registry.get_int.side_effect = lambda key, default=0: {
        'EVAL_MULTI': 1,
        'EVAL_FINAL_K': 5,
    }.get(key, default)

    with patch('server.routers.eval._config', mock_registry):
        yield mock_registry


def test_streaming_endpoint_saves_to_disk(mock_config, mock_search, eval_dir, mock_golden_file):
    """
    Test that /api/eval/run/stream saves results to data/evals/eval_YYYYMMDD_HHMMSS.json

    CRITICAL: The streaming endpoint is used by the frontend, so without persistence,
    eval results are lost on server restart. This is a major bug.
    """
    from server.routers.eval import router
    from fastapi import FastAPI

    app = FastAPI()
    app.include_router(router)
    client = TestClient(app)

    # Patch Path to use our test eval_dir
    with patch('server.routers.eval.Path') as mock_path_class:
        mock_path_class.return_value = eval_dir

        # Make the streaming request
        response = client.get("/api/eval/run/stream?use_multi=1&final_k=5")

        # Consume the stream
        assert response.status_code == 200
        events = []
        for line in response.iter_lines():
            line_str = line.decode('utf-8') if isinstance(line, bytes) else line
            if line_str.startswith('data: '):
                data = json.loads(line_str[6:])
                events.append(data)

        # Wait a bit for file write (if async)
        time.sleep(0.5)

        # Check that eval file was created
        eval_files = list(eval_dir.glob('eval_*.json'))
        assert len(eval_files) > 0, "No eval file was created"

        # Read the saved file
        eval_file = eval_files[0]
        with open(eval_file, 'r') as f:
            saved_data = json.load(f)

        # Verify required fields
        assert 'run_id' in saved_data, "run_id field missing"
        assert 'total' in saved_data, "total field missing"
        assert 'top1_accuracy' in saved_data, "top1_accuracy field missing"
        assert 'topk_accuracy' in saved_data, "topk_accuracy field missing"
        assert 'results' in saved_data, "results field missing"

        # Verify run_id format (YYYYMMDD_HHMMSS)
        run_id = saved_data['run_id']
        assert len(run_id) == 15, f"run_id should be 15 chars (YYYYMMDD_HHMMSS), got {len(run_id)}"
        assert run_id.isdigit() or '_' in run_id, f"run_id should be timestamp format, got {run_id}"

        # Verify file naming matches run_id
        expected_filename = f"eval_{run_id}.json"
        assert eval_file.name == expected_filename, f"File should be named {expected_filename}, got {eval_file.name}"


def test_streaming_endpoint_includes_run_id_in_summary(mock_config, mock_search, mock_golden_file):
    """
    Test that the summary dict includes a run_id field for traceability.
    """
    from server.routers.eval import router
    from fastapi import FastAPI

    app = FastAPI()
    app.include_router(router)
    client = TestClient(app)

    # Make the streaming request
    response = client.get("/api/eval/run/stream")
    assert response.status_code == 200

    # Consume stream
    for line in response.iter_lines():
        # Handle both bytes and strings
        line_str = line.decode('utf-8') if isinstance(line, bytes) else line
        if line_str.startswith('data: '):
            data = json.loads(line_str[6:])
            # Look for complete event
            if data.get('type') == 'complete':
                break

    # Check status endpoint for results
    from server.routers.eval import _EVAL_STATUS

    # The summary should now have run_id
    summary = _EVAL_STATUS.get("results")
    assert summary is not None, "No results found after eval"
    assert 'run_id' in summary, "run_id field missing from summary"

    # Verify run_id is a valid timestamp
    run_id = summary['run_id']
    try:
        datetime.strptime(run_id, "%Y%m%d_%H%M%S")
    except ValueError:
        pytest.fail(f"run_id '{run_id}' is not in YYYYMMDD_HHMMSS format")


def test_streaming_endpoint_creates_eval_directory(mock_config, mock_search, mock_golden_file, tmp_path):
    """
    Test that the streaming endpoint creates data/evals/ if it doesn't exist.
    """
    from server.routers.eval import router
    from fastapi import FastAPI

    # Use a non-existent directory
    new_eval_dir = tmp_path / "new_data" / "evals"
    assert not new_eval_dir.exists(), "Test directory should not exist initially"

    app = FastAPI()
    app.include_router(router)
    client = TestClient(app)

    with patch('server.routers.eval.Path') as mock_path_class:
        mock_path_class.return_value = new_eval_dir

        # Make request
        response = client.get("/api/eval/run/stream")
        assert response.status_code == 200

        # Consume stream
        for line in response.iter_lines():
            line_str = line.decode('utf-8') if isinstance(line, bytes) else line
            if line_str.startswith('data: '):
                data = json.loads(line_str[6:])
                if data.get('type') == 'complete':
                    break

        # Directory should now exist
        assert new_eval_dir.exists(), "data/evals directory was not created"


def test_saved_file_matches_summary_structure(mock_config, mock_search, eval_dir, mock_golden_file):
    """
    Test that the saved JSON file has the same structure as the instrumented endpoint.

    This ensures consistency between endpoints and proper integration with the frontend.
    """
    from server.routers.eval import router
    from fastapi import FastAPI

    app = FastAPI()
    app.include_router(router)
    client = TestClient(app)

    with patch('server.routers.eval.Path') as mock_path_class:
        mock_path_class.return_value = eval_dir

        response = client.get("/api/eval/run/stream?use_multi=1&final_k=5")
        assert response.status_code == 200

        # Consume stream
        for line in response.iter_lines():
            line_str = line.decode('utf-8') if isinstance(line, bytes) else line
            if line_str.startswith('data: '):
                data = json.loads(line_str[6:])
                if data.get('type') == 'complete':
                    break

        time.sleep(0.5)  # Allow file write

        # Read saved file
        eval_files = list(eval_dir.glob('eval_*.json'))
        assert len(eval_files) > 0

        with open(eval_files[0], 'r') as f:
            saved = json.load(f)

        # Check structure matches instrumented endpoint format
        required_fields = {
            'run_id': str,
            'total': int,
            'top1_hits': int,
            'topk_hits': int,
            'top1_accuracy': (int, float),
            'topk_accuracy': (int, float),
            'duration_secs': (int, float),
            'results': list
        }

        for field, expected_type in required_fields.items():
            assert field in saved, f"Missing field: {field}"
            assert isinstance(saved[field], expected_type), \
                f"Field {field} should be {expected_type}, got {type(saved[field])}"

        # Verify results structure
        if saved['results']:
            first_result = saved['results'][0]
            result_fields = ['question', 'repo', 'expect_paths', 'top1_hit', 'topk_hit']
            for field in result_fields:
                assert field in first_result, f"Result missing field: {field}"


def test_error_handling_during_save(mock_config, mock_search, mock_golden_file):
    """
    Test that errors during file save don't crash the endpoint.
    """
    from server.routers.eval import router
    from fastapi import FastAPI

    app = FastAPI()
    app.include_router(router)
    client = TestClient(app)

    # Mock Path to raise error during write
    with patch('server.routers.eval.Path') as mock_path_class:
        mock_dir = MagicMock()
        mock_dir.mkdir.side_effect = OSError("Permission denied")
        mock_path_class.return_value = mock_dir

        # Request should still complete (errors handled gracefully)
        response = client.get("/api/eval/run/stream")
        assert response.status_code == 200

        # Stream should still contain results
        has_complete = False
        for line in response.iter_lines():
            line_str = line.decode('utf-8') if isinstance(line, bytes) else line
            if line_str.startswith('data: '):
                data = json.loads(line_str[6:])
                if data.get('type') == 'complete':
                    has_complete = True
                    break

        # Even if save failed, stream should complete
        assert has_complete, "Stream should complete even if save fails"


if __name__ == "__main__":
    pytest.main([__file__, "-v", "-s"])
