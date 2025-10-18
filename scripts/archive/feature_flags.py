"""
Feature gating helpers.

- is_pro(): True if edition/tier is 'pro' or 'enterprise'
- is_enterprise(): True if edition/tier is 'enterprise'

Env controls (any of these work):
- AGRO_EDITION=oss|pro|enterprise  (preferred)
- TIER=free|pro|enterprise         (back-compat)
- PRO_ENABLED=true/false           (optional override)
- ENTERPRISE_ENABLED=true/false    (optional override)
"""
import os


def _truthy(val: str | None) -> bool:
    if not val:
        return False
    return val.strip().lower() in {"1", "true", "yes", "on"}


def is_pro() -> bool:
    edition = (os.getenv("AGRO_EDITION") or os.getenv("TIER") or "").strip().lower()
    if edition in {"pro", "enterprise"}:
        return True
    # Optional explicit override
    if _truthy(os.getenv("PRO_ENABLED")):
        return True
    if _truthy(os.getenv("ENTERPRISE_ENABLED")):
        return True
    return False


def is_enterprise() -> bool:
    edition = (os.getenv("AGRO_EDITION") or os.getenv("TIER") or "").strip().lower()
    if edition == "enterprise":
        return True
    if _truthy(os.getenv("ENTERPRISE_ENABLED")):
        return True
    return False
