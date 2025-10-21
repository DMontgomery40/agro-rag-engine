# Profile System

## Configuration Precedence (IMPORTANT)

The AGRO system uses multiple configuration sources. Understanding the precedence is critical:

```
1. .env file (HIGHEST PRIORITY - Single Source of Truth)
   ↓
2. Docker environment variables (from docker-compose.yml)
   ↓
3. Runtime os.environ (Python process environment)
   ↓
4. GUI localStorage (browser-specific, per-user settings)
   ↓
5. Profiles (LOWEST PRIORITY - Only applied when explicitly selected by user)
```

## Rules

### ✅ DO:
- Edit `.env` file for permanent configuration changes
- Use GUI to modify settings (will update `.env` automatically)
- Explicitly select and apply profiles when needed
- Save custom profiles for different workloads

### ❌ DON'T:
- Expect profiles to auto-apply on startup
- Rely on `defaults.json` (disabled to prevent confusion)
- Mix `.env` edits with profile application without understanding precedence

## Profile Files

### defaults.json.example
This is an **EXAMPLE ONLY**. It shows the format of a profile but is NOT automatically loaded.

If you want to use it:
1. Rename to `custom-profile.json` (not `defaults.json`)
2. Modify values as needed
3. Apply via GUI Profiles tab (explicit user action)

### Why defaults.json is Disabled

Previously, `defaults.json` would sometimes override `.env` values, causing:
- User confusion (settings appeared to "revert")
- Perceived data loss (API keys seemed to disappear)
- Unclear precedence (which config source wins?)

**Solution**: `.env` is the ONLY auto-loaded configuration. Profiles are ONLY applied when explicitly selected by the user.

## Backup System

Every config save via GUI automatically creates a timestamped backup:
```
.env.backup-20251021-123456
.env.backup-20251021-123512
.env.backup-20251021-123600
```

These backups allow you to roll back to any previous configuration state.

## Creating New Profiles

```json
{
  "name": "my-custom-profile",
  "profile": {
    "GEN_MODEL": "gpt-4o-mini",
    "EMBEDDING_TYPE": "openai",
    "RERANK_BACKEND": "cohere",
    "MQ_REWRITES": "3",
    "FINAL_K": "10"
  }
}
```

Save to `gui/profiles/my-custom-profile.json`, then apply via GUI.

## Best Practices

1. **For permanent changes**: Edit `.env` directly or use GUI config save
2. **For experiments**: Create a temporary profile, apply it, test, then revert
3. **For different workloads**: Create named profiles (e.g., `high-quality.json`, `low-cost.json`)
4. **For rollback**: Use `.env.backup-*` files

## Troubleshooting

**Problem**: My settings keep reverting
- **Cause**: You might be applying a profile after making `.env` changes
- **Solution**: Check if any profiles are being applied automatically (should NOT happen), verify `.env` has your changes

**Problem**: API keys disappearing
- **Cause**: Previously this was a GUI bug (now fixed with masked secret handling)
- **Solution**: Keys are now preserved in `.env` even when showing `••••••` in GUI

**Problem**: Don't know which config is active
- **Solution**: Check `/api/config` endpoint to see current running configuration
