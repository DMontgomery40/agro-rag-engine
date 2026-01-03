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
    ['Where is out_dir imported from?', "import os\nimport json\nimport time\nimport uuid\nfrom pathlib import Path\nfrom typing import Any, Dict, List, Optional\nfrom contextvars import ContextVar\n\nfrom common.config_loader import out_dir\nfrom server.services.config_registry import get_config_registry\n\n# Module-level config caching\n_config_registry = get_config_registry()\n_TRACING_ENABLED = _config_registry.get_int('TRACING_ENABLED', 1)\n_TRACE_SAMPLING_RATE = _config_registry.get_float('TRACE_SAMPLING_RATE', 1.0)\n_LOG_LEVEL = _config_regist"],
    ['How does the search combine sparse and dense retrieval?', '"""Clean Hybrid Search - v2 Rewrite\n\nSimple, working search that:\n1. BM25 sparse search\n2. Qdrant vector search  \n3. RRF fusion\n4. Cross-encoder reranking\n5. Returns results\n\nNo bells and whistles - just working search.\n"""\n\nimport os\nimport json\nfrom pathlib import Path\nfrom typing import List, Dict, Optional\nfrom collections import defaultdict\n\n# BM25\nimport bm25s\nfrom bm25s.tokenization import Tokenizer\nfrom Stemmer import Stemmer\n\n# Qdrant\nfrom qdrant_client import QdrantClient, models\n\n# Lo'],
    ['How does the search combine sparse and dense retrieval?', 'bm25_search(query: str, repo: str, k: int = 50) -> List[tuple]:\n    """BM25 sparse search. Returns [(chunk_id, score), ...]"""\n    idx_dir = os.path.join(out_dir(repo), \'bm25_index\')\n    \n    # Load BM25 index\n    try:\n        retriever = bm25s.BM25.load(idx_dir)\n    except Exception as e:\n        print(f"[bm25] Failed to load index: {e}")\n        return []\n    \n    # Load tokenizer with vocab\n    stemmer = Stemmer(\'english\')\n    tokenizer = Tokenizer(stemmer=stemmer, stopwords=\'en\')\n    try:\n  '],
    ["What's the architecture of the RAG pipeline?", "_maybe_init_hf_pipeline(model_name: str) -> Optional[Any]:\n    global _HF_PIPE\n    if _HF_PIPE is not None:\n        return _HF_PIPE\n    try:\n        if 'jinaai/jina-reranker' in model_name.lower():\n            os.environ.setdefault('TRANSFORMERS_TRUST_REMOTE_CODE', '1')\n            from transformers import pipeline\n            _HF_PIPE = pipeline(\n                task='text-classification',\n                model=model_name,\n                tokenizer=model_name,\n                trust_remote_code="],
    ['Where is SentenceTransformer used?', '_normalize_models(data: Dict[str, Any]) -> Dict[str, Any]:\n    try:\n        cfg = modelsConfig.model_validate(data)\n    except ValidationError as exc:\n        logger.warning("models.json validation failed, using defaults: %s", exc)\n        cfg = modelsConfig.model_validate(_default_models())\n    except Exception as exc:\n        logger.warning("models.json load error, using defaults: %s", exc)\n        cfg = modelsConfig.model_validate(_default_models())\n\n    out: list[Dict[str, Any]] = []\n    for'],
]
scores = model.predict(pairs)
print(scores.shape)
# (5,)

# Or rank different texts based on similarity to a single text
ranks = model.rank(
    'Where is out_dir imported from?',
    [
        "import os\nimport json\nimport time\nimport uuid\nfrom pathlib import Path\nfrom typing import Any, Dict, List, Optional\nfrom contextvars import ContextVar\n\nfrom common.config_loader import out_dir\nfrom server.services.config_registry import get_config_registry\n\n# Module-level config caching\n_config_registry = get_config_registry()\n_TRACING_ENABLED = _config_registry.get_int('TRACING_ENABLED', 1)\n_TRACE_SAMPLING_RATE = _config_registry.get_float('TRACE_SAMPLING_RATE', 1.0)\n_LOG_LEVEL = _config_regist",
        '"""Clean Hybrid Search - v2 Rewrite\n\nSimple, working search that:\n1. BM25 sparse search\n2. Qdrant vector search  \n3. RRF fusion\n4. Cross-encoder reranking\n5. Returns results\n\nNo bells and whistles - just working search.\n"""\n\nimport os\nimport json\nfrom pathlib import Path\nfrom typing import List, Dict, Optional\nfrom collections import defaultdict\n\n# BM25\nimport bm25s\nfrom bm25s.tokenization import Tokenizer\nfrom Stemmer import Stemmer\n\n# Qdrant\nfrom qdrant_client import QdrantClient, models\n\n# Lo',
        'bm25_search(query: str, repo: str, k: int = 50) -> List[tuple]:\n    """BM25 sparse search. Returns [(chunk_id, score), ...]"""\n    idx_dir = os.path.join(out_dir(repo), \'bm25_index\')\n    \n    # Load BM25 index\n    try:\n        retriever = bm25s.BM25.load(idx_dir)\n    except Exception as e:\n        print(f"[bm25] Failed to load index: {e}")\n        return []\n    \n    # Load tokenizer with vocab\n    stemmer = Stemmer(\'english\')\n    tokenizer = Tokenizer(stemmer=stemmer, stopwords=\'en\')\n    try:\n  ',
        "_maybe_init_hf_pipeline(model_name: str) -> Optional[Any]:\n    global _HF_PIPE\n    if _HF_PIPE is not None:\n        return _HF_PIPE\n    try:\n        if 'jinaai/jina-reranker' in model_name.lower():\n            os.environ.setdefault('TRANSFORMERS_TRUST_REMOTE_CODE', '1')\n            from transformers import pipeline\n            _HF_PIPE = pipeline(\n                task='text-classification',\n                model=model_name,\n                tokenizer=model_name,\n                trust_remote_code=",
        '_normalize_models(data: Dict[str, Any]) -> Dict[str, Any]:\n    try:\n        cfg = modelsConfig.model_validate(data)\n    except ValidationError as exc:\n        logger.warning("models.json validation failed, using defaults: %s", exc)\n        cfg = modelsConfig.model_validate(_default_models())\n    except Exception as exc:\n        logger.warning("models.json load error, using defaults: %s", exc)\n        cfg = modelsConfig.model_validate(_default_models())\n\n    out: list[Dict[str, Any]] = []\n    for',
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
  |         | sentence_0                                                                                    | sentence_1                                                                                       | label                                                         |
  |:--------|:----------------------------------------------------------------------------------------------|:-------------------------------------------------------------------------------------------------|:--------------------------------------------------------------|
  | type    | string                                                                                        | string                                                                                           | float                                                         |
  | details | <ul><li>min: 27 characters</li><li>mean: 38.3 characters</li><li>max: 59 characters</li></ul> | <ul><li>min: 180 characters</li><li>mean: 476.6 characters</li><li>max: 500 characters</li></ul> | <ul><li>min: 0.0</li><li>mean: 0.2</li><li>max: 1.0</li></ul> |
* Samples:
  | sentence_0                                                           | sentence_1                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                      | label            |
  |:---------------------------------------------------------------------|:----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|:-----------------|
  | <code>Where is out_dir imported from?</code>                         | <code>import os<br>import json<br>import time<br>import uuid<br>from pathlib import Path<br>from typing import Any, Dict, List, Optional<br>from contextvars import ContextVar<br><br>from common.config_loader import out_dir<br>from server.services.config_registry import get_config_registry<br><br># Module-level config caching<br>_config_registry = get_config_registry()<br>_TRACING_ENABLED = _config_registry.get_int('TRACING_ENABLED', 1)<br>_TRACE_SAMPLING_RATE = _config_registry.get_float('TRACE_SAMPLING_RATE', 1.0)<br>_LOG_LEVEL = _config_regist</code>                                  | <code>0.0</code> |
  | <code>How does the search combine sparse and dense retrieval?</code> | <code>"""Clean Hybrid Search - v2 Rewrite<br><br>Simple, working search that:<br>1. BM25 sparse search<br>2. Qdrant vector search  <br>3. RRF fusion<br>4. Cross-encoder reranking<br>5. Returns results<br><br>No bells and whistles - just working search.<br>"""<br><br>import os<br>import json<br>from pathlib import Path<br>from typing import List, Dict, Optional<br>from collections import defaultdict<br><br># BM25<br>import bm25s<br>from bm25s.tokenization import Tokenizer<br>from Stemmer import Stemmer<br><br># Qdrant<br>from qdrant_client import QdrantClient, models<br><br># Lo</code> | <code>0.0</code> |
  | <code>How does the search combine sparse and dense retrieval?</code> | <code>bm25_search(query: str, repo: str, k: int = 50) -> List[tuple]:<br>    """BM25 sparse search. Returns [(chunk_id, score), ...]"""<br>    idx_dir = os.path.join(out_dir(repo), 'bm25_index')<br>    <br>    # Load BM25 index<br>    try:<br>        retriever = bm25s.BM25.load(idx_dir)<br>    except Exception as e:<br>        print(f"[bm25] Failed to load index: {e}")<br>        return []<br>    <br>    # Load tokenizer with vocab<br>    stemmer = Stemmer('english')<br>    tokenizer = Tokenizer(stemmer=stemmer, stopwords='en')<br>    try:<br>  </code>                                  | <code>1.0</code> |
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
- `use_ipex`: False
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
- `deepspeed`: None
- `label_smoothing_factor`: 0.0
- `optim`: adamw_torch
- `optim_args`: None
- `adafactor`: False
- `group_by_length`: False
- `length_column_name`: length
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
- `hub_private_repo`: False
- `hub_always_push`: False
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
- `dispatch_batches`: None
- `split_batches`: None
- `include_tokens_per_second`: False
- `include_num_input_tokens_seen`: False
- `neftune_noise_alpha`: None
- `optim_target_modules`: None
- `batch_eval_metrics`: False
- `eval_on_start`: False
- `use_liger_kernel`: False
- `eval_use_gather_object`: False
- `average_tokens_across_devices`: False
- `prompts`: None
- `batch_sampler`: batch_sampler
- `multi_dataset_batch_sampler`: proportional
- `router_mapping`: {}
- `learning_rate_mapping`: {}

</details>

### Framework Versions
- Python: 3.11.7
- Sentence Transformers: 5.1.1
- Transformers: 4.46.3
- PyTorch: 2.9.1
- Accelerate: 1.10.1
- Datasets: 4.2.0
- Tokenizers: 0.20.3

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