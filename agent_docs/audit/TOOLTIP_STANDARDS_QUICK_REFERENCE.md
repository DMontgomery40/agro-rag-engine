# AGRO Tooltip Standards Quick Reference

**Use this guide when adding tooltips to any new UI element.**

## Quick Rules

1. **Every interactive element needs a tooltip** (buttons, inputs, selects)
   - Exception: Obvious elements (OK, Cancel) can have aria-label only

2. **Structure tooltip as**:
   - Title (5-7 words): What is this?
   - Body (1-3 sentences): What does it do? When to use?
   - Links (2-3): Official docs or related concepts
   - Badges (optional): warn, info, reindex

3. **Word counts**:
   - Simple buttons: 5-20 words
   - Input fields: 15-50 words
   - Advanced config: 50-150 words
   - Complex params: 150-300+ words

4. **Tone**: Helpful, specific, honest about trade-offs

## Implementation Pattern

### For Configuration Parameters (in tooltips.js)

```javascript
PARAM_NAME: L(
  'Display Label',
  'What this does. Default value. Common use case example.',
  [
    ['Docs: Feature', '/docs/FEATURE.md'],
    ['External Reference', 'https://external.com']
  ],
  [['warn']]  // or [['info']], [['reindex']], or []
),
```

### For React Components

```tsx
// With aria-label only (for obvious buttons)
<button aria-label="Start indexing">
  Start
</button>

// With both aria-label and tooltip
<label>
  Model Selection
  <span 
    className="help-icon"
    aria-label="Help: Select the LLM for answer generation"
  >?</span>
</label>

<div className="tooltip-bubble" role="tooltip">
  <span className="tt-title">Generation Model</span>
  Select the LLM for generating answers. Larger models are slower but higher quality.
  <div className="tt-links">
    <a href="https://platform.openai.com/docs/models">OpenAI Models</a>
    <a href="https://ollama.com">Ollama Local</a>
  </div>
</div>
```

### For Inline HTML (dangerouslySetInnerHTML)

```html
<span class="tooltip-wrap">
  <span class="help-icon">?</span>
  <div class="tooltip-bubble">
    <span class="tt-title">Title</span>
    Body text here...
    <div class="tt-links">
      <a href="...">Link 1</a>
      <a href="...">Link 2</a>
    </div>
  </div>
</span>
```

## Accessibility Requirements

Every tooltip must have:
- [ ] Help icon with `aria-label`
- [ ] Tooltip bubble with `role="tooltip"`
- [ ] 4.5:1 contrast ratio (text on background)
- [ ] Readable in max 460px width (12px font)
- [ ] Keyboard-accessible (focus + hover)
- [ ] Working on both desktop and mobile

## Common Badge Types

| Badge | Use When | Color |
|-------|----------|-------|
| `warn` | High impact (cost, latency, data loss) | Red |
| `info` | Important but not critical | Blue |
| `reindex` | Requires re-running indexing | Green |

## Links Priority

1. Official docs (product, framework, library)
2. Configuration guides
3. Related concepts (Wikipedia)
4. GitHub repos
5. Research papers

## Quality Checklist

- [ ] Explains WHAT the parameter controls
- [ ] Explains WHY user might care
- [ ] Includes DEFAULT value (if notable)
- [ ] Provides RANGE or EXAMPLES
- [ ] Mentions TRADE-OFFS
- [ ] Includes 2-3 LINKS
- [ ] Uses BADGES appropriately
- [ ] Tone is helpful, not condescending
- [ ] No more than 460px max-width
- [ ] Readable at 12px font size

## Examples

### Good: Simple Button
```
Title: "Export Conversation"
Body: "Download messages as JSON file for backup or sharing with team."
Links: [["JSON Format", "https://json.org"]]
Badges: []
```

### Good: Complex Parameter
```
Title: "Reranker Top-N"
Body: """Maximum candidates to rerank. Higher (60-80) improves recall but increases latency. 
Lower (20-30) is faster but may miss results. Sweet spot: 40-50 for most workloads.
Symptom of too high: reranking takes >500ms."""
Links: [["Cross-Encoder Reranking", "https://sbert.net"], ["RAG Reranking", "https://arxiv.org..."]]
Badges: [['Advanced RAG tuning', 'info'], ['Affects latency', 'warn']]
```

### Bad: Too Vague
```
Title: "Settings"
Body: "Configure the application."
```

### Bad: Too Technical
```
Title: "Cross-Encoder Fine-tuning Learning Rate"
Body: "Adjust the weight matrix updates during gradient descent optimization..."
```

## Current Coverage

| Section | Status | Priority |
|---------|--------|----------|
| Configuration params | 95% ✅ | Done |
| Indexing tab | 70% ⚠️ | Add missing buttons |
| Retrieval tab | 67% ⚠️ | Add missing dropdowns |
| Chat tab | 0% ❌ | **High priority** |
| Docker tab | 0% ❌ | **High priority** |
| Evaluation tab | 33% ❌ | **Medium priority** |

## Files to Know

- **Tooltips definition**: `/web/src/modules/tooltips.js` (~600 tooltips)
- **React hook**: `/web/src/hooks/useTooltips.ts`
- **CSS styles**: `/web/src/styles/main.css` (.help-icon, .tooltip-bubble)
- **Glossary UI**: `/web/src/components/Dashboard/HelpGlossary.tsx`

## When in Doubt

1. Look at existing tooltips in `/web/src/modules/tooltips.js` for examples
2. Check the full accessibility audit: `agent_docs/audit/accessibility_tooltips_complete_audit.md`
3. Ask: "Would I understand this if I'd never used this tool before?"
4. If answer is "no", add more explanation or examples

---

**Last Updated**: 2025-11-21  
**Reference**: Complete audit at `agent_docs/audit/accessibility_tooltips_complete_audit.md`
