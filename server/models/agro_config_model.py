"""Pydantic models for agro_config.json validation and type safety.

This module defines the schema for tunable RAG parameters stored in agro_config.json.
Using Pydantic provides:
- Type validation at load time
- Range validation (e.g., rrf_k_div must be 1-200)
- Clear error messages for invalid configs
- Default values that match current hardcoded values
- JSON schema generation for documentation
"""

from pydantic import BaseModel, Field, field_validator, model_validator
from typing import Optional


class RetrievalConfig(BaseModel):
    """Configuration for retrieval and search parameters."""

    rrf_k_div: int = Field(
        default=60,
        ge=1,
        le=200,
        description="RRF rank smoothing constant (higher = more weight to top ranks)"
    )

    langgraph_final_k: int = Field(
        default=20,
        ge=1,
        le=100,
        description="Number of final results to return in LangGraph pipeline"
    )

    max_query_rewrites: int = Field(
        default=2,
        ge=1,
        le=10,
        description="Maximum number of query rewrites for multi-query expansion"
    )

    fallback_confidence: float = Field(
        default=0.55,
        ge=0.0,
        le=1.0,
        description="Confidence threshold for fallback retrieval strategies"
    )

    @field_validator('rrf_k_div')
    @classmethod
    def validate_rrf_k_div(cls, v):
        """Ensure RRF k_div is reasonable."""
        if v < 10:
            raise ValueError('rrf_k_div should be at least 10 for meaningful rank smoothing')
        return v


class ScoringConfig(BaseModel):
    """Configuration for result scoring and boosting."""

    card_bonus: float = Field(
        default=0.08,
        ge=0.0,
        le=1.0,
        description="Bonus score for chunks matched via card-based retrieval"
    )

    filename_boost_exact: float = Field(
        default=1.5,
        ge=1.0,
        le=5.0,
        description="Score multiplier when filename exactly matches query terms"
    )

    filename_boost_partial: float = Field(
        default=1.2,
        ge=1.0,
        le=3.0,
        description="Score multiplier when path components match query terms"
    )

    @model_validator(mode='after')
    def validate_exact_boost_greater_than_partial(self):
        """Ensure exact boost is greater than partial boost."""
        if self.filename_boost_exact <= self.filename_boost_partial:
            raise ValueError('filename_boost_exact should be greater than filename_boost_partial')
        return self


class AgroConfigRoot(BaseModel):
    """Root configuration model for agro_config.json.

    This is the top-level model that contains all configuration categories.
    The nested structure provides logical grouping and better organization.
    """

    retrieval: RetrievalConfig = Field(default_factory=RetrievalConfig)
    scoring: ScoringConfig = Field(default_factory=ScoringConfig)

    class Config:
        # Allow extra fields for forward compatibility
        extra = 'allow'
        # Use nested JSON structure
        json_schema_extra = {
            "description": "AGRO RAG Engine tunable configuration parameters",
            "title": "AGRO Config"
        }

    def to_flat_dict(self) -> dict[str, any]:
        """Convert nested config to flat dict with env-style keys.

        This provides backward compatibility with existing code that expects
        flat environment variable names like 'RRF_K_DIV' instead of nested
        access like config.retrieval.rrf_k_div.

        Returns:
            Flat dictionary mapping env-style keys to values:
            {
                'RRF_K_DIV': 60,
                'CARD_BONUS': 0.08,
                ...
            }
        """
        return {
            # Retrieval params
            'RRF_K_DIV': self.retrieval.rrf_k_div,
            'LANGGRAPH_FINAL_K': self.retrieval.langgraph_final_k,
            'MAX_QUERY_REWRITES': self.retrieval.max_query_rewrites,
            'FALLBACK_CONFIDENCE': self.retrieval.fallback_confidence,
            # Scoring params
            'CARD_BONUS': self.scoring.card_bonus,
            'FILENAME_BOOST_EXACT': self.scoring.filename_boost_exact,
            'FILENAME_BOOST_PARTIAL': self.scoring.filename_boost_partial,
        }

    @classmethod
    def from_flat_dict(cls, data: dict[str, any]) -> 'AgroConfigRoot':
        """Create config from flat env-style dict.

        This allows the API to receive updates in the traditional flat format
        and convert them to the nested structure for storage.

        Args:
            data: Flat dictionary with env-style keys

        Returns:
            AgroConfigRoot instance with nested structure
        """
        return cls(
            retrieval=RetrievalConfig(
                rrf_k_div=data.get('RRF_K_DIV', 60),
                langgraph_final_k=data.get('LANGGRAPH_FINAL_K', 20),
                max_query_rewrites=data.get('MAX_QUERY_REWRITES', 2),
                fallback_confidence=data.get('FALLBACK_CONFIDENCE', 0.55),
            ),
            scoring=ScoringConfig(
                card_bonus=data.get('CARD_BONUS', 0.08),
                filename_boost_exact=data.get('FILENAME_BOOST_EXACT', 1.5),
                filename_boost_partial=data.get('FILENAME_BOOST_PARTIAL', 1.2),
            )
        )


# Default config instance for easy access
DEFAULT_CONFIG = AgroConfigRoot()

# Set of keys that belong in agro_config.json (not .env)
AGRO_CONFIG_KEYS = {
    'RRF_K_DIV',
    'LANGGRAPH_FINAL_K',
    'MAX_QUERY_REWRITES',
    'FALLBACK_CONFIDENCE',
    'CARD_BONUS',
    'FILENAME_BOOST_EXACT',
    'FILENAME_BOOST_PARTIAL',
}
