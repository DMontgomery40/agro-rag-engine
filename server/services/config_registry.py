"""Configuration Registry for AGRO RAG Engine.

This module provides a centralized, thread-safe configuration management system
that merges settings from multiple sources with clear precedence rules:

Precedence (highest to lowest):
1. .env file (secrets and infrastructure overrides)
2. agro_config.json (tunable RAG parameters)
3. Pydantic defaults (fallback values)

Key features:
- Thread-safe load/reload with locking
- Type-safe accessors (get_int, get_float, get_bool)
- Pydantic validation for agro_config.json
- Backward compatibility with os.getenv() patterns
- Config source tracking (which file each value came from)
"""

import json
import logging
import os
import threading
from pathlib import Path
from typing import Any, Dict, Optional

from pydantic import ValidationError

from common.paths import repo_root
from server.models.agro_config_model import AgroConfigRoot, AGRO_CONFIG_KEYS

logger = logging.getLogger("agro.config")


class ConfigRegistry:
    """Centralized configuration registry with multi-source merging."""

    def __init__(self):
        """Initialize the config registry.

        The registry is not loaded until load() is called explicitly.
        This allows for proper initialization ordering in the application.
        """
        self._config: Dict[str, Any] = {}
        self._sources: Dict[str, str] = {}  # Track which file each value came from
        self._agro_config_model: Optional[AgroConfigRoot] = None
        self._lock = threading.RLock()
        self._loaded = False

    def load(self) -> None:
        """Load configuration from all sources with proper precedence.

        This method should be called once at application startup.
        It reads from:
        1. agro_config.json (validated with Pydantic)
        2. .env via os.environ (takes precedence)
        3. Pydantic defaults (fallback)

        Thread-safe and idempotent.
        """
        with self._lock:
            self._config.clear()
            self._sources.clear()

            # Step 1: Load agro_config.json with Pydantic validation
            agro_config_path = repo_root() / "agro_config.json"
            try:
                if agro_config_path.exists():
                    raw_json = json.loads(agro_config_path.read_text())
                    self._agro_config_model = AgroConfigRoot(**raw_json)
                    logger.info(f"Loaded agro_config.json from {agro_config_path}")
                else:
                    # Use defaults if file doesn't exist
                    self._agro_config_model = AgroConfigRoot()
                    logger.info("agro_config.json not found, using defaults")
            except ValidationError as e:
                logger.error(f"Invalid agro_config.json: {e}")
                # Fall back to defaults on validation error
                self._agro_config_model = AgroConfigRoot()
            except Exception as e:
                logger.error(f"Error loading agro_config.json: {e}")
                self._agro_config_model = AgroConfigRoot()

            # Step 2: Merge agro_config values into flat dict
            flat_agro_config = self._agro_config_model.to_flat_dict()
            for key, value in flat_agro_config.items():
                self._config[key] = value
                self._sources[key] = "agro_config.json"

            # Step 3: Override with .env values (precedence)
            for key in AGRO_CONFIG_KEYS:
                env_value = os.getenv(key)
                if env_value is not None:
                    # .env takes precedence
                    self._config[key] = env_value
                    self._sources[key] = ".env"
                    logger.debug(f"Config key {key} overridden by .env")

            # Also include other env vars for backward compatibility
            # This allows existing code to read non-AGRO config from registry
            for key, value in os.environ.items():
                if key not in self._config:
                    self._config[key] = value
                    self._sources[key] = ".env"

            self._loaded = True
            logger.info(f"Config registry loaded with {len(self._config)} keys")

    def reload(self) -> None:
        """Reload configuration from disk.

        This can be called after config files are updated to refresh the
        in-memory configuration. Thread-safe.
        """
        with self._lock:
            logger.info("Reloading config registry")
            self.load()

    def get(self, key: str, default: Any = None) -> Any:
        """Get a config value by key.

        Args:
            key: Configuration key (env-style name like 'RRF_K_DIV')
            default: Default value if key not found

        Returns:
            Config value or default
        """
        with self._lock:
            if not self._loaded:
                logger.warning("Config registry accessed before load(), loading now")
                self.load()
            return self._config.get(key, default)

    def get_int(self, key: str, default: int) -> int:
        """Get a config value as integer.

        Args:
            key: Configuration key
            default: Default value if key not found or conversion fails

        Returns:
            Integer value
        """
        value = self.get(key)
        if value is None:
            return default
        try:
            return int(value)
        except (ValueError, TypeError):
            logger.warning(f"Failed to convert {key}={value} to int, using default {default}")
            return default

    def get_float(self, key: str, default: float) -> float:
        """Get a config value as float.

        Args:
            key: Configuration key
            default: Default value if key not found or conversion fails

        Returns:
            Float value
        """
        value = self.get(key)
        if value is None:
            return default
        try:
            return float(value)
        except (ValueError, TypeError):
            logger.warning(f"Failed to convert {key}={value} to float, using default {default}")
            return default

    def get_bool(self, key: str, default: bool = False) -> bool:
        """Get a config value as boolean.

        Supports: 1/0, true/false, yes/no, on/off (case-insensitive)

        Args:
            key: Configuration key
            default: Default value if key not found

        Returns:
            Boolean value
        """
        value = self.get(key)
        if value is None:
            return default
        if isinstance(value, bool):
            return value
        str_value = str(value).strip().lower()
        return str_value in {'1', 'true', 'yes', 'on'}

    def get_source(self, key: str) -> Optional[str]:
        """Get the source file for a config key.

        Args:
            key: Configuration key

        Returns:
            Source file name ('agro_config.json', '.env', or None)
        """
        with self._lock:
            return self._sources.get(key)

    def get_all_with_sources(self) -> Dict[str, Dict[str, Any]]:
        """Get all config values with their sources.

        Returns:
            Dictionary mapping keys to {value, source} dicts:
            {
                'RRF_K_DIV': {'value': 60, 'source': 'agro_config.json'},
                'OPENAI_API_KEY': {'value': 'sk-...', 'source': '.env'}
            }
        """
        with self._lock:
            if not self._loaded:
                self.load()
            return {
                key: {
                    'value': value,
                    'source': self._sources.get(key, 'unknown')
                }
                for key, value in self._config.items()
            }

    def update_agro_config(self, updates: Dict[str, Any]) -> None:
        """Update agro_config.json values and save to disk.

        This method:
        1. Validates updates using Pydantic
        2. Merges with existing config
        3. Writes to agro_config.json atomically
        4. Reloads the registry

        Args:
            updates: Dictionary of flat env-style keys to update
                    (e.g., {'RRF_K_DIV': 80})

        Raises:
            ValidationError: If updates fail Pydantic validation
        """
        with self._lock:
            if not self._loaded:
                self.load()

            # Filter to only AGRO_CONFIG_KEYS
            agro_updates = {k: v for k, v in updates.items() if k in AGRO_CONFIG_KEYS}
            if not agro_updates:
                logger.debug("No AGRO config keys to update")
                return

            # Load current config
            agro_config_path = repo_root() / "agro_config.json"
            if agro_config_path.exists():
                try:
                    current_json = json.loads(agro_config_path.read_text())
                    current_model = AgroConfigRoot(**current_json)
                except Exception:
                    current_model = AgroConfigRoot()
            else:
                current_model = AgroConfigRoot()

            # Convert current model to flat dict, update, convert back
            flat_config = current_model.to_flat_dict()
            flat_config.update(agro_updates)

            # Validate by creating new model from updated flat dict
            updated_model = AgroConfigRoot.from_flat_dict(flat_config)

            # Write to disk (nested JSON structure)
            from server.services.config_store import _atomic_write_text
            json_content = updated_model.model_dump_json(indent=2)
            _atomic_write_text(agro_config_path, json_content)

            logger.info(f"Updated agro_config.json with {len(agro_updates)} keys")

            # Reload registry to pick up changes
            self.reload()

    @property
    def agro_config_model(self) -> AgroConfigRoot:
        """Get the current Pydantic config model.

        Returns:
            Current AgroConfigRoot instance
        """
        with self._lock:
            if not self._loaded:
                self.load()
            return self._agro_config_model or AgroConfigRoot()


# Global singleton instance
_registry: Optional[ConfigRegistry] = None
_registry_lock = threading.Lock()


def get_config_registry() -> ConfigRegistry:
    """Get the global config registry singleton.

    Thread-safe singleton access. The registry is created on first access
    but not loaded until load() is called explicitly.

    Returns:
        Global ConfigRegistry instance
    """
    global _registry
    if _registry is None:
        with _registry_lock:
            if _registry is None:
                _registry = ConfigRegistry()
    return _registry
