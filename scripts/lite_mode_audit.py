#!/usr/bin/env python3
"""
Lite Mode Audit (read-only)

Scans CSS/HTML/JS in a target directory for:
- Hardcoded hex colors (suggest var token replacements when possible)
- Potential low-contrast text/background pairs (WCAG)
- Risky/Cutting-edge CSS functions (color-mix, oklch, oklab, backdrop-filter, etc.)

Outputs a JSON report and a concise console summary. Does NOT modify any code.

Usage:
  python scripts/lite_mode_audit.py --root gui --report reports/lite_mode_audit.json

Notes:
- Token palettes are parsed from gui/css/tokens.css (dark default + [data-theme="light"]).
- Fuzzy color mapping uses simple Lab distance (CIE76) across both palettes.
- Contrast checks look only within the same inline style block (best-effort).
"""
from __future__ import annotations

import argparse
import json
import math
import os
import re
from dataclasses import dataclass, asdict
from pathlib import Path
from typing import Dict, List, Optional, Tuple

HEX_RE = re.compile(r"#[0-9a-fA-F]{3,6}\b")
STYLE_BLOCK_RE = re.compile(r"style=\"([^\"]+)\"|style='([^']+)'")

RISKY_FEATURES = [
    'color-mix(', 'oklch(', 'oklab(',
    'backdrop-filter', 'mix-blend-mode',
    # Some browsers still have variance here; flag for review
    'filter: blur(', 'text-stroke',
]


def _hex_to_rgb(h: str) -> Tuple[float, float, float]:
    h = h.strip()
    if len(h) == 4:  # #rgb
        r = int(h[1]*2, 16)
        g = int(h[2]*2, 16)
        b = int(h[3]*2, 16)
    elif len(h) == 7:  # #rrggbb
        r = int(h[1:3], 16)
        g = int(h[3:5], 16)
        b = int(h[5:7], 16)
    else:
        # Fallback to black
        r = g = b = 0
    return (r/255.0, g/255.0, b/255.0)


def _srgb_compand(c: float) -> float:
    # sRGB -> linear RGB
    return c/12.92 if c <= 0.04045 else ((c+0.055)/1.055) ** 2.4


def _rgb_to_xyz(r: float, g: float, b: float) -> Tuple[float, float, float]:
    # Convert sRGB to XYZ (D65)
    rl, gl, bl = _srgb_compand(r), _srgb_compand(g), _srgb_compand(b)
    x = rl * 0.4124 + gl * 0.3576 + bl * 0.1805
    y = rl * 0.2126 + gl * 0.7152 + bl * 0.0722
    z = rl * 0.0193 + gl * 0.1192 + bl * 0.9505
    return x, y, z


def _xyz_to_lab(x: float, y: float, z: float) -> Tuple[float, float, float]:
    # D65 white point
    xr = x / 0.95047
    yr = y / 1.00000
    zr = z / 1.08883

    def f(t: float) -> float:
        return t ** (1/3) if t > 0.008856 else 7.787 * t + 16/116

    fx, fy, fz = f(xr), f(yr), f(zr)
    L = 116*fy - 16
    a = 500*(fx - fy)
    b = 200*(fy - fz)
    return L, a, b


def hex_to_lab(h: str) -> Tuple[float, float, float]:
    r, g, b = _hex_to_rgb(h)
    x, y, z = _rgb_to_xyz(r, g, b)
    return _xyz_to_lab(x, y, z)


def lab_dist(a: Tuple[float, float, float], b: Tuple[float, float, float]) -> float:
    return math.sqrt((a[0]-b[0])**2 + (a[1]-b[1])**2 + (a[2]-b[2])**2)


def rel_luminance(h: str) -> float:
    r, g, b = _hex_to_rgb(h)
    def lin(c: float) -> float:
        return c/12.92 if c <= 0.03928 else ((c+0.055)/1.055) ** 2.4
    R, G, B = lin(r), lin(g), lin(b)
    return 0.2126*R + 0.7152*G + 0.0722*B


def contrast_ratio(fg: str, bg: str) -> float:
    L1 = rel_luminance(fg)
    L2 = rel_luminance(bg)
    L1, L2 = (L1, L2) if L1 >= L2 else (L2, L1)
    return (L1 + 0.05) / (L2 + 0.05)


@dataclass
class Finding:
    file: str
    line: int
    kind: str
    value: str
    suggestion: Optional[str] = None
    note: Optional[str] = None


def parse_tokens(tokens_path: Path) -> Tuple[Dict[str,str], Dict[str,str]]:
    dark: Dict[str,str] = {}
    light: Dict[str,str] = {}
    if not tokens_path.exists():
        return dark, light
    text = tokens_path.read_text(encoding='utf-8', errors='ignore')

    # crude block splits
    # Dark: lines until [data-theme="light"]
    parts = re.split(r"\[data-theme=\"light\"\] \{", text)
    dark_block = parts[0]
    light_block = parts[1] if len(parts) > 1 else ''

    var_re = re.compile(r"--([a-z0-9_-]+):\s*([^;]+);")
    hex_or_func = re.compile(r"#[0-9a-fA-F]{3,6}|[a-zA-Z]+\(|rgba?\(|oklch\(|oklab\(|var\(")

    for m in var_re.finditer(dark_block):
        name, value = m.group(1), m.group(2).strip()
        if HEX_RE.search(value):
            # capture first hex
            hx = HEX_RE.search(value).group(0)
            dark[f"--{name}"] = hx

    for m in var_re.finditer(light_block):
        name, value = m.group(1), m.group(2).strip()
        if HEX_RE.search(value):
            hx = HEX_RE.search(value).group(0)
            light[f"--{name}"] = hx

    return dark, light


def nearest_token(hex_val: str, dark: Dict[str,str], light: Dict[str,str]) -> Tuple[str, float]:
    # Score by sum of distances in both palettes when available
    lab_hex = hex_to_lab(hex_val)
    best_token = ''
    best_score = float('inf')
    all_tokens = set(dark.keys()) | set(light.keys())
    for t in all_tokens:
        score = 0.0
        cnt = 0
        if t in dark and HEX_RE.fullmatch(dark[t]):
            score += lab_dist(lab_hex, hex_to_lab(dark[t]))
            cnt += 1
        if t in light and HEX_RE.fullmatch(light[t]):
            score += lab_dist(lab_hex, hex_to_lab(light[t]))
            cnt += 1
        if cnt == 0:
            continue
        score = score / cnt
        if score < best_score:
            best_score = score
            best_token = t
    return best_token, best_score


def scan_files(root: Path) -> List[Path]:
    pats = (".css", ".scss", ".less", ".html", ".js", ".jsx", ".ts", ".tsx")
    out: List[Path] = []
    for p in root.rglob("*"):
        if p.is_file() and p.suffix.lower() in pats:
            out.append(p)
    return out


def analyze(root: Path, tokens_path: Path) -> Dict:
    dark, light = parse_tokens(tokens_path)
    findings: List[Finding] = []
    risky: List[Finding] = []
    contrasts: List[Finding] = []

    files = scan_files(root)
    for fp in files:
        try:
            text = fp.read_text(encoding='utf-8', errors='ignore')
        except Exception:
            continue

        # Risky feature scan
        for feat in RISKY_FEATURES:
            for m in re.finditer(re.escape(feat), text):
                line = text.count('\n', 0, m.start()) + 1
                risky.append(Finding(str(fp), line, 'risky_feature', feat, note='Flag for compatibility review'))

        # Hex occurrences
        for m in HEX_RE.finditer(text):
            hx = m.group(0)
            line = text.count('\n', 0, m.start()) + 1
            tok, score = nearest_token(hx, dark, light)
            suggestion = None
            note = None
            if tok:
                # Threshold heuristic: <= 8 is generally close; otherwise require manual
                suggestion = f"var({tok})" if score <= 8.0 else None
                if suggestion is None:
                    note = f"Closest var({tok}) but distance={score:.1f}; manual review"
                else:
                    note = f"Nearest token distance={score:.1f}"
            findings.append(Finding(str(fp), line, 'hardcoded_hex', hx, suggestion, note))

        # Inline contrast checks (same style attribute only)
        for sm in STYLE_BLOCK_RE.finditer(text):
            style = sm.group(1) or sm.group(2) or ''
            # search for color and background/backgr-color hex
            color_m = re.search(r"color\s*:\s*([^;]+)", style)
            bg_m = re.search(r"background(?:-color)?\s*:\s*([^;]+)", style)
            if not (color_m and bg_m):
                continue
            fg_s, bg_s = color_m.group(1).strip(), bg_m.group(1).strip()
            fg_hex = HEX_RE.search(fg_s).group(0) if HEX_RE.search(fg_s) else None
            bg_hex = HEX_RE.search(bg_s).group(0) if HEX_RE.search(bg_s) else None
            if not (fg_hex and bg_hex):
                continue
            ratio = contrast_ratio(fg_hex, bg_hex)
            if ratio < 4.5:
                line = text.count('\n', 0, sm.start()) + 1
                contrasts.append(Finding(str(fp), line, 'low_contrast', f"ratio={ratio:.2f}", note=f"fg={fg_hex} bg={bg_hex}"))

    report = {
        'root': str(root.resolve()),
        'tokens_path': str(tokens_path),
        'summary': {
            'hardcoded_hex_count': len(findings),
            'risky_feature_count': len(risky),
            'low_contrast_inline_count': len(contrasts),
        },
        'findings': [asdict(f) for f in findings],
        'risky_features': [asdict(f) for f in risky],
        'low_contrast': [asdict(f) for f in contrasts],
    }
    return report


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument('--root', default='gui', help='Directory to scan (default: gui)')
    ap.add_argument('--report', default='reports/lite_mode_audit.json', help='Path to write JSON report')
    args = ap.parse_args()

    root = Path(args.root)
    tokens = Path('gui/css/tokens.css')
    rep = analyze(root, tokens)

    outp = Path(args.report)
    outp.parent.mkdir(parents=True, exist_ok=True)
    outp.write_text(json.dumps(rep, indent=2), encoding='utf-8')

    s = rep['summary']
    print('[LiteModeAudit] Root:', rep['root'])
    print('[LiteModeAudit] Tokens:', rep['tokens_path'])
    print('[LiteModeAudit] Hardcoded hex:', s['hardcoded_hex_count'])
    print('[LiteModeAudit] Risky CSS features:', s['risky_feature_count'])
    print('[LiteModeAudit] Low-contrast (inline blocks):', s['low_contrast_inline_count'])
    print('[LiteModeAudit] JSON report ->', str(outp))


if __name__ == '__main__':
    main()

