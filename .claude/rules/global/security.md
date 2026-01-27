# Security Rules

Critical security requirements that apply across the entire codebase.

## Never Edit .env

The `.env` file contains secrets and infrastructure configuration.
- **Never** edit, write to, or commit `.env` files
- API keys belong in `.env` only
- Configuration goes in `agro_config.json`, not `.env`

## API Key Handling

API keys must NEVER be exposed to the frontend:
1. Store keys in `.env` only
2. Backend checks existence via `/api/secrets/check` → returns boolean
3. Frontend displays "Configured" / "Not configured" status
4. User edits `.env` directly

Reference: `web/src/components/RAG/RerankerConfigSubtab.tsx`

## No dangerouslySetInnerHTML

**Never use `dangerouslySetInnerHTML` anywhere in the React codebase.**

If pre-existing, fix immediately. Use safe alternatives:
- React components for structured content
- DOMPurify for unavoidable HTML (rare)
- Plain text rendering

## Input Validation

- Validate at system boundaries (user input, external APIs)
- Trust internal code and framework guarantees
- Don't over-validate internal data flow

## OWASP Top 10 Awareness

Be aware of common vulnerabilities:
- SQL injection (use parameterized queries)
- XSS (no raw HTML rendering)
- Command injection (sanitize shell inputs)
- Path traversal (validate file paths)

## Secrets in Code

Never hardcode:
- API keys
- Passwords
- Private keys
- Connection strings with credentials

Use `.env` for secrets, `agro_config.json` for configuration.
