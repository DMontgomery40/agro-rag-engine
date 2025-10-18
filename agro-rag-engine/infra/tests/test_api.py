"""
API Tests for AGRO Backend
Tests the FastAPI endpoints
"""
import pytest
from playwright.sync_api import Page, APIRequestContext


def test_config_endpoint(page: Page):
    """Test /api/config endpoint"""
    response = page.request.get("http://127.0.0.1:8012/api/config")
    assert response.ok
    data = response.json()
    assert "env" in data
    assert "repos" in data
    assert isinstance(data["env"], dict)
    assert isinstance(data["repos"], list)


def test_prices_endpoint(page: Page):
    """Test /api/prices endpoint"""
    response = page.request.get("http://127.0.0.1:8012/api/prices")
    assert response.ok
    data = response.json()
    assert "models" in data
    assert isinstance(data["models"], list)


def test_scan_hw_endpoint(page: Page):
    """Test /api/scan-hw endpoint"""
    response = page.request.post("http://127.0.0.1:8012/api/scan-hw")
    assert response.ok
    data = response.json()
    assert "info" in data
    assert "runtimes" in data
    assert "tools" in data
    assert "os" in data["info"]
    assert "arch" in data["info"]


def test_profiles_list_endpoint(page: Page):
    """Test /api/profiles endpoint"""
    response = page.request.get("http://127.0.0.1:8012/api/profiles")
    assert response.ok
    data = response.json()
    assert "profiles" in data
    assert isinstance(data["profiles"], list)


def test_git_hooks_status_endpoint(page: Page):
    """Test /api/git/hooks/status endpoint"""
    response = page.request.get("http://127.0.0.1:8012/api/git/hooks/status")
    assert response.ok
    data = response.json()
    assert "dir" in data
    assert "post_checkout" in data
    assert "post_commit" in data


def test_keywords_endpoint(page: Page):
    """Test /api/keywords endpoint"""
    response = page.request.get("http://127.0.0.1:8012/api/keywords")
    assert response.ok
    data = response.json()
    assert "keywords" in data
    assert isinstance(data["keywords"], list)


def test_search_endpoint_requires_query(page: Page):
    """Test /search endpoint validation"""
    response = page.request.get("http://127.0.0.1:8012/search")
    # Should fail without query parameter
    assert not response.ok


def test_answer_endpoint_requires_query(page: Page):
    """Test /answer endpoint validation"""
    response = page.request.get("http://127.0.0.1:8012/answer")
    # Should fail without query parameter
    assert not response.ok
