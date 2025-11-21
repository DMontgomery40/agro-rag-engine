"""
Legacy application entry point.
DEPRECATED: Use server.asgi:create_app instead.

This file exists only to support legacy test imports or scripts that specifically call `python -m server.app`.
All actual logic has been moved to `server/asgi.py` and the `server/routers/` modules.
"""
from server.asgi import create_app
from server.utils import atomic_write_text  # noqa: F401 - legacy compatibility for tests

# Global singleton for legacy scripts
app = create_app()

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8012)
