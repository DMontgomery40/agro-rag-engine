=============================================================================
CLI CONFIG_REGISTRY MIGRATION - DETAILED PER-FILE BREAKDOWN
=============================================================================

EXECUTIVE SUMMARY:
- Total files: 6
- Total os.getenv() migrated: 20
- Remaining os.getenv(): 1 (OPENAI_API_KEY - intentionally preserved)
- Status: COMPLETE ✓

=============================================================================
FILE 1: cli/chat_cli.py
=============================================================================

BEFORE: 5 os.getenv() calls
AFTER: 0 os.getenv() calls

Changes made:
  Line 41:  Added: from server.services.config_registry import get_config_registry
  Line 51:  Added: _config_registry = get_config_registry()
  Line 52:  Added: _config_registry.load()
  Line 53:  Changed: REPO = os.getenv('REPO', 'agro')
            To:      REPO = _config_registry.get_str('REPO', 'agro')
  Line 54:  Changed: THREAD_ID = os.getenv('THREAD_ID', 'cli-chat')
            To:      THREAD_ID = _config_registry.get_str('THREAD_ID', 'cli-chat')
  Line 55:  Changed: PORT = int(os.getenv('PORT', '8012'))
            To:      PORT = _config_registry.get_int('PORT', 8012)
  Line 334: Changed: repo = os.getenv('REPO', 'agro')
            To:      repo = _config_registry.get_str('REPO', 'agro')
  Line 335: Changed: thread_id = os.getenv('THREAD_ID', 'cli-chat')
            To:      thread_id = _config_registry.get_str('THREAD_ID', 'cli-chat')

Parameters migrated:
  - REPO (string)
  - THREAD_ID (string)
  - PORT (integer)

=============================================================================
FILE 2: cli/commands/chat.py
=============================================================================

BEFORE: 1 os.getenv() call
AFTER: 0 os.getenv() calls

Changes made:
  Line 4:   Added: from server.services.config_registry import get_config_registry
  Line 8:   Added: _config_registry = get_config_registry()
  Line 27:  Changed: @click.option("--repo", default=os.getenv("REPO", "agro"), ...)
            To:      @click.option("--repo", default=lambda: _config_registry.get_str("REPO", "agro"), ...)

Parameters migrated:
  - REPO (string)

=============================================================================
FILE 3: cli/commands/config.py
=============================================================================

BEFORE: 4 os.getenv() calls
AFTER: 1 os.getenv() call (OPENAI_API_KEY - intentionally preserved)

Changes made:
  Line 6:   Added: from server.services.config_registry import get_config_registry
  Line 10:  Added: _config_registry = get_config_registry()
  Line 91:  Changed: gen_model = Prompt.ask("...", default=os.getenv("GEN_MODEL", "gpt-4o-mini"))
            To:      gen_model = Prompt.ask("...", default=_config_registry.get_str("GEN_MODEL", "gpt-4o-mini"))
  Line 94:  PRESERVED: if "gpt" in gen_model and not os.getenv("OPENAI_API_KEY"):
            (Correct - OPENAI_API_KEY is a secret)
  Line 100: Changed: final_k = Prompt.ask("...", default=os.getenv("FINAL_K", "10"))
            To:      final_k = Prompt.ask("...", default=str(_config_registry.get_int("FINAL_K", 10)))
  Line 105: Changed: curr_rr = "yes" if os.getenv("AGRO_RERANKER_ENABLED", "0") == "1" else "no"
            To:      curr_rr = "yes" if _config_registry.get_bool("AGRO_RERANKER_ENABLED", False) else "no"

Parameters migrated:
  - GEN_MODEL (string)
  - FINAL_K (integer)
  - AGRO_RERANKER_ENABLED (boolean)

Parameters preserved:
  - OPENAI_API_KEY (secret - intentionally kept as os.getenv())

=============================================================================
FILE 4: cli/commands/index.py
=============================================================================

BEFORE: 1 os.getenv() call
AFTER: 0 os.getenv() calls

Changes made:
  Line 4:   Added: from server.services.config_registry import get_config_registry
  Line 8:   Added: _config_registry = get_config_registry()
  Line 27:  Changed: @click.option("--repo", default=os.getenv("REPO", "agro"), ...)
            To:      @click.option("--repo", default=lambda: _config_registry.get_str("REPO", "agro"), ...)

Parameters migrated:
  - REPO (string)

=============================================================================
FILE 5: cli/commands/reranker.py
=============================================================================

BEFORE: 9 os.getenv() calls
AFTER: 0 os.getenv() calls

Changes made:
  Line 4:   Added: from server.services.config_registry import get_config_registry
  Line 8:   Added: _config_registry = get_config_registry()
  Line 67:  Changed: @click.option("--epochs", default=int(os.getenv("RERANKER_TRAIN_EPOCHS", "2")), ...)
            To:      @click.option("--epochs", default=lambda: _config_registry.get_int("RERANKER_TRAIN_EPOCHS", 2), ...)
  Line 68:  Changed: @click.option("--batch", default=int(os.getenv("RERANKER_TRAIN_BATCH", "16")), ...)
            To:      @click.option("--batch", default=lambda: _config_registry.get_int("RERANKER_TRAIN_BATCH", 16), ...)
  Line 69:  Changed: @click.option("--max-length", default=int(os.getenv("RERANKER_TRAIN_MAXLEN", "512")), ...)
            To:      @click.option("--max-length", default=lambda: _config_registry.get_int("AGRO_RERANKER_MAXLEN", 512), ...)
            NOTE: Changed RERANKER_TRAIN_MAXLEN to AGRO_RERANKER_MAXLEN (correct config key)
  Line 70:  Changed: @click.option("--triplets", default=os.getenv("AGRO_TRIPLETS_PATH"), ...)
            To:      @click.option("--triplets", default=lambda: _config_registry.get_str("AGRO_TRIPLETS_PATH", "data/training/triplets.jsonl"), ...)
  Line 71:  Changed: @click.option("--out", default=os.getenv("AGRO_RERANKER_MODEL_PATH"), ...)
            To:      @click.option("--out", default=lambda: _config_registry.get_str("AGRO_RERANKER_MODEL_PATH", "models/cross-encoder-agro"), ...)
  Line 87:  Changed: @click.option("--log-path", default=os.getenv("AGRO_LOG_PATH"), ...)
            To:      @click.option("--log-path", default=lambda: _config_registry.get_str("AGRO_LOG_PATH", "data/logs/queries.jsonl"), ...)
  Line 88:  Changed: @click.option("--out-path", default=os.getenv("AGRO_TRIPLETS_PATH"), ...)
            To:      @click.option("--out-path", default=lambda: _config_registry.get_str("AGRO_TRIPLETS_PATH", "data/training/triplets.jsonl"), ...)
  Line 89:  Changed: @click.option("--mode", ..., default=os.getenv("AGRO_RERANKER_MINE_MODE", "append"), ...)
            To:      @click.option("--mode", ..., default=lambda: _config_registry.get_str("AGRO_RERANKER_MINE_MODE", "append"), ...)
  Line 90:  Changed: @click.option("--reset", ..., default=os.getenv("AGRO_RERANKER_MINE_RESET", "0") == "1", ...)
            To:      @click.option("--reset", ..., default=lambda: _config_registry.get_bool("AGRO_RERANKER_MINE_RESET", False), ...)

Parameters migrated:
  - RERANKER_TRAIN_EPOCHS (integer)
  - RERANKER_TRAIN_BATCH (integer)
  - AGRO_RERANKER_MAXLEN (integer)
  - AGRO_TRIPLETS_PATH (string)
  - AGRO_RERANKER_MODEL_PATH (string)
  - AGRO_LOG_PATH (string)
  - AGRO_RERANKER_MINE_MODE (string)
  - AGRO_RERANKER_MINE_RESET (boolean)

Special notes:
  - RERANKER_TRAIN_MAXLEN was corrected to AGRO_RERANKER_MAXLEN (proper config key)

=============================================================================
FILE 6: cli/commands/utils.py
=============================================================================

BEFORE: 1 os.getenv() call
AFTER: 0 os.getenv() calls

Changes made:
  Line 7:   Added: from server.services.config_registry import get_config_registry
  Line 10:  Added: _config_registry = get_config_registry()
  Line 12:  Changed: PORT = int(os.getenv('PORT', '8012'))
            To:      PORT = _config_registry.get_int('PORT', 8012)

Parameters migrated:
  - PORT (integer)

=============================================================================
VERIFICATION COMPLETED:
=============================================================================

Syntax check:        ✓ PASSED (all 6 files)
Import check:        ✓ PASSED (all 6 files)
Smoke test suite:    ✓ PASSED (9/9 tests)

Test breakdown:
  ✓ test_cli_chat_cli_imports
  ✓ test_cli_commands_chat_imports
  ✓ test_cli_commands_config_imports
  ✓ test_cli_commands_index_imports
  ✓ test_cli_commands_reranker_imports
  ✓ test_cli_commands_utils_imports
  ✓ test_config_registry_singleton
  ✓ test_config_registry_get_methods
  ✓ test_no_tunable_os_getenv_in_cli

Final os.getenv() count:
  Total: 1
  Location: cli/commands/config.py:94
  Purpose: Check for OPENAI_API_KEY (secret)
  Status: Correct (secrets should remain as os.getenv())

=============================================================================
MIGRATION COMPLETE - ALL REQUIREMENTS MET
=============================================================================
