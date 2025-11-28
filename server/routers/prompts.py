"""API endpoints for managing system prompts.

System prompts control LLM behavior across the RAG pipeline.
All prompts are stored in agro_config.json under the system_prompts section.
"""

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import Dict, Any, Optional

from server.services.config_store import get_config, set_config
from server.services.config_registry import get_config_registry

router = APIRouter(prefix="/api/prompts", tags=["prompts"])

# Prompt metadata for the UI
PROMPT_METADATA = {
    "main_rag_chat": {
        "label": "Main RAG Chat",
        "description": "Primary chat system prompt for answering codebase questions",
        "category": "chat"
    },
    "query_expansion": {
        "label": "Query Expansion",
        "description": "Generate query variants for better recall in hybrid search",
        "category": "retrieval"
    },
    "query_rewrite": {
        "label": "Query Rewrite",
        "description": "Optimize user query for code search - expand CamelCase, include API nouns",
        "category": "retrieval"
    },
    "semantic_cards": {
        "label": "Semantic Cards",
        "description": "Generate JSON summaries for code chunks during indexing",
        "category": "indexing"
    },
    "code_enrichment": {
        "label": "Code Enrichment",
        "description": "Extract metadata from code chunks during indexing",
        "category": "indexing"
    },
    "eval_analysis": {
        "label": "Eval Analysis",
        "description": "Analyze eval regressions with skeptical approach - avoid false explanations",
        "category": "evaluation"
    },
}


class PromptUpdate(BaseModel):
    """Request body for updating a single prompt."""
    value: str


class PromptsResponse(BaseModel):
    """Response containing all prompts with metadata."""
    prompts: Dict[str, str]
    metadata: Dict[str, Dict[str, str]]


@router.get("", response_model=PromptsResponse)
async def get_prompts() -> PromptsResponse:
    """Get all system prompts with their metadata.

    Returns prompts from the config registry, which reflects
    values from agro_config.json (or defaults if not set).
    """
    registry = get_config_registry()

    prompts = {
        "main_rag_chat": registry.get_str("PROMPT_MAIN_RAG_CHAT", ""),
        "query_expansion": registry.get_str("PROMPT_QUERY_EXPANSION", ""),
        "query_rewrite": registry.get_str("PROMPT_QUERY_REWRITE", ""),
        "semantic_cards": registry.get_str("PROMPT_SEMANTIC_CARDS", ""),
        "code_enrichment": registry.get_str("PROMPT_CODE_ENRICHMENT", ""),
        "eval_analysis": registry.get_str("PROMPT_EVAL_ANALYSIS", ""),
    }

    return PromptsResponse(prompts=prompts, metadata=PROMPT_METADATA)


@router.get("/{prompt_name}")
async def get_prompt(prompt_name: str) -> Dict[str, Any]:
    """Get a single prompt by name.

    Args:
        prompt_name: One of the prompt keys (main_rag_chat, query_expansion, etc.)
    """
    if prompt_name not in PROMPT_METADATA:
        raise HTTPException(status_code=404, detail=f"Unknown prompt: {prompt_name}")

    registry = get_config_registry()
    key = f"PROMPT_{prompt_name.upper()}"
    value = registry.get_str(key, "")

    return {
        "name": prompt_name,
        "value": value,
        **PROMPT_METADATA[prompt_name]
    }


@router.put("/{prompt_name}")
async def update_prompt(prompt_name: str, body: PromptUpdate) -> Dict[str, Any]:
    """Update a single system prompt.

    Updates the prompt in agro_config.json and reloads the config registry.

    Args:
        prompt_name: One of the prompt keys (main_rag_chat, query_expansion, etc.)
        body: Request body containing the new prompt value
    """
    if prompt_name not in PROMPT_METADATA:
        raise HTTPException(status_code=404, detail=f"Unknown prompt: {prompt_name}")

    if not body.value or not body.value.strip():
        raise HTTPException(status_code=400, detail="Prompt value cannot be empty")

    # Update the config - this writes to agro_config.json and reloads the registry
    key = f"PROMPT_{prompt_name.upper()}"
    set_config({"env": {key: body.value}})

    return {
        "ok": True,
        "prompt": prompt_name,
        "message": f"Prompt '{prompt_name}' updated successfully"
    }


@router.post("/reset/{prompt_name}")
async def reset_prompt(prompt_name: str) -> Dict[str, Any]:
    """Reset a prompt to its default value.

    Args:
        prompt_name: One of the prompt keys (main_rag_chat, query_expansion, etc.)
    """
    if prompt_name not in PROMPT_METADATA:
        raise HTTPException(status_code=404, detail=f"Unknown prompt: {prompt_name}")

    # Get the default from the Pydantic model
    from server.models.agro_config_model import SystemPromptsConfig
    defaults = SystemPromptsConfig()
    default_value = getattr(defaults, prompt_name, None)

    if default_value is None:
        raise HTTPException(status_code=500, detail=f"No default found for prompt: {prompt_name}")

    # Update with default value
    key = f"PROMPT_{prompt_name.upper()}"
    set_config({"env": {key: default_value}})

    return {
        "ok": True,
        "prompt": prompt_name,
        "message": f"Prompt '{prompt_name}' reset to default"
    }
