"""Root shim for backward compatibility: re-export get_index_stats from server.index_stats"""
from server.index_stats import get_index_stats  # noqa: F401
