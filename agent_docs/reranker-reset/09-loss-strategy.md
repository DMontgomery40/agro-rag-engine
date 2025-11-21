# Cross-Encoder Loss Strategy

> **Agents:** Re-read [`AGENTS.md`](../AGENTS.md) before touching training code or docs. All GUI/CLI controls must stay mirrored with backend behaviour.

_Last updated: 2025-10-24_

## 1. SBERT Alignment (Source of Truth)

- **Training overview:** <https://www.sbert.net/docs/cross_encoder/training_overview.html>
- **Loss catalogue:** <https://www.sbert.net/docs/cross_encoder/loss_overview.html>
- **CrossEncoder API reference:** <https://www.sbert.net/docs/package_reference/cross_encoder/index.html>

These docs define the supported objectives; we must not invent new terminology or pseudo-losses. Every feature flag, GUI label, and runbook entry must use SBERT vocabulary (e.g., “Softmax loss”, “MultipleNegativesRankingLoss”).

## 2. Supported Losses & Use Cases

| Loss | SBERT class | Expected data shape | Current repo status | Actions |
|------|-------------|---------------------|---------------------|---------|
| **Softmax / CrossEntropy** | `models.losses.SoftmaxLoss` (classification) | Triplets of `(query, pos_doc, neg_doc)` with class labels | Mining script already emits triplets; training CLI currently hardcodes CE | Parameterise training CLI to select SoftmaxLoss; surface label count + class balance telemetry. |
| **MultipleNegativesRanking** | `MultipleNegativesRankingLoss` | Batches of `(query, positive_doc)` where negatives are other positives in batch | Not implemented | Add mining path for positives-only dataset (clicks / feedback). Gate behind feature flag until telemetry validated. |
| **Margin MSE** | `MarginMSELoss` | Teacher scores + student scores per pair | Not implemented | Defer until we have teacher logits (e.g., Cohere reranker). Track in backlog. |
| **Binary Cross Entropy** | `BCEWithLogitsLoss` via `BinaryClassificationLoss` | (query, doc, label∈{0,1}) pairs | Legacy keywords pipeline hints at this, but not wired | Investigate if discriminative keyword feedback can produce binary labels; optional after standard losses ship. |

## 3. Plan of Record

1. **Audit current training code** (`scripts/train_reranker.py`) to identify hard-coded loss logic. Document findings in `04-deep-dive.md`.
2. **Introduce loss selection config**:
   - Env var `AGRO_RERANKER_LOSS` (default `softmax`), GUI select, API contract.
   - Backward compatible: absence ⇒ `softmax`.
3. **Refactor training CLI**:
   - Load dataset according to selected loss (triplets vs. positives-only).
   - Instantiate SBERT CrossEncoder with the canonical loss class.
   - Log loss choice to Promtail (for Grafana card auditing).
4. **Evaluation alignment**:
   - Ensure `/api/reranker/evaluate` and regression dashboards annotate which loss produced the model.
   - Update metrics plan so Prometheus histograms use loss label dimension.
5. **Testing**:
   - Unit tests for config parsing (`tests/unit/test_reranker_config.py`) covering each loss option.
   - Smoke test that training CLI exits 0 with `--loss softmax`.
   - Playwright: Learning Reranker tab shows dropdown + preserves choice.

## 4. Runbook / Documentation Updates

- Update `03-runbooks/training.md` with step-by-step instructions to choose a loss, verify dataset shape, run training, evaluate, and promote.
- Extend `05-unified-config.md` Section 11 to reference single-reranker selection plus loss picklist.
- Link to this file from `04-deep-dive.md` terminology table so future agents see the canonical names.

## 5. Open Questions

1. Can our mined triplets support both Softmax and MultipleNegativesRanking without duplicating storage?
2. Do we need to add GUI affordances for batch size per loss (e.g., MNR requires larger batches)?
3. How do we version models by loss type? (Proposed: include loss in metrics label + model directory suffix.)

Track answers in `02-decision-log.md` before merging any implementation. No training changes ship until this checklist is satisfied and Playwright + smoke suites pass.
