---
tags:
- sentence-transformers
- cross-encoder
- reranker
- generated_from_trainer
- dataset_size:100
- loss:BinaryCrossEntropyLoss
base_model: cross-encoder/ms-marco-MiniLM-L12-v2
pipeline_tag: text-ranking
library_name: sentence-transformers
---

# CrossEncoder based on cross-encoder/ms-marco-MiniLM-L12-v2

This is a [Cross Encoder](https://www.sbert.net/docs/cross_encoder/usage/usage.html) model finetuned from [cross-encoder/ms-marco-MiniLM-L12-v2](https://huggingface.co/cross-encoder/ms-marco-MiniLM-L12-v2) using the [sentence-transformers](https://www.SBERT.net) library. It computes scores for pairs of texts, which can be used for text reranking and semantic search.

## Model Details

### Model Description
- **Model Type:** Cross Encoder
- **Base model:** [cross-encoder/ms-marco-MiniLM-L12-v2](https://huggingface.co/cross-encoder/ms-marco-MiniLM-L12-v2) <!-- at revision 7b0235231ca2674cb8ca8f022859a6eba2b1c968 -->
- **Maximum Sequence Length:** 512 tokens
- **Number of Output Labels:** 1 label
<!-- - **Training Dataset:** Unknown -->
<!-- - **Language:** Unknown -->
<!-- - **License:** Unknown -->

### Model Sources

- **Documentation:** [Sentence Transformers Documentation](https://sbert.net)
- **Documentation:** [Cross Encoder Documentation](https://www.sbert.net/docs/cross_encoder/usage/usage.html)
- **Repository:** [Sentence Transformers on GitHub](https://github.com/UKPLab/sentence-transformers)
- **Hugging Face:** [Cross Encoders on Hugging Face](https://huggingface.co/models?library=sentence-transformers&other=cross-encoder)

## Usage

### Direct Usage (Sentence Transformers)

First install the Sentence Transformers library:

```bash
pip install -U sentence-transformers
```

Then you can load this model and run inference.
```python
from sentence_transformers import CrossEncoder

# Download from the 🤗 Hub
model = CrossEncoder("cross_encoder_model_id")
# Get scores for pairs of texts
pairs = [
    ['What happens when a user submits a search query?', 'post_feedback(body: FeedbackBody, request: Request) -> Dict[str, Any]:\n    """Record user feedback for a query event.\n    \n    The signal can be:\n    - thumbsup: User found the answer helpful\n    - thumbsdown: User found the answer unhelpful\n    - star1-star5: 1-5 star rating\n    - click: User clicked on a specific document\n    - noclick: User did not interact with a document\n    - note: User submitted a note (can combine with other signals)\n    \n    For click events, doc_id should specify which'],
    ['Where is rrf_fusion called?', 'rrf_fusion(results_list: List[List[tuple]], k: int = 60, weights: List[float] = None) -> List[str]:\n    """Weighted Reciprocal Rank Fusion of multiple result lists.\n    \n    Args:\n        results_list: List of [(id, score), ...] lists (e.g., [bm25_results, vector_results])\n        k: RRF constant (higher = more weight to top ranks)\n        weights: Optional weights for each result list. If None, uses config BM25_WEIGHT/VECTOR_WEIGHT\n    \n    Returns:\n        Fused list of IDs, sorted by combined'],
    ['Where is the Stemmer imported?', '"""Clean Hybrid Search - v2 Rewrite\n\nSimple, working search that:\n1. BM25 sparse search\n2. Qdrant vector search  \n3. RRF fusion\n4. Cross-encoder reranking\n5. Returns results\n\nNo bells and whistles - just working search.\n"""\n\nimport os\nimport json\nfrom pathlib import Path\nfrom typing import List, Dict, Optional\nfrom collections import defaultdict\n\n# BM25\nimport bm25s\nfrom bm25s.tokenization import Tokenizer\nfrom Stemmer import Stemmer\n\n# Qdrant\nfrom qdrant_client import QdrantClient, models\n\n# Lo'],
    ['How are code files split into smaller pieces for indexing?', 'reload_config():\n    """Reload configuration values from the registry.\n\n    Call this function after config changes to update module-level cached values.\n    This is automatically called when the config registry is reloaded via the API.\n    """\n    global _REPO, _MAX_QUERY_REWRITES, _LANGGRAPH_FINAL_K, _FALLBACK_CONFIDENCE\n    global _CONF_TOP1, _CONF_AVG5, _CONF_ANY, _PACK_BUDGET_TOKENS, _HYDRATION_MODE, _SYSTEM_PROMPT\n    _REPO = _config_registry.get_str(\'REPO\', \'agro\')\n    _MAX_QUERY_REWRITES'],
    ['How are API settings persisted and loaded?', 'secrets_ingest(text: str, persist: bool) -> Dict[str, Any]:\n    applied: Dict[str, str] = {}\n    for line in text.splitlines():\n        s = line.strip()\n        if not s or s.startswith("#") or "=" not in s:\n            continue\n        k, v = s.split("=", 1)\n        k = k.strip()\n        v = v.strip()\n        if not k:\n            continue\n        os.environ[k] = v\n        applied[k] = v\n\n    saved = False\n    if persist:\n        env_path = repo_root() / ".env"\n        existing: Dict[str, str] '],
]
scores = model.predict(pairs)
print(scores.shape)
# (5,)

# Or rank different texts based on similarity to a single text
ranks = model.rank(
    'What happens when a user submits a search query?',
    [
        'post_feedback(body: FeedbackBody, request: Request) -> Dict[str, Any]:\n    """Record user feedback for a query event.\n    \n    The signal can be:\n    - thumbsup: User found the answer helpful\n    - thumbsdown: User found the answer unhelpful\n    - star1-star5: 1-5 star rating\n    - click: User clicked on a specific document\n    - noclick: User did not interact with a document\n    - note: User submitted a note (can combine with other signals)\n    \n    For click events, doc_id should specify which',
        'rrf_fusion(results_list: List[List[tuple]], k: int = 60, weights: List[float] = None) -> List[str]:\n    """Weighted Reciprocal Rank Fusion of multiple result lists.\n    \n    Args:\n        results_list: List of [(id, score), ...] lists (e.g., [bm25_results, vector_results])\n        k: RRF constant (higher = more weight to top ranks)\n        weights: Optional weights for each result list. If None, uses config BM25_WEIGHT/VECTOR_WEIGHT\n    \n    Returns:\n        Fused list of IDs, sorted by combined',
        '"""Clean Hybrid Search - v2 Rewrite\n\nSimple, working search that:\n1. BM25 sparse search\n2. Qdrant vector search  \n3. RRF fusion\n4. Cross-encoder reranking\n5. Returns results\n\nNo bells and whistles - just working search.\n"""\n\nimport os\nimport json\nfrom pathlib import Path\nfrom typing import List, Dict, Optional\nfrom collections import defaultdict\n\n# BM25\nimport bm25s\nfrom bm25s.tokenization import Tokenizer\nfrom Stemmer import Stemmer\n\n# Qdrant\nfrom qdrant_client import QdrantClient, models\n\n# Lo',
        'reload_config():\n    """Reload configuration values from the registry.\n\n    Call this function after config changes to update module-level cached values.\n    This is automatically called when the config registry is reloaded via the API.\n    """\n    global _REPO, _MAX_QUERY_REWRITES, _LANGGRAPH_FINAL_K, _FALLBACK_CONFIDENCE\n    global _CONF_TOP1, _CONF_AVG5, _CONF_ANY, _PACK_BUDGET_TOKENS, _HYDRATION_MODE, _SYSTEM_PROMPT\n    _REPO = _config_registry.get_str(\'REPO\', \'agro\')\n    _MAX_QUERY_REWRITES',
        'secrets_ingest(text: str, persist: bool) -> Dict[str, Any]:\n    applied: Dict[str, str] = {}\n    for line in text.splitlines():\n        s = line.strip()\n        if not s or s.startswith("#") or "=" not in s:\n            continue\n        k, v = s.split("=", 1)\n        k = k.strip()\n        v = v.strip()\n        if not k:\n            continue\n        os.environ[k] = v\n        applied[k] = v\n\n    saved = False\n    if persist:\n        env_path = repo_root() / ".env"\n        existing: Dict[str, str] ',
    ]
)
# [{'corpus_id': ..., 'score': ...}, {'corpus_id': ..., 'score': ...}, ...]
```

<!--
### Direct Usage (Transformers)

<details><summary>Click to see the direct usage in Transformers</summary>

</details>
-->

<!--
### Downstream Usage (Sentence Transformers)

You can finetune this model on your own dataset.

<details><summary>Click to expand</summary>

</details>
-->

<!--
### Out-of-Scope Use

*List how the model may foreseeably be misused and address what users ought not to do with the model.*
-->

<!--
## Bias, Risks and Limitations

*What are the known or foreseeable issues stemming from this model? You could also flag here known failure cases or weaknesses of the model.*
-->

<!--
### Recommendations

*What are recommendations with respect to the foreseeable issues? For example, filtering explicit content.*
-->

## Training Details

### Training Dataset

#### Unnamed Dataset

* Size: 100 training samples
* Columns: <code>sentence_0</code>, <code>sentence_1</code>, and <code>label</code>
* Approximate statistics based on the first 100 samples:
  |         | sentence_0                                                                                    | sentence_1                                                                                        | label                                                         |
  |:--------|:----------------------------------------------------------------------------------------------|:--------------------------------------------------------------------------------------------------|:--------------------------------------------------------------|
  | type    | string                                                                                        | string                                                                                            | float                                                         |
  | details | <ul><li>min: 27 characters</li><li>mean: 38.4 characters</li><li>max: 59 characters</li></ul> | <ul><li>min: 180 characters</li><li>mean: 477.33 characters</li><li>max: 500 characters</li></ul> | <ul><li>min: 0.0</li><li>mean: 0.2</li><li>max: 1.0</li></ul> |
* Samples:
  | sentence_0                                                    | sentence_1                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                      | label            |
  |:--------------------------------------------------------------|:----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|:-----------------|
  | <code>What happens when a user submits a search query?</code> | <code>post_feedback(body: FeedbackBody, request: Request) -> Dict[str, Any]:<br>    """Record user feedback for a query event.<br>    <br>    The signal can be:<br>    - thumbsup: User found the answer helpful<br>    - thumbsdown: User found the answer unhelpful<br>    - star1-star5: 1-5 star rating<br>    - click: User clicked on a specific document<br>    - noclick: User did not interact with a document<br>    - note: User submitted a note (can combine with other signals)<br>    <br>    For click events, doc_id should specify which</code>                                              | <code>0.0</code> |
  | <code>Where is rrf_fusion called?</code>                      | <code>rrf_fusion(results_list: List[List[tuple]], k: int = 60, weights: List[float] = None) -> List[str]:<br>    """Weighted Reciprocal Rank Fusion of multiple result lists.<br>    <br>    Args:<br>        results_list: List of [(id, score), ...] lists (e.g., [bm25_results, vector_results])<br>        k: RRF constant (higher = more weight to top ranks)<br>        weights: Optional weights for each result list. If None, uses config BM25_WEIGHT/VECTOR_WEIGHT<br>    <br>    Returns:<br>        Fused list of IDs, sorted by combined</code>                                                    | <code>1.0</code> |
  | <code>Where is the Stemmer imported?</code>                   | <code>"""Clean Hybrid Search - v2 Rewrite<br><br>Simple, working search that:<br>1. BM25 sparse search<br>2. Qdrant vector search  <br>3. RRF fusion<br>4. Cross-encoder reranking<br>5. Returns results<br><br>No bells and whistles - just working search.<br>"""<br><br>import os<br>import json<br>from pathlib import Path<br>from typing import List, Dict, Optional<br>from collections import defaultdict<br><br># BM25<br>import bm25s<br>from bm25s.tokenization import Tokenizer<br>from Stemmer import Stemmer<br><br># Qdrant<br>from qdrant_client import QdrantClient, models<br><br># Lo</code> | <code>1.0</code> |
* Loss: [<code>BinaryCrossEntropyLoss</code>](https://sbert.net/docs/package_reference/cross_encoder/losses.html#binarycrossentropyloss) with these parameters:
  ```json
  {
      "activation_fn": "torch.nn.modules.linear.Identity",
      "pos_weight": null
  }
  ```

### Training Hyperparameters
#### Non-Default Hyperparameters

- `per_device_train_batch_size`: 16
- `per_device_eval_batch_size`: 16
- `num_train_epochs`: 1
- `disable_tqdm`: True

#### All Hyperparameters
<details><summary>Click to expand</summary>

- `overwrite_output_dir`: False
- `do_predict`: False
- `eval_strategy`: no
- `prediction_loss_only`: True
- `per_device_train_batch_size`: 16
- `per_device_eval_batch_size`: 16
- `per_gpu_train_batch_size`: None
- `per_gpu_eval_batch_size`: None
- `gradient_accumulation_steps`: 1
- `eval_accumulation_steps`: None
- `torch_empty_cache_steps`: None
- `learning_rate`: 5e-05
- `weight_decay`: 0.0
- `adam_beta1`: 0.9
- `adam_beta2`: 0.999
- `adam_epsilon`: 1e-08
- `max_grad_norm`: 1
- `num_train_epochs`: 1
- `max_steps`: -1
- `lr_scheduler_type`: linear
- `lr_scheduler_kwargs`: {}
- `warmup_ratio`: 0.0
- `warmup_steps`: 0
- `log_level`: passive
- `log_level_replica`: warning
- `log_on_each_node`: True
- `logging_nan_inf_filter`: True
- `save_safetensors`: True
- `save_on_each_node`: False
- `save_only_model`: False
- `restore_callback_states_from_checkpoint`: False
- `no_cuda`: False
- `use_cpu`: False
- `use_mps_device`: False
- `seed`: 42
- `data_seed`: None
- `jit_mode_eval`: False
- `bf16`: False
- `fp16`: False
- `fp16_opt_level`: O1
- `half_precision_backend`: auto
- `bf16_full_eval`: False
- `fp16_full_eval`: False
- `tf32`: None
- `local_rank`: 0
- `ddp_backend`: None
- `tpu_num_cores`: None
- `tpu_metrics_debug`: False
- `debug`: []
- `dataloader_drop_last`: False
- `dataloader_num_workers`: 0
- `dataloader_prefetch_factor`: None
- `past_index`: -1
- `disable_tqdm`: True
- `remove_unused_columns`: True
- `label_names`: None
- `load_best_model_at_end`: False
- `ignore_data_skip`: False
- `fsdp`: []
- `fsdp_min_num_params`: 0
- `fsdp_config`: {'min_num_params': 0, 'xla': False, 'xla_fsdp_v2': False, 'xla_fsdp_grad_ckpt': False}
- `fsdp_transformer_layer_cls_to_wrap`: None
- `accelerator_config`: {'split_batches': False, 'dispatch_batches': None, 'even_batches': True, 'use_seedable_sampler': True, 'non_blocking': False, 'gradient_accumulation_kwargs': None}
- `parallelism_config`: None
- `deepspeed`: None
- `label_smoothing_factor`: 0.0
- `optim`: adamw_torch_fused
- `optim_args`: None
- `adafactor`: False
- `group_by_length`: False
- `length_column_name`: length
- `project`: huggingface
- `trackio_space_id`: trackio
- `ddp_find_unused_parameters`: None
- `ddp_bucket_cap_mb`: None
- `ddp_broadcast_buffers`: False
- `dataloader_pin_memory`: True
- `dataloader_persistent_workers`: False
- `skip_memory_metrics`: True
- `use_legacy_prediction_loop`: False
- `push_to_hub`: False
- `resume_from_checkpoint`: None
- `hub_model_id`: None
- `hub_strategy`: every_save
- `hub_private_repo`: None
- `hub_always_push`: False
- `hub_revision`: None
- `gradient_checkpointing`: False
- `gradient_checkpointing_kwargs`: None
- `include_inputs_for_metrics`: False
- `include_for_metrics`: []
- `eval_do_concat_batches`: True
- `fp16_backend`: auto
- `push_to_hub_model_id`: None
- `push_to_hub_organization`: None
- `mp_parameters`: 
- `auto_find_batch_size`: False
- `full_determinism`: False
- `torchdynamo`: None
- `ray_scope`: last
- `ddp_timeout`: 1800
- `torch_compile`: False
- `torch_compile_backend`: None
- `torch_compile_mode`: None
- `include_tokens_per_second`: False
- `include_num_input_tokens_seen`: no
- `neftune_noise_alpha`: None
- `optim_target_modules`: None
- `batch_eval_metrics`: False
- `eval_on_start`: False
- `use_liger_kernel`: False
- `liger_kernel_config`: None
- `eval_use_gather_object`: False
- `average_tokens_across_devices`: True
- `prompts`: None
- `batch_sampler`: batch_sampler
- `multi_dataset_batch_sampler`: proportional
- `router_mapping`: {}
- `learning_rate_mapping`: {}

</details>

### Framework Versions
- Python: 3.11.14
- Sentence Transformers: 5.1.1
- Transformers: 4.57.0
- PyTorch: 2.8.0+cpu
- Accelerate: 1.10.1
- Datasets: 4.4.1
- Tokenizers: 0.22.1

## Citation

### BibTeX

#### Sentence Transformers
```bibtex
@inproceedings{reimers-2019-sentence-bert,
    title = "Sentence-BERT: Sentence Embeddings using Siamese BERT-Networks",
    author = "Reimers, Nils and Gurevych, Iryna",
    booktitle = "Proceedings of the 2019 Conference on Empirical Methods in Natural Language Processing",
    month = "11",
    year = "2019",
    publisher = "Association for Computational Linguistics",
    url = "https://arxiv.org/abs/1908.10084",
}
```

<!--
## Glossary

*Clearly define terms in order to be accessible across audiences.*
-->

<!--
## Model Card Authors

*Lists the people who create the model card, providing recognition and accountability for the detailed work that goes into its construction.*
-->

<!--
## Model Card Contact

*Provides a way for people who have updates to the Model Card, suggestions, or questions, to contact the Model Card authors.*
-->