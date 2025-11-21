# Documentation Links Reference - User Guide

**Created:** 2025-10-20
**Purpose:** Provide verified external documentation links for tooltips, error messages, and help text
**Status:** ✓ Production Ready

---

## Quick Start

### For GUI Developers (React/JavaScript)

**Use the JSON file directly:**

```javascript
import docLinks from './agent_docs/external_documentation_links.json';

// Get Qdrant indexing link
const qdrantUrl = docLinks.qdrant_links.indexing.url;
const qdrantDesc = docLinks.qdrant_links.indexing.description;

// Use in tooltip
<Tooltip title={qdrantDesc}>
  <IconButton onClick={() => window.open(qdrantUrl, '_blank')}>
    <HelpIcon />
  </IconButton>
</Tooltip>
```

**Or reference the quick guide:**
See `/agent_docs/TOOLTIP_QUICK_REFERENCE.md` for copy-paste ready code examples.

### For Backend Developers (Python)

**Import the module:**

```python
from agent_docs.documentation_links import DOCS, CommonErrors, CommonTooltips

# Get a link
help_url = DOCS.qdrant.indexing

# Format an error with link
raise ValueError(CommonErrors.invalid_hnsw_param("m", -1, "m >= 0"))

# Get tooltip data
tooltip = CommonTooltips.HNSW_M
# Returns: {'title': '...', 'description': '...', 'url': '...'}
```

### For Documentation Writers

**Reference the comprehensive guide:**
See `/agent_docs/EXTERNAL_DOCS_REFERENCE.md` for all 68 links organized by category with detailed descriptions.

---

## Available Files

### 1. `external_documentation_links.json` (14KB)
**Format:** Structured JSON
**Use Case:** Programmatic access from GUI and backend
**Contains:** All 68 links with titles, descriptions, and metadata

### 2. `EXTERNAL_DOCS_REFERENCE.md` (347 lines)
**Format:** Comprehensive Markdown
**Use Case:** Human reference, browsing documentation
**Contains:** All links organized by technology with usage examples

### 3. `TOOLTIP_QUICK_REFERENCE.md` (338 lines)
**Format:** Quick reference guide
**Use Case:** Fast implementation, copy-paste snippets
**Contains:** React/MUI examples, error templates, best practices

### 4. `documentation_links.py` (Python module)
**Format:** Importable Python module
**Use Case:** Backend error messages, logging, validation
**Contains:** Type-safe link access, error formatters, tooltip generators

### 5. `DOCUMENTATION_RESEARCH_SUMMARY.md`
**Format:** Executive summary
**Use Case:** Understanding what was researched and why
**Contains:** Methodology, findings, statistics, maintenance plan

### 6. `README_DOCUMENTATION_LINKS.md` (This file)
**Format:** User guide
**Use Case:** Getting started with the documentation links
**Contains:** Quick start guide, file descriptions, use cases

---

## Documentation Categories

We have verified links for:

1. **LangChain** - RAG, hybrid search, LCEL, agents
2. **BAAI/FlagEmbedding** - BGE models, dense retrieval
3. **Cohere** - Reranking, embeddings, API
4. **Qdrant** - Vector search, HNSW, reranking, FastEmbed
5. **Prometheus** - Metrics, alerting, data model
6. **Grafana** - Visualizations, dashboards
7. **OpenAI** - Evaluation, best practices
8. **Anthropic** - Claude API
9. **Hugging Face** - Evaluation metrics
10. **Algorithms** - BM25, RRF, ColBERT, MMR

**Total:** 68 verified links from official documentation sources

---

## Common Use Cases

### Use Case 1: Add Tooltip to Settings Input

**React/MUI:**
```jsx
import HelpOutlineIcon from '@mui/icons-material/HelpOutline';
import { Tooltip, IconButton } from '@mui/material';

<FormControl>
  <InputLabel>
    HNSW m Parameter
    <Tooltip title="Number of edges per node - higher values increase accuracy">
      <IconButton
        size="small"
        onClick={() => window.open(
          'https://qdrant.tech/documentation/concepts/indexing/',
          '_blank'
        )}
      >
        <HelpOutlineIcon fontSize="small" />
      </IconButton>
    </Tooltip>
  </InputLabel>
  <Input type="number" value={m} onChange={handleChange} />
</FormControl>
```

### Use Case 2: Error Message with Documentation

**Python Backend:**
```python
from agent_docs.documentation_links import CommonErrors

def validate_hnsw_params(m, ef_construct, ef):
    if m < 0:
        raise ValueError(CommonErrors.invalid_hnsw_param("m", m, "m >= 0"))

    if ef_construct < m:
        raise ValueError(
            f"ef_construct ({ef_construct}) must be >= m ({m}). "
            f"See https://qdrant.tech/documentation/concepts/indexing/"
        )
```

### Use Case 3: Help Panel in GUI

**React Component:**
```jsx
const HelpPanel = ({ topic }) => {
  const docLinks = require('./agent_docs/external_documentation_links.json');
  const link = docLinks.qdrant_links[topic];

  return (
    <Card>
      <CardHeader title={link.title} />
      <CardContent>
        <Typography variant="body2" color="text.secondary">
          {link.description}
        </Typography>
        <Button
          href={link.url}
          target="_blank"
          rel="noopener"
          startIcon={<OpenInNewIcon />}
        >
          View Documentation
        </Button>
      </CardContent>
    </Card>
  );
};
```

### Use Case 4: Logging with Context

**Python Backend:**
```python
from agent_docs.documentation_links import get_doc_link
import logging

logger = logging.getLogger(__name__)

def log_config_warning(param, value, expected):
    logger.warning(
        f"Unusual {param} value: {value} (expected: {expected}). "
        f"Reference: {get_doc_link('qdrant.indexing')}"
    )
```

---

## Integration Examples

### Example 1: Settings Form Tooltips

Before:
```jsx
<TextField label="HNSW m" />
```

After:
```jsx
<TextField
  label="HNSW m"
  helperText="Number of edges per node"
  InputProps={{
    endAdornment: (
      <InputAdornment position="end">
        <IconButton
          size="small"
          onClick={() => window.open(
            docLinks.qdrant_links.indexing.url,
            '_blank'
          )}
        >
          <HelpIcon />
        </IconButton>
      </InputAdornment>
    )
  }}
/>
```

### Example 2: Error Responses

Before:
```python
raise ValueError("Invalid rerank model")
```

After:
```python
from agent_docs.documentation_links import CommonErrors

valid = ["rerank-v3.5", "rerank-multilingual-v3.0"]
raise ValueError(CommonErrors.invalid_rerank_model(model, valid))
# Result: "Invalid rerank model 'foo'. Valid models: rerank-v3.5, rerank-multilingual-v3.0. Documentation: https://docs.cohere.com/reference/rerank."
```

### Example 3: API Documentation Endpoints

```python
from fastapi import FastAPI
from agent_docs.documentation_links import load_full_json

app = FastAPI()

@app.get("/api/docs/links")
def get_documentation_links():
    """Return all external documentation links for GUI."""
    return load_full_json()

@app.get("/api/docs/link/{category}/{topic}")
def get_specific_link(category: str, topic: str):
    """Get a specific documentation link."""
    from agent_docs.documentation_links import get_doc_link
    url = get_doc_link(f"{category}.{topic}")
    if not url:
        raise HTTPException(404, "Link not found")
    return {"url": url}
```

---

## Best Practices

### 1. Always Provide Context
Don't just show a link - explain what it's for:
```jsx
// Bad
<a href={url}>Learn more</a>

// Good
<a href={url}>Learn about HNSW indexing parameters</a>
```

### 2. Use Official Sources
All our links are from official docs or academic papers. Don't replace with blog posts.

### 3. Open in New Tabs
Always use `target="_blank" rel="noopener"` for external links:
```jsx
<a href={url} target="_blank" rel="noopener">Documentation</a>
```

### 4. Make Links Accessible
Ensure screen readers can understand the link purpose:
```jsx
<IconButton
  aria-label="View HNSW indexing documentation"
  onClick={() => window.open(url, '_blank')}
>
  <HelpIcon />
</IconButton>
```

### 5. Deep Link When Possible
Link to specific sections, not just homepage:
```
✓ https://qdrant.tech/documentation/concepts/indexing/#hnsw-parameters
✗ https://qdrant.tech/
```

---

## Updating the Documentation Links

### When to Update

1. **New features added** - Add links for new concepts
2. **Broken links found** - Replace with updated URLs
3. **Version changes** - Update to latest stable docs
4. **Quarterly review** - Check all links still work

### How to Update

1. **Edit JSON:**
   ```bash
   # Edit the source of truth
   vim /agent_docs/external_documentation_links.json
   ```

2. **Update Python module:**
   ```bash
   # If adding new links, update documentation_links.py
   vim /agent_docs/documentation_links.py
   ```

3. **Regenerate docs:**
   ```bash
   # Update markdown files to reflect changes
   # (or edit manually if small change)
   ```

4. **Test:**
   ```bash
   # Validate JSON
   python3 -m json.tool external_documentation_links.json

   # Test Python module
   python3 documentation_links.py
   ```

5. **Commit:**
   ```bash
   git add agent_docs/
   git commit -m "docs: Update external documentation links"
   ```

### Maintenance Schedule

- **Monthly:** Spot check 5-10 random links
- **Quarterly:** Full review of all 68 links
- **As needed:** Update when new features added

**Next Review Due:** January 20, 2026

---

## Troubleshooting

### Problem: Link returns 404

**Solution:** Check if documentation moved. Search for new URL and update JSON.

Example:
```bash
# Search for new location
curl -I https://old-url.com  # Check redirect
# Update JSON with new URL
```

### Problem: Import error in Python

**Solution:** Ensure you're in the project root:
```bash
cd /Users/davidmontgomery/agro-rag-engine
python3 -c "from agent_docs.documentation_links import DOCS"
```

### Problem: JSON not loading in React

**Solution:** Check import path:
```jsx
// Relative path from your component
import docLinks from '../agent_docs/external_documentation_links.json';
```

### Problem: Outdated version in docs

**Solution:** Most links point to `/latest/` or stable versions. If version-specific docs needed, add to JSON:
```json
{
  "qdrant_links": {
    "indexing_v1_10": {
      "url": "https://qdrant.tech/documentation/v1.10/concepts/indexing/",
      "title": "Indexing (v1.10)",
      "description": "Version-specific HNSW indexing documentation"
    }
  }
}
```

---

## Statistics

- **Total Links:** 68
- **Categories:** 10
- **Official Sources:** 100%
- **Last Verified:** 2025-10-20
- **Files Generated:** 6
- **Lines of Code/Docs:** 1000+
- **JSON Size:** 14KB
- **Python Module:** 350+ lines

---

## FAQ

### Q: Can I add my own custom links?

**A:** Yes! Edit `external_documentation_links.json` and add your link following the existing structure.

### Q: How do I know which link to use for a specific error?

**A:** Check `TOOLTIP_QUICK_REFERENCE.md` for common error templates, or use `CommonErrors` class in Python.

### Q: Are these links updated automatically?

**A:** No, this is a curated library. Links should be reviewed quarterly and updated as needed.

### Q: Can I use these links in API responses?

**A:** Yes! Use the `load_full_json()` function or create an endpoint that serves the links.

### Q: What if a link is behind a paywall?

**A:** All our links are to free, publicly accessible documentation. If you find a paywalled link, please report it.

### Q: How were these links verified?

**A:** All links were found via web search from official documentation sites and verified as accessible in October 2025.

---

## Support

### Need Help?

1. **Check the docs:**
   - Comprehensive guide: `EXTERNAL_DOCS_REFERENCE.md`
   - Quick reference: `TOOLTIP_QUICK_REFERENCE.md`
   - Research summary: `DOCUMENTATION_RESEARCH_SUMMARY.md`

2. **Test the module:**
   ```bash
   python3 agent_docs/documentation_links.py
   ```

3. **Check examples:**
   All files include usage examples at the bottom

4. **Review the JSON:**
   ```bash
   cat agent_docs/external_documentation_links.json | jq .
   ```

---

## Project Context

This documentation library was created to support the agro-rag-engine project's accessibility requirements. Per CLAUDE.md:

> "All new settings, variables that can be changed, parameters that can we tweaked, or api endpoints that can return information MUST BE ADDED TO THE GUI. THIS IS AN ACCESSIBILITY ISSUE as the user is extremely dyslexic."

By providing authoritative external documentation links in tooltips and error messages, we:
- ✓ Enable self-service learning
- ✓ Reduce cognitive load
- ✓ Support ADA compliance
- ✓ Improve user experience for all skill levels

---

## What's Next?

### Recommended Implementation Order

1. **Phase 1:** Add tooltips to all settings inputs (use `CommonTooltips`)
2. **Phase 2:** Enhance error messages with links (use `CommonErrors`)
3. **Phase 3:** Create help panel/sidebar in GUI (use full JSON)
4. **Phase 4:** Add contextual help to complex workflows
5. **Phase 5:** Create onboarding tutorial referencing docs

### Future Enhancements

- [ ] Add more algorithm explanations (e.g., FAISS, ANNOY)
- [ ] Include video tutorial links where available
- [ ] Add interactive demos/playgrounds
- [ ] Create category-specific deep dive guides
- [ ] Add "Related Topics" linking between concepts

---

## File Locations

All files are in `/Users/davidmontgomery/agro-rag-engine/agent_docs/`:

```
agent_docs/
├── external_documentation_links.json          # Source of truth (JSON)
├── documentation_links.py                     # Python module
├── EXTERNAL_DOCS_REFERENCE.md                 # Comprehensive guide
├── TOOLTIP_QUICK_REFERENCE.md                 # Quick reference
├── DOCUMENTATION_RESEARCH_SUMMARY.md          # Research summary
└── README_DOCUMENTATION_LINKS.md              # This file
```

---

**Ready to use!** Pick the file that matches your use case and start adding helpful documentation links to your code.

**Questions?** Check the comprehensive guide or research summary for more details.

---

**Created by:** Documentation Research Agent
**Date:** 2025-10-20
**Status:** Production Ready ✓
