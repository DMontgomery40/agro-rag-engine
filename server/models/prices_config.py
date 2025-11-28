from typing import List, Optional

from pydantic import BaseModel, ConfigDict, Field, model_validator


class PriceEntry(BaseModel):
    """Single entry in prices.json."""

    provider: str = Field(default="", description="Provider identifier (e.g., openai, cohere)")
    family: Optional[str] = Field(default=None, description="Model family name")
    model: str = Field(default="", description="Exact model id")
    unit: str = Field(default="1k_tokens", description="Billing unit (1k_tokens or request)")
    input_per_1k: Optional[float] = Field(default=None, description="Input token price per 1k")
    output_per_1k: Optional[float] = Field(default=None, description="Output token price per 1k")
    embed_per_1k: Optional[float] = Field(default=None, description="Embedding price per 1k")
    rerank_per_1k: Optional[float] = Field(default=None, description="Rerank price per 1k units")
    per_request: Optional[float] = Field(default=None, description="Flat price per request")
    components: List[str] = Field(default_factory=list, description="Components: GEN/EMB/RERANK")
    notes: Optional[str] = Field(default=None, description="Freeform notes")
    quality_score: Optional[float] = Field(default=None, description="Quality score heuristic")
    latency_p95_ms: Optional[float] = Field(default=None, description="p95 latency in ms")
    throughput_qps: Optional[float] = Field(default=None, description="Throughput in QPS")
    region: Optional[str] = Field(default=None, description="Region identifier (e.g., us-east-1)")
    compliance: List[str] = Field(default_factory=list, description="Compliance flags (e.g., soc2)")

    model_config = ConfigDict(extra="allow")

    @model_validator(mode="after")
    def _clamp_numbers(self):
        # Ensure numeric fields are non-negative when provided
        for key in ("input_per_1k", "output_per_1k", "embed_per_1k", "rerank_per_1k", "per_request"):
            val = getattr(self, key)
            if val is not None and val < 0:
                setattr(self, key, 0.0)
        return self


class PricesConfig(BaseModel):
    """Root schema for prices.json."""

    models: List[PriceEntry] = Field(default_factory=list)
    currency: str = Field(default="USD")
    last_updated: Optional[str] = Field(default=None)

    model_config = ConfigDict(extra="allow")
