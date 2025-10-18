#!/usr/bin/env python3
"""
Autotune autoscaler (stub):
- Samples local CPU/RAM (and GPU later) via psutil
- Reads gui/autotune_policy.json
- During off hours, POSTs /api/autotune/status with a suggested mode (ECO/BALANCED/TURBO)

Defaults:
- Does not change env or persist profiles; only signals current_mode to the server stub
- Business hours gate: leaves user settings untouched during business hours
"""
from __future__ import annotations
import argparse
import json
import os
import sys
import time
from dataclasses import dataclass
from pathlib import Path
from typing import Any, Dict, Optional

try:
    import psutil  # type: ignore
except Exception:
    psutil = None  # type: ignore

import requests  # type: ignore

ROOT = Path(__file__).resolve().parent
GUI = ROOT / "gui"
POLICY_PATH = GUI / "autotune_policy.json"


@dataclass
class Metrics:
    cpu: float
    mem: float
    gpu: Optional[float] = None


def load_policy(path: Path) -> Dict[str, Any]:
    try:
        return json.loads(path.read_text())
    except Exception:
        return {
            "business_hours": {"start": "09:00", "end": "18:00", "days": [1, 2, 3, 4, 5]},
            "thresholds": {"cpu_hot": 0.8, "mem_hot": 0.85, "gpu_hot": 0.85},
            "modes": {
                "ECO": {"when": {"cpu_util_max": 0.25, "mem_util_max": 0.50, "gpu_util_max": 0.30}},
                "BALANCED": {"when": {"cpu_util_max": 0.55, "mem_util_max": 0.70, "gpu_util_max": 0.60}},
                "TURBO": {"when": {"cpu_util_max": 0.90, "mem_util_max": 0.90, "gpu_util_max": 0.90}},
            },
        }


def parse_hhmm(s: str) -> tuple[int, int]:
    h, m = s.split(":")
    return int(h), int(m)


def is_business_hours(now: Optional[time.struct_time], policy: Dict[str, Any]) -> bool:
    if now is None:
        now = time.localtime()
    days = set(policy.get("business_hours", {}).get("days", [1, 2, 3, 4, 5]))
    if now.tm_wday + 1 not in days:
        return False
    start_s = policy.get("business_hours", {}).get("start", "09:00")
    end_s = policy.get("business_hours", {}).get("end", "18:00")
    sh, sm = parse_hhmm(start_s)
    eh, em = parse_hhmm(end_s)
    tmin = now.tm_hour * 60 + now.tm_min
    start_m = sh * 60 + sm
    end_m = eh * 60 + em
    return start_m <= tmin <= end_m


def sample_metrics() -> Metrics:
    if psutil is None:
        return Metrics(cpu=0.0, mem=0.0, gpu=None)
    cpu = psutil.cpu_percent(interval=0.3) / 100.0
    mem = psutil.virtual_memory().percent / 100.0
    # TODO: GPU (Metal/CUDA) sampling in future
    return Metrics(cpu=cpu, mem=mem, gpu=None)


def pick_mode(m: Metrics, policy: Dict[str, Any]) -> Optional[str]:
    # Simple rule: choose the first mode whose 'when' limits are not exceeded
    modes = policy.get("modes", {})
    order = ["ECO", "BALANCED", "TURBO"]
    for name in order:
        spec = modes.get(name, {}).get("when", {})
        cpu_ok = m.cpu <= float(spec.get("cpu_util_max", 1.0))
        mem_ok = m.mem <= float(spec.get("mem_util_max", 1.0))
        gpu_lim = spec.get("gpu_util_max")
        gpu_ok = True if gpu_lim is None or m.gpu is None else m.gpu <= float(gpu_lim)
        if cpu_ok and mem_ok and gpu_ok:
            return name
    return None


def post_status(host: str, enabled: bool, mode: Optional[str]) -> None:
    try:
        requests.post(
            f"{host}/api/autotune/status",
            json={"enabled": enabled, "current_mode": mode},
            timeout=3,
        )
    except Exception:
        pass


def main(argv: list[str]) -> int:
    p = argparse.ArgumentParser(description="Autotune autoscaler (stub)")
    p.add_argument("--host", default=os.getenv("AUTOTUNE_HOST", "http://127.0.0.1:8012"))
    p.add_argument("--interval", type=int, default=int(os.getenv("AUTOTUNE_INTERVAL", "15")))
    args = p.parse_args(argv)

    policy = load_policy(POLICY_PATH)
    print(f"[autoscaler] Using policy {POLICY_PATH}")
    print(f"[autoscaler] Posting to {args.host} every {args.interval}s (off-hours only)")

    while True:
        now = time.localtime()
        bh = is_business_hours(now, policy)
        m = sample_metrics()
        if not bh:
            mode = pick_mode(m, policy)
            post_status(args.host, enabled=True, mode=mode)
        time.sleep(max(3, args.interval))

    return 0


if __name__ == "__main__":
    raise SystemExit(main(sys.argv[1:]))

