# Implementation Templates - /gui Frontend

**Generated:** 2025-11-20
**Purpose:** Copy-paste code templates for fixing identified issues
**Status:** READY FOR IMPLEMENTATION

---

## Template 1: Add Missing Parameter to HTML Form

**Use Case:** Adding one of the 54 missing RAG parameters to the GUI

### HTML Template

```html
<!-- Add to appropriate section in /gui/index.html -->
<div class="input-row">
  <label for="PARAMETER_NAME">Parameter Display Name
    <span class="help-icon" data-tooltip="PARAMETER_NAME">?</span>
  </label>
  <input
    type="number"
    id="PARAMETER_NAME"
    name="PARAMETER_NAME"
    value="DEFAULT_VALUE"
    min="MIN_VALUE"
    max="MAX_VALUE"
    step="STEP_VALUE"
    placeholder="Placeholder text"
  />
</div>
```

### For Select/Dropdown

```html
<div class="input-row">
  <label for="PARAMETER_NAME">Parameter Display Name
    <span class="help-icon" data-tooltip="PARAMETER_NAME">?</span>
  </label>
  <select id="PARAMETER_NAME" name="PARAMETER_NAME">
    <option value="option1">Option 1</option>
    <option value="option2">Option 2</option>
    <option value="option3" selected>Option 3 (default)</option>
  </select>
</div>
```

### For Checkbox

```html
<div class="input-row">
  <label>
    <input
      type="checkbox"
      id="PARAMETER_NAME"
      name="PARAMETER_NAME"
      value="1"
    />
    Parameter Display Name
    <span class="help-icon" data-tooltip="PARAMETER_NAME">?</span>
  </label>
</div>
```

### Add Tooltip (in /gui/js/tooltips.js)

```javascript
case 'PARAMETER_NAME':
  return {
    text: 'Detailed explanation of what this parameter does. Include units, ranges, and examples.',
    links: [
      { text: 'Documentation', url: 'https://docs.example.com/param' }
    ],
    example: 'Example: 150 (recommended for most use cases)'
  };
```

---

## Template 2: Fix Type Conversion in config.js

**Use Case:** Converting numeric inputs from strings to numbers

### Current Bug (lines 726-729)

```javascript
// ❌ WRONG - sends numbers as strings
if (field.type === 'checkbox') {
  val = field.checked;
} else if (field.type === 'number') {
  val = field.value;  // BUG: Still a string!
} else {
  val = field.value;
}
```

### Fixed Version

```javascript
// ✅ CORRECT - proper type conversion
if (field.type === 'checkbox') {
  val = field.checked ? 1 : 0;  // Backend expects 1/0, not true/false
} else if (field.type === 'number') {
  const parsed = parseFloat(field.value);
  val = isNaN(parsed) ? 0 : parsed;  // Safe conversion with fallback
} else if (field.type === 'text' || field.type === 'password') {
  val = field.value.trim();  // Trim whitespace
} else {
  val = field.value;
}
```

---

## Template 3: Add Parameter Validation

**Use Case:** Creating validation library for all parameters

### Create /gui/js/parameter-validator.js

```javascript
(function() {
  'use strict';

  // Parameter type definitions
  const PARAM_TYPES = {
    // Retrieval parameters
    FINAL_K: { type: 'int', min: 1, max: 100, default: 10 },
    MQ_REWRITES: { type: 'int', min: 1, max: 10, default: 2 },
    CHUNK_SIZE: { type: 'int', min: 100, max: 4000, default: 1000 },
    CHUNK_OVERLAP: { type: 'int', min: 0, max: 1000, default: 200 },

    // Scoring parameters
    RRF_K_DIV: { type: 'float', min: 10, max: 100, default: 60, step: 5 },
    CARD_BONUS: { type: 'float', min: 0, max: 1, default: 0.08, step: 0.01 },
    CONFIDENCE: { type: 'float', min: 0, max: 1, default: 0.55, step: 0.05 },

    // Enum parameters
    THEME_MODE: { type: 'enum', values: ['auto', 'light', 'dark'], default: 'auto' },
    EMBEDDING_TYPE: { type: 'enum', values: ['openai', 'local', 'voyage'], default: 'voyage' },
    RERANK_BACKEND: { type: 'enum', values: ['none', 'local', 'hf', 'cohere'], default: 'local' },

    // Boolean parameters
    SKIP_DENSE: { type: 'boolean', default: false },
    CARDS_ENRICH_DEFAULT: { type: 'boolean', default: true },

    // String parameters
    COLLECTION_NAME: { type: 'string', pattern: /^[a-zA-Z0-9_-]+$/, default: 'code_chunks' },
    QDRANT_URL: { type: 'url', default: 'http://127.0.0.1:6333' }
  };

  // Validation functions
  function validateParameter(name, value, paramDef) {
    if (!paramDef) {
      return { valid: false, error: `Unknown parameter: ${name}` };
    }

    switch (paramDef.type) {
      case 'int':
        return validateInt(value, paramDef);
      case 'float':
        return validateFloat(value, paramDef);
      case 'boolean':
        return validateBoolean(value);
      case 'enum':
        return validateEnum(value, paramDef);
      case 'string':
        return validateString(value, paramDef);
      case 'url':
        return validateURL(value);
      default:
        return { valid: false, error: `Unknown type: ${paramDef.type}` };
    }
  }

  function validateInt(value, def) {
    const num = parseInt(value, 10);
    if (isNaN(num)) {
      return { valid: false, error: 'Must be an integer' };
    }
    if (def.min !== undefined && num < def.min) {
      return { valid: false, error: `Must be at least ${def.min}` };
    }
    if (def.max !== undefined && num > def.max) {
      return { valid: false, error: `Must be at most ${def.max}` };
    }
    return { valid: true, value: num };
  }

  function validateFloat(value, def) {
    const num = parseFloat(value);
    if (isNaN(num)) {
      return { valid: false, error: 'Must be a number' };
    }
    if (def.min !== undefined && num < def.min) {
      return { valid: false, error: `Must be at least ${def.min}` };
    }
    if (def.max !== undefined && num > def.max) {
      return { valid: false, error: `Must be at most ${def.max}` };
    }
    return { valid: true, value: num };
  }

  function validateBoolean(value) {
    if (typeof value === 'boolean') {
      return { valid: true, value: value ? 1 : 0 };
    }
    if (value === '1' || value === 1 || value === 'true' || value === true) {
      return { valid: true, value: 1 };
    }
    if (value === '0' || value === 0 || value === 'false' || value === false) {
      return { valid: true, value: 0 };
    }
    return { valid: false, error: 'Must be true or false' };
  }

  function validateEnum(value, def) {
    if (def.values.includes(value)) {
      return { valid: true, value: value };
    }
    return { valid: false, error: `Must be one of: ${def.values.join(', ')}` };
  }

  function validateString(value, def) {
    const str = String(value).trim();
    if (def.pattern && !def.pattern.test(str)) {
      return { valid: false, error: 'Invalid format' };
    }
    return { valid: true, value: str };
  }

  function validateURL(value) {
    try {
      new URL(value);
      return { valid: true, value: value };
    } catch (e) {
      return { valid: false, error: 'Invalid URL format' };
    }
  }

  // Convert form value to proper type
  function convertType(value, type) {
    switch (type) {
      case 'int':
        return parseInt(value, 10);
      case 'float':
        return parseFloat(value);
      case 'boolean':
        return value === '1' || value === 1 || value === 'true' || value === true ? 1 : 0;
      default:
        return String(value).trim();
    }
  }

  // Get parameter definition
  function getParamDef(name) {
    return PARAM_TYPES[name];
  }

  // Export to window
  window.ParameterValidator = {
    validate: validateParameter,
    convertType: convertType,
    getParamDef: getParamDef,
    PARAM_TYPES: PARAM_TYPES
  };
})();
```

### Usage in config.js

```javascript
// In gatherConfigForm(), replace lines 692-730:
function gatherConfigForm() {
  const update = { env: {}, repos: [] };
  const fields = $$('[name]');

  fields.forEach(field => {
    const key = field.name;
    if (key.startsWith('repo_')) return;  // Handle separately

    // Get parameter definition
    const paramDef = window.ParameterValidator.getParamDef(key);
    if (!paramDef) {
      console.warn(`No definition for parameter: ${key}`);
      return;
    }

    // Get raw value
    let rawValue;
    if (field.type === 'checkbox') {
      rawValue = field.checked;
    } else {
      rawValue = field.value;
    }

    // Validate and convert
    const result = window.ParameterValidator.validate(key, rawValue, paramDef);
    if (result.valid) {
      update.env[key] = result.value;
    } else {
      // Show error to user
      showFieldError(field, result.error);
      console.error(`Validation failed for ${key}: ${result.error}`);
    }
  });

  // ... handle repos ...

  return update;
}
```

---

## Template 4: Fix Missing `name` Attributes

**Use Case:** Fixing the 6 controls that can't be submitted

### Find in /gui/index.html

```html
<!-- ❌ BEFORE (line 3682) -->
<input type="number" id="reranker-epochs" value="2" min="1" max="10">

<!-- ✅ AFTER -->
<input type="number" id="reranker-epochs" name="RERANKER_TRAIN_EPOCHS" value="2" min="1" max="10">
```

### All 6 Fixes

```html
<!-- Line 3682 -->
<input type="number" id="reranker-epochs" name="RERANKER_TRAIN_EPOCHS" value="2" min="1" max="10">

<!-- Line 3686 -->
<input type="number" id="reranker-batch" name="RERANKER_TRAIN_BATCH" value="16" min="1" max="64" step="4">

<!-- Line 3690 -->
<input type="number" id="reranker-maxlen" name="RERANKER_TRAIN_MAX_LENGTH" value="512" min="128" max="1024" step="64">

<!-- Line 4137 -->
<input type="number" id="eval-final-k" name="EVAL_FINAL_K" value="5" min="1" max="20">

<!-- Line 4165 -->
<input type="text" id="eval-golden-path" name="EVAL_GOLDEN_PATH" placeholder="data/golden.json">

<!-- Line 4178 -->
<input type="text" id="eval-baseline-path" name="EVAL_BASELINE_PATH" placeholder="data/evals/eval_baseline.json">
```

---

## Template 5: Fix XSS Vulnerability

**Use Case:** Safely rendering repo names without HTML injection

### In /gui/js/config.js (line 304)

```javascript
// ❌ BEFORE - XSS vulnerable
div.innerHTML = `<h4>Repo: ${repo.name}</h4>`;

// ✅ AFTER - Safe from XSS
const h4 = document.createElement('h4');
h4.textContent = `Repo: ${repo.name}`;  // textContent escapes HTML
div.appendChild(h4);
```

### Generic Safe Rendering Function

```javascript
// Add to ui-helpers.js
function safeCreateElement(tag, text, attributes = {}) {
  const element = document.createElement(tag);
  if (text) {
    element.textContent = text;  // Safe - escapes HTML
  }
  Object.keys(attributes).forEach(key => {
    element.setAttribute(key, attributes[key]);
  });
  return element;
}

// Usage
const h4 = safeCreateElement('h4', `Repo: ${repo.name}`);
div.appendChild(h4);
```

---

## Template 6: Add Timeout to Fetch Calls

**Use Case:** Preventing operations from hanging indefinitely

### Create Utility Function

```javascript
// Add to core-utils.js or create fetch-utils.js
function fetchWithTimeout(url, options = {}, timeout = 30000) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeout);

  return fetch(url, {
    ...options,
    signal: controller.signal
  })
    .then(response => {
      clearTimeout(timeoutId);
      return response;
    })
    .catch(error => {
      clearTimeout(timeoutId);
      if (error.name === 'AbortError') {
        throw new Error(`Request timeout after ${timeout}ms`);
      }
      throw error;
    });
}

window.fetchWithTimeout = fetchWithTimeout;
```

### Usage

```javascript
// Replace all fetch() calls with:
try {
  const response = await fetchWithTimeout(
    api('/api/config'),
    {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' }
    },
    30000  // 30 second timeout
  );
  const data = await response.json();
  // ... process data
} catch (error) {
  if (error.message.includes('timeout')) {
    alert('Request timed out. Please check your connection and try again.');
  } else {
    alert(`Error: ${error.message}`);
  }
}
```

---

## Template 7: Implement Chat Streaming

**Use Case:** Real-time response display for better UX

### Server-Sent Events (SSE) Implementation

```javascript
// In chat.js, replace sendMessage() with:
async function sendMessage() {
  const question = $('#chat-input').value.trim();
  if (!question) return;

  // Add user message to chat
  addMessage('user', question);
  $('#chat-input').value = '';

  // Create placeholder for assistant response
  const messageId = Date.now();
  addMessage('assistant', '', messageId);
  const assistantDiv = document.querySelector(`[data-message-id="${messageId}"] .message-content`);

  // Open SSE connection
  const params = new URLSearchParams({
    question: question,
    repo: $('#chat-repo-select').value || 'auto',
    model: localStorage.getItem('chat-model') || 'gpt-4o-mini',
    final_k: localStorage.getItem('chat-final-k') || '20'
  });

  const eventSource = new EventSource(`${api('/api/chat/stream')}?${params}`);

  let fullResponse = '';

  eventSource.onmessage = (event) => {
    try {
      const data = JSON.parse(event.data);

      if (data.type === 'token') {
        // Append token to response
        fullResponse += data.content;
        assistantDiv.textContent = fullResponse;

        // Auto-scroll
        assistantDiv.scrollIntoView({ behavior: 'smooth', block: 'end' });

      } else if (data.type === 'done') {
        // Response complete
        eventSource.close();

        // Add sources/citations if provided
        if (data.sources) {
          addCitations(messageId, data.sources);
        }

      } else if (data.type === 'error') {
        // Handle error
        assistantDiv.textContent = `Error: ${data.message}`;
        assistantDiv.classList.add('error');
        eventSource.close();
      }
    } catch (error) {
      console.error('Error parsing SSE data:', error);
    }
  };

  eventSource.onerror = (error) => {
    console.error('SSE error:', error);
    assistantDiv.textContent = 'Connection error. Please try again.';
    assistantDiv.classList.add('error');
    eventSource.close();
  };

  // Cleanup on page unload
  window.addEventListener('beforeunload', () => {
    eventSource.close();
  });
}
```

---

## Template 8: Fix Display-Only Controls

**Use Case:** Making read-only fields clearly labeled

### HTML Update

```html
<!-- ❌ BEFORE - Appears editable but isn't -->
<input type="number" id="agro-reranker-alpha" value="0.7">

<!-- ✅ AFTER - Clearly read-only -->
<div class="display-field">
  <label>AGRO Reranker Alpha (Current)</label>
  <span class="display-value" id="agro-reranker-alpha-display">0.7</span>
  <small class="help-text">Change in Advanced Settings</small>
</div>
```

### CSS (add to /gui/css/)

```css
.display-field {
  display: flex;
  flex-direction: column;
  gap: 4px;
  padding: 12px;
  background: var(--bg-elev1);
  border: 1px solid var(--line);
  border-radius: 4px;
}

.display-value {
  font-family: 'SF Mono', Monaco, monospace;
  font-size: 16px;
  font-weight: 600;
  color: var(--accent);
}

.display-field .help-text {
  font-size: 11px;
  color: var(--fg-muted);
  font-style: italic;
}
```

---

## Template 9: Implement Retry Logic

**Use Case:** Handling transient network failures

```javascript
// Add to core-utils.js or create retry-utils.js
async function fetchWithRetry(url, options = {}, maxRetries = 3) {
  let lastError;

  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      const response = await fetchWithTimeout(url, options, 30000);

      // If successful or client error (4xx), don't retry
      if (response.ok || (response.status >= 400 && response.status < 500)) {
        return response;
      }

      // Server error (5xx) - retry with exponential backoff
      lastError = new Error(`HTTP ${response.status}: ${response.statusText}`);

    } catch (error) {
      lastError = error;

      // Don't retry on AbortError (timeout)
      if (error.name === 'AbortError') {
        throw error;
      }
    }

    // Exponential backoff: 1s, 2s, 4s
    if (attempt < maxRetries - 1) {
      const delay = Math.pow(2, attempt) * 1000;
      console.log(`Retry ${attempt + 1}/${maxRetries} in ${delay}ms...`);
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }

  throw lastError || new Error('Max retries exceeded');
}

window.fetchWithRetry = fetchWithRetry;
```

---

## Template 10: Create README for Next Developer

### Create /gui/README_IMPLEMENTATION.md

```markdown
# GUI Implementation Guide

This guide helps implement fixes from the comprehensive /gui audit.

## Quick Start

1. Read `agent_docs/gui_audit/gui/MASTER_AUDIT_GUI.md` for overview
2. Review `agent_docs/gui_audit/gui/PRIORITY_ISSUES.md` for what to fix
3. Use templates in this file for copy-paste solutions

## Common Tasks

### Adding a New RAG Parameter

1. Add HTML form control using Template 1
2. Add tooltip definition using Template 1
3. Add validation rule to Template 3 (parameter-validator.js)
4. Test save/load round-trip

### Fixing Type Conversion

1. Apply Template 2 to config.js:gatherConfigForm()
2. Test all numeric parameters
3. Verify backend receives correct types

### Adding Validation

1. Create parameter-validator.js using Template 3
2. Update config.js to use validator
3. Add visual error feedback

## File Locations

- HTML forms: `/gui/index.html`
- Config logic: `/gui/js/config.js`
- Tooltips: `/gui/js/tooltips.js`
- Utilities: `/gui/js/core-utils.js`

## Testing Checklist

- [ ] Parameter saves to backend
- [ ] Parameter loads on page refresh
- [ ] Validation shows errors
- [ ] Tooltips display correctly
- [ ] No console errors
- [ ] Works in Chrome, Firefox, Safari

## Questions?

See audit documentation in `agent_docs/gui_audit/gui/`
```

---

**Templates Prepared By:** Claude Code
**Last Updated:** 2025-11-20
**Status:** READY FOR USE
**Next Step:** Copy-paste templates as needed for implementation
