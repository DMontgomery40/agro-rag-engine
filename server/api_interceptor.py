# server/api_interceptor.py
# Wrapper for requests library that automatically tracks all outbound API calls

import time
import functools
from typing import Any
import logging

logger = logging.getLogger(__name__)

# Import requests - will be patched by setup_interceptor()
try:
    import requests as _requests
except ImportError:
    _requests = None


def _track_request(method: str, url: str, **kwargs) -> Any:
    """Wrapper around requests that tracks API calls."""
    if _requests is None:
        raise ImportError("requests library not available")

    start_time = time.time()
    status_code = None
    error = None
    response_size = 0
    request_size = kwargs.get("data", "")
    if isinstance(request_size, (dict, list)):
        request_size = str(request_size)
    request_size = len(str(request_size).encode("utf-8")) if request_size else 0

    try:
        # Make the actual request using the original unwrapped method
        response = getattr(_requests, f"_original_{method.lower()}")(url, **kwargs)
        status_code = response.status_code
        response_size = len(response.content) if hasattr(response, "content") else 0
        return response

    except Exception as e:
        error = str(e)
        logger.error(f"API request failed ({method} {url}): {error}")
        raise

    finally:
        # Track the call regardless of success/failure
        duration_ms = (time.time() - start_time) * 1000

        # Import here to avoid circular dependency
        try:
            from server.api_tracker import track_api_call, get_provider_from_url
            provider = get_provider_from_url(url)

            track_api_call(
                provider=provider,
                endpoint=url,
                method=method.upper(),
                duration_ms=duration_ms,
                status_code=status_code,
                error=error,
                request_size_bytes=request_size,
                response_size_bytes=response_size,
            )
        except Exception as e:
            logger.debug(f"Failed to track API call: {e}")


def setup_interceptor():
    """Patch requests library to track all calls."""
    if _requests is None:
        logger.warning("requests library not available, API interception disabled")
        return

    # Save original methods to avoid recursion
    _requests._original_post = _requests.post
    _requests._original_get = _requests.get
    _requests._original_put = _requests.put
    _requests._original_delete = _requests.delete

    # Create wrappers
    @functools.wraps(_requests._original_post)
    def tracked_post(url: str, **kwargs) -> Any:
        return _track_request("POST", url, **kwargs)

    @functools.wraps(_requests._original_get)
    def tracked_get(url: str, **kwargs) -> Any:
        return _track_request("GET", url, **kwargs)

    @functools.wraps(_requests._original_put)
    def tracked_put(url: str, **kwargs) -> Any:
        return _track_request("PUT", url, **kwargs)

    @functools.wraps(_requests._original_delete)
    def tracked_delete(url: str, **kwargs) -> Any:
        return _track_request("DELETE", url, **kwargs)

    # Monkey-patch requests with tracked versions
    _requests.post = tracked_post
    _requests.get = tracked_get
    _requests.put = tracked_put
    _requests.delete = tracked_delete

    logger.info("API request interceptor enabled - tracking all outbound API calls")
