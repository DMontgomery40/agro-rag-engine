"""Smoke test for Docker API endpoints.

Verifies that Docker API endpoints are properly wired to Pydantic config
and return valid responses.
"""
import requests
import pytest

BASE_URL = "http://127.0.0.1:8012/api"


def test_docker_status_returns_valid_response():
    """Test /api/docker/status returns expected fields."""
    response = requests.get(f"{BASE_URL}/docker/status", timeout=10)
    assert response.status_code == 200
    data = response.json()
    
    # Must have these fields
    assert "running" in data
    assert "runtime" in data
    assert "containers_count" in data
    
    # Types
    assert isinstance(data["running"], bool)
    assert isinstance(data["runtime"], str)
    assert isinstance(data["containers_count"], int)


def test_docker_containers_returns_valid_response():
    """Test /api/docker/containers returns expected structure."""
    response = requests.get(f"{BASE_URL}/docker/containers", timeout=15)
    assert response.status_code == 200
    data = response.json()
    
    # Must have containers array
    assert "containers" in data
    assert isinstance(data["containers"], list)
    
    # If containers exist, verify structure
    if data["containers"]:
        container = data["containers"][0]
        required_fields = ["id", "name", "state", "status", "agro_managed"]
        for field in required_fields:
            assert field in container, f"Missing field: {field}"


def test_docker_config_values_in_agro_config_json():
    """Test Docker config values exist in agro_config.json file."""
    import json
    from pathlib import Path
    
    config_path = Path(__file__).parent.parent.parent / "agro_config.json"
    assert config_path.exists(), "agro_config.json not found"
    
    with open(config_path) as f:
        config = json.load(f)
    
    # Verify Docker config section exists
    assert "docker" in config, "Docker section not found in agro_config.json"
    
    docker_config = config["docker"]
    expected_keys = [
        "docker_status_timeout",
        "docker_container_list_timeout", 
        "docker_container_action_timeout",
        "docker_infra_up_timeout",
        "docker_infra_down_timeout",
        "docker_logs_tail",
        "docker_logs_timestamps",
    ]
    
    for key in expected_keys:
        assert key in docker_config, f"Docker config key {key} not found in agro_config.json"
        # Verify they're integers
        assert isinstance(docker_config[key], int), f"{key} should be an integer"


def test_monitoring_top_queries_endpoint():
    """Test /api/monitoring/top-queries endpoint (used by getTopFolders)."""
    response = requests.get(f"{BASE_URL}/monitoring/top-queries?limit=10", timeout=10)
    assert response.status_code == 200
    data = response.json()
    
    # Must have these fields
    assert "total_queries" in data
    assert "top" in data
    assert isinstance(data["total_queries"], int)
    assert isinstance(data["top"], list)


if __name__ == "__main__":
    pytest.main([__file__, "-v"])

