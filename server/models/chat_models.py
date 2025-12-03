"""Pydantic models for unified chat endpoint.

This module defines request/response schemas for the consolidated /api/chat endpoint,
including streaming support and thinking/reasoning model compatibility.

These models provide:
- Type validation for all chat requests
- Consistent response structure across streaming and non-streaming modes
- Provider transparency metadata (backend, model, failover status)
- Support for Anthropic extended thinking and OpenAI reasoning models
"""

from pydantic import BaseModel, ConfigDict, Field
from typing import Optional, List, Dict, Any, Literal


class ChatMessageHistory(BaseModel):
    """Individual message in chat history for multi-turn conversations."""
    role: Literal["user", "assistant", "system"]
    content: str


class ChatRequest(BaseModel):
    """Unified chat request schema.

    Supports both streaming and non-streaming responses, with optional
    thinking/reasoning support for compatible models.
    """
    question: str = Field(
        ...,
        min_length=1,
        max_length=10000,
        description="User question about the codebase"
    )
    repo: Optional[str] = Field(
        None,
        description="Repository to search (from repos.json)"
    )
    model: Optional[str] = Field(
        None,
        description="Override generation model (e.g., gpt-4o, claude-3-5-sonnet)"
    )
    temperature: float = Field(
        default=0.0,
        ge=0.0,
        le=2.0,
        description="Generation temperature (0.0 = deterministic)"
    )
    max_tokens: int = Field(
        default=2048,
        ge=100,
        le=16384,
        description="Maximum tokens in response"
    )
    top_p: float = Field(
        default=1.0,
        ge=0.0,
        le=1.0,
        description="Nucleus sampling threshold"
    )
    multi_query: int = Field(
        default=1,
        ge=1,
        le=10,
        description="Number of query rewrites for multi-query expansion"
    )
    final_k: int = Field(
        default=10,
        ge=1,
        le=200,
        description="Top-K results to return"
    )
    system_prompt: Optional[str] = Field(
        None,
        max_length=50000,
        description="Custom system prompt override"
    )
    fast_mode: bool = Field(
        default=False,
        description="Skip reranking for faster response (retrieval-only)"
    )
    history: Optional[List[ChatMessageHistory]] = Field(
        None,
        description="Conversation history for multi-turn chat"
    )
    # Streaming options
    stream: bool = Field(
        default=False,
        description="Enable SSE streaming response"
    )
    include_reasoning: bool = Field(
        default=False,
        description="Include thinking/reasoning in stream (when supported by model)"
    )
    # Provider-specific options for thinking models
    reasoning_effort: Optional[Literal["low", "medium", "high"]] = Field(
        None,
        description="Reasoning effort for Anthropic extended thinking or OpenAI o-series"
    )

    model_config = ConfigDict(
        json_schema_extra={
            "example": {
                "question": "How does hybrid search work in this codebase?",
                "repo": "agro",
                "model": "gpt-4o-mini",
                "temperature": 0.0,
                "max_tokens": 2048,
                "final_k": 10,
                "stream": False
            }
        }
    )


class SearchRequest(BaseModel):
    """Retrieval-only request (no generation).

    Use this for debugging retrieval quality or when you only need
    code chunks without an LLM-generated answer.
    """
    q: str = Field(
        ...,
        min_length=1,
        max_length=10000,
        alias="question",
        description="Search query"
    )
    repo: Optional[str] = Field(
        None,
        description="Repository to search"
    )
    top_k: int = Field(
        default=10,
        ge=1,
        le=200,
        description="Number of results to return"
    )

    model_config = ConfigDict(populate_by_name=True)


class RetrievedDocument(BaseModel):
    """Single retrieved code chunk from hybrid search."""
    file_path: str = Field(..., description="Path to source file")
    start_line: int = Field(..., ge=0, description="Starting line number")
    end_line: int = Field(..., ge=0, description="Ending line number")
    code: Optional[str] = Field(None, description="Code content (when hydrated)")
    language: Optional[str] = Field(None, description="Programming language")
    rerank_score: float = Field(default=0.0, ge=0.0, le=1.0, description="Reranker confidence score")
    repo: Optional[str] = Field(None, description="Source repository")
    card_hit: bool = Field(default=False, description="Whether this came from semantic card search")


class TraceStep(BaseModel):
    """Single step in the retrieval/generation trace for debugging."""
    step: str = Field(..., description="Step name (e.g., 'retrieve', 'rerank', 'generate')")
    duration_ms: Optional[int] = Field(None, ge=0, description="Step duration in milliseconds")
    details: Dict[str, Any] = Field(default_factory=dict, description="Step-specific details")


class ProviderMeta(BaseModel):
    """LLM provider transparency metadata.

    Exposes which backend/model actually served the request,
    useful for debugging and cost tracking.
    """
    backend: Optional[str] = Field(None, description="Backend used (openai, anthropic, ollama)")
    provider: Optional[str] = Field(None, description="Provider name")
    model: Optional[str] = Field(None, description="Actual model used")
    failover: Optional[bool] = Field(None, description="Whether failover was triggered")
    ollama: Optional[bool] = Field(None, description="Whether Ollama was used")
    reasoning_tokens: Optional[int] = Field(None, ge=0, description="Reasoning tokens (OpenAI o-series)")
    thinking_tokens: Optional[int] = Field(None, ge=0, description="Thinking tokens (Anthropic extended)")


class ChatResponse(BaseModel):
    """Unified chat response schema.

    Contains the generated answer along with supporting metadata:
    citations, confidence, trace information, and provider details.
    """
    answer: str = Field(..., description="Generated answer text")
    confidence: float = Field(
        default=0.0,
        ge=0.0,
        le=1.0,
        description="Confidence score based on retrieval quality"
    )
    event_id: Optional[str] = Field(
        None,
        description="Event ID for feedback correlation"
    )
    citations: List[str] = Field(
        default_factory=list,
        description="File citations (format: file_path:start_line-end_line)"
    )
    documents: List[RetrievedDocument] = Field(
        default_factory=list,
        description="Retrieved code chunks"
    )
    trace: Optional[Dict[str, Any]] = Field(
        None,
        description="Trace data with step timings"
    )
    meta: Optional[ProviderMeta] = Field(
        None,
        description="LLM provider metadata"
    )

    model_config = ConfigDict(
        json_schema_extra={
            "example": {
                "answer": "Hybrid search combines BM25 sparse retrieval with dense vector search...",
                "confidence": 0.85,
                "event_id": "abc123",
                "citations": ["retrieval/hybrid_search.py:45-120"],
                "documents": [],
                "trace": {"steps": []},
                "meta": {"backend": "openai", "model": "gpt-4o-mini"}
            }
        }
    )


class SearchResponse(BaseModel):
    """Retrieval-only response (no generation)."""
    results: List[RetrievedDocument] = Field(..., description="Retrieved documents")
    repo: str = Field(..., description="Repository searched")
    count: int = Field(..., ge=0, description="Number of results")


class StreamChunk(BaseModel):
    """SSE stream chunk for streaming responses.

    Chunk types:
    - thinking: Reasoning/thinking content (Anthropic extended thinking, OpenAI reasoning)
    - content: Answer text content
    - citations: Citation list
    - trace: Trace data
    - meta: Provider metadata
    - done: Stream complete
    - error: Error occurred
    """
    type: Literal["thinking", "content", "citations", "trace", "meta", "done", "error"] = Field(
        ...,
        description="Chunk type"
    )
    content: Optional[str] = Field(
        None,
        description="Text content (for thinking/content types)"
    )
    data: Optional[Dict[str, Any]] = Field(
        None,
        description="Structured data (for citations/trace/meta/error types)"
    )

    model_config = ConfigDict(
        json_schema_extra={
            "examples": [
                {"type": "thinking", "content": "Let me analyze the hybrid search implementation..."},
                {"type": "content", "content": "Hybrid search combines..."},
                {"type": "citations", "data": {"citations": ["file.py:1-10"]}},
                {"type": "done", "data": None},
            ]
        }
    )


# Legacy compatibility: these can be used to validate incoming requests
# that use the old flat format before conversion
class LegacyChatPayload(BaseModel):
    """Legacy chat payload format for backward compatibility.

    Converts to ChatRequest internally.
    """
    question: str
    repo: Optional[str] = None
    model: Optional[str] = None
    temperature: Optional[float] = None
    max_tokens: Optional[int] = None
    multi_query: Optional[int] = None
    final_k: Optional[int] = None
    system_prompt: Optional[str] = None
    fast_mode: Optional[bool] = None

    def to_chat_request(self) -> ChatRequest:
        """Convert to ChatRequest with defaults applied."""
        return ChatRequest(
            question=self.question,
            repo=self.repo,
            model=self.model,
            temperature=self.temperature if self.temperature is not None else 0.0,
            max_tokens=self.max_tokens if self.max_tokens is not None else 2048,
            multi_query=self.multi_query if self.multi_query is not None else 1,
            final_k=self.final_k if self.final_k is not None else 10,
            system_prompt=self.system_prompt,
            fast_mode=self.fast_mode if self.fast_mode is not None else False,
            stream=False,
            include_reasoning=False
        )

