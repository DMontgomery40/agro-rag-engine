"""Token counting and management utilities for embeddings.

Provides provider-agnostic token counting and dynamic batch sizing
to stay within API token limits.
"""

import tiktoken
import logging
from typing import List, Tuple, Optional

logger = logging.getLogger("agro.token_utils")


class TokenCounter:
    """Provider-agnostic token counter with caching."""

    def __init__(self, provider: str = "openai"):
        """Initialize token counter for provider.

        Args:
            provider: 'openai', 'voyage', 'cohere', or 'local'
        """
        self.provider = provider.lower()
        self._encoder = None
        if self.provider in ("openai", "voyage", "cohere"):
            try:
                self._encoder = tiktoken.get_encoding("cl100k_base")
            except Exception as e:
                logger.error(
                    f"⚠️  CRITICAL: tiktoken not available for {provider}! "
                    f"Falling back to character estimation (less accurate). "
                    f"Error: {e}"
                )
                logger.error("Install tiktoken: pip install tiktoken>=0.12.0")

    def count_tokens(self, text: str) -> int:
        """Count tokens in text using provider-appropriate method.

        Args:
            text: Text to count tokens in

        Returns:
            Number of tokens
        """
        if self._encoder:
            try:
                return len(self._encoder.encode(text))
            except Exception:
                pass
        # Fallback: conservative char-based estimate
        return max(1, len(text) // 4)

    def truncate_to_tokens(self, text: str, max_tokens: int) -> Tuple[str, bool]:
        """Truncate text to max_tokens.

        Args:
            text: Text to truncate
            max_tokens: Maximum number of tokens

        Returns:
            Tuple of (truncated_text, was_truncated)
        """
        if self._encoder:
            try:
                tokens = self._encoder.encode(text)
                if len(tokens) <= max_tokens:
                    return text, False
                return self._encoder.decode(tokens[:max_tokens]), True
            except Exception:
                pass
        # Fallback: char-based truncation
        max_chars = max_tokens * 4
        if len(text) <= max_chars:
            return text, False
        return text[:max_chars], True


# Global singleton cache for efficiency
_counter_cache = {}


def get_token_counter(provider: str = "openai") -> TokenCounter:
    """Get cached token counter for provider.

    Args:
        provider: Provider name

    Returns:
        TokenCounter instance
    """
    if provider not in _counter_cache:
        _counter_cache[provider] = TokenCounter(provider)
    return _counter_cache[provider]


def create_token_aware_batches(
    texts: List[str],
    max_tokens_per_batch: int,
    max_batch_size: int,
    provider: str = "openai",
) -> List[List[str]]:
    """Create batches that respect token limits using FFD bin packing.

    Uses First-Fit Decreasing (FFD) algorithm:
    1. Count tokens for all texts
    2. Sort by token count descending (helps pack efficiently)
    3. Greedily pack texts into batches
    4. Truncate oversized texts with warning

    Args:
        texts: List of texts to batch
        max_tokens_per_batch: Maximum total tokens per batch (hard limit)
        max_batch_size: Maximum number of texts per batch (soft limit)
        provider: Embedding provider for token counting

    Returns:
        List of batches, where each batch is a list of texts

    Example:
        >>> texts = ["short", "medium text here", "a very long text..."]
        >>> batches = create_token_aware_batches(texts, 8000, 64, "openai")
        >>> len(batches)  # May be multiple batches
        2
    """
    if not texts:
        return []

    counter = get_token_counter(provider)

    # Count tokens for all texts (with caching)
    text_tokens: List[Tuple[str, int]] = []
    for text in texts:
        token_count = counter.count_tokens(text)

        # Truncate if single text exceeds limit
        if token_count > max_tokens_per_batch:
            logger.warning(
                f"Text truncated: {token_count} tokens → {max_tokens_per_batch} tokens "
                f"({((token_count - max_tokens_per_batch) / token_count * 100):.1f}% loss)"
            )
            text, _ = counter.truncate_to_tokens(text, max_tokens_per_batch)
            token_count = max_tokens_per_batch

        text_tokens.append((text, token_count))

    # Sort by token count (descending) for better packing (FFD algorithm)
    text_tokens.sort(key=lambda x: x[1], reverse=True)

    # FFD bin packing
    batches: List[List[str]] = []
    current_batch: List[str] = []
    current_tokens = 0

    for text, tokens in text_tokens:
        # Check if adding this text would exceed limits
        would_exceed_tokens = current_tokens + tokens > max_tokens_per_batch
        would_exceed_size = len(current_batch) >= max_batch_size

        if current_batch and (would_exceed_tokens or would_exceed_size):
            # Save current batch and start new one
            batches.append(current_batch)
            current_batch = []
            current_tokens = 0

        # Add to current batch
        current_batch.append(text)
        current_tokens += tokens

    # Don't forget the last batch
    if current_batch:
        batches.append(current_batch)

    # Log batch statistics
    if batches:
        avg_tokens = (
            sum(sum(counter.count_tokens(t) for t in batch) for batch in batches)
            / len(batches)
        )
        logger.info(
            f"Created {len(batches)} batches: "
            f"avg {avg_tokens:.0f} tokens/batch "
            f"({avg_tokens / max_tokens_per_batch * 100:.0f}% utilization)"
        )

    return batches
