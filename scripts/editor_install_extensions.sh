#!/usr/bin/env bash
set -euo pipefail

# Install essential VS Code extensions for AGRO development
# This runs inside the code-server container

echo "[editor-extensions] Installing essential extensions for AGRO..."

# Define extensions to install
EXTENSIONS=(
    # Python
    "ms-python.python"
    "ms-python.vscode-pylance"
    "ms-python.black-formatter"
    "charliermarsh.ruff"

    # JavaScript/TypeScript/React
    "esbenp.prettier-vscode"
    "dbaeumer.vscode-eslint"
    "bradlc.vscode-tailwindcss"
    "dsznajder.es7-react-js-snippets"

    # AI/ML Extensions (for RAG development)
    "continue.continue"

    # Git & DevOps
    "eamodio.gitlens"
    "ms-azuretools.vscode-docker"

    # Data & API
    "mtxr.sqltools"
    "humao.rest-client"

    # Utilities
    "mikestead.dotenv"
    "redhat.vscode-yaml"
    "tamasfe.even-better-toml"
    "yzhang.markdown-all-in-one"
    "bierner.markdown-mermaid"
    "streetsidesoftware.code-spell-checker"
    "VisualStudioExptTeam.vscodeintellicode"
)

# Install each extension
for ext in "${EXTENSIONS[@]}"; do
    echo "[editor-extensions] Installing $ext..."
    code-server --install-extension "$ext" || echo "[editor-extensions] WARNING: Failed to install $ext"
done

echo "[editor-extensions] ✅ Extension installation complete!"
