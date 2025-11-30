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
    ['Where is QDRANT_URL configured?', '    restart: unless-stopped\n    environment:\n      - GF_SECURITY_ALLOW_EMBEDDING=true\n      - GF_AUTH_ANONYMOUS_ENABLED=true\n      - GF_AUTH_ANONYMOUS_ORG_ROLE=Editor\n      - GF_USERS_DEFAULT_THEME=dark\n      - GF_SECURITY_ADMIN_USER=admin\n      - GF_SECURITY_ADMIN_PASSWORD=Trenton2023\n      - GF_SECURITY_COOKIE_SAMESITE=disabled\n      - GF_INSTALL_PLUGINS=yesoreyeram-infinity-datasource\n    volumes:\n      - grafana_data:/var/lib/grafana\n      - ./infra/grafana/provisioning:/etc/grafana/provisio'],
    ['Where is load_chunks function?', "     */\n    function openInNewWindow() {\n        console.log('[VSCode] Delegating openInNewWindow to Editor module');\n        if (window.Editor && typeof window.Editor.openEditorWindow === 'function') {\n            window.Editor.openEditorWindow();\n        }\n    }\n\n    /**\n     * Copy editor URL to clipboard\n     */\n    function copyUrl() {\n        console.log('[VSCode] Delegating copyUrl to Editor module');\n        if (window.Editor && typeof window.Editor.copyEditorUrl === 'function') {\n      "],
    ['Where is chunk_code function defined?', 'chunk_code(src:str, fpath:str, lang:str, target:int=900)->List[Dict]:\n    try:\n        if _ts_get_parser is None:\n            raise RuntimeError("tree_sitter_languages not available")\n        parser = _ts_get_parser(lang)\n        tree = parser.parse(bytes(src, "utf-8"))\n        wanted = FUNC_NODES.get(lang, set())\n        nodes = []\n        stack = [tree.root_node]\n        while stack:\n            n = stack.pop()\n            if n.type in wanted:\n                nodes.append(n)\n            stack.'],
    ['Where is the Stemmer imported?', 'from __future__ import annotations\nimport os\nimport json\nimport urllib.request\nimport urllib.error\nimport urllib.parse\nfrom typing import Dict, Any\n\nfrom fastmcp import FastMCP\n\n# Canonical imports\nfrom server.langgraph_app import build_graph\nfrom retrieval.hybrid_search import search_routed_multi\nfrom common.config_loader import list_repos\n\n\nmcp = FastMCP("rag-service")\n_graph = None\n\n_get_graph():\n    global _graph\n    if _graph is None:\n        _graph = build_graph()\n    return _graph\n\n\n@mcp.'],
    ['How are code files split into smaller pieces for indexing?', 'hydrate_docs(docs: List[Dict], chunks: Dict[str, Dict]) -> None:\n    """Add code content to docs that don\'t have it."""\n    for d in docs:\n        if not d.get(\'code\'):\n            chunk_id = d.get(\'id\')\n            if chunk_id and chunk_id in chunks:\n                d[\'code\'] = chunks[chunk_id].get(\'code\', \'\')\n\ndedupe_by_file(docs: List[Dict]) -> List[Dict]:\n    """Keep only the highest-scoring chunk per file path.\n\n    This prevents multiple chunks from the same file dominating results,\n    im'],
]
scores = model.predict(pairs)
print(scores.shape)
# (5,)

# Or rank different texts based on similarity to a single text
ranks = model.rank(
    'Where is QDRANT_URL configured?',
    [
        '    restart: unless-stopped\n    environment:\n      - GF_SECURITY_ALLOW_EMBEDDING=true\n      - GF_AUTH_ANONYMOUS_ENABLED=true\n      - GF_AUTH_ANONYMOUS_ORG_ROLE=Editor\n      - GF_USERS_DEFAULT_THEME=dark\n      - GF_SECURITY_ADMIN_USER=admin\n      - GF_SECURITY_ADMIN_PASSWORD=Trenton2023\n      - GF_SECURITY_COOKIE_SAMESITE=disabled\n      - GF_INSTALL_PLUGINS=yesoreyeram-infinity-datasource\n    volumes:\n      - grafana_data:/var/lib/grafana\n      - ./infra/grafana/provisioning:/etc/grafana/provisio',
        "     */\n    function openInNewWindow() {\n        console.log('[VSCode] Delegating openInNewWindow to Editor module');\n        if (window.Editor && typeof window.Editor.openEditorWindow === 'function') {\n            window.Editor.openEditorWindow();\n        }\n    }\n\n    /**\n     * Copy editor URL to clipboard\n     */\n    function copyUrl() {\n        console.log('[VSCode] Delegating copyUrl to Editor module');\n        if (window.Editor && typeof window.Editor.copyEditorUrl === 'function') {\n      ",
        'chunk_code(src:str, fpath:str, lang:str, target:int=900)->List[Dict]:\n    try:\n        if _ts_get_parser is None:\n            raise RuntimeError("tree_sitter_languages not available")\n        parser = _ts_get_parser(lang)\n        tree = parser.parse(bytes(src, "utf-8"))\n        wanted = FUNC_NODES.get(lang, set())\n        nodes = []\n        stack = [tree.root_node]\n        while stack:\n            n = stack.pop()\n            if n.type in wanted:\n                nodes.append(n)\n            stack.',
        'from __future__ import annotations\nimport os\nimport json\nimport urllib.request\nimport urllib.error\nimport urllib.parse\nfrom typing import Dict, Any\n\nfrom fastmcp import FastMCP\n\n# Canonical imports\nfrom server.langgraph_app import build_graph\nfrom retrieval.hybrid_search import search_routed_multi\nfrom common.config_loader import list_repos\n\n\nmcp = FastMCP("rag-service")\n_graph = None\n\n_get_graph():\n    global _graph\n    if _graph is None:\n        _graph = build_graph()\n    return _graph\n\n\n@mcp.',
        'hydrate_docs(docs: List[Dict], chunks: Dict[str, Dict]) -> None:\n    """Add code content to docs that don\'t have it."""\n    for d in docs:\n        if not d.get(\'code\'):\n            chunk_id = d.get(\'id\')\n            if chunk_id and chunk_id in chunks:\n                d[\'code\'] = chunks[chunk_id].get(\'code\', \'\')\n\ndedupe_by_file(docs: List[Dict]) -> List[Dict]:\n    """Keep only the highest-scoring chunk per file path.\n\n    This prevents multiple chunks from the same file dominating results,\n    im',
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
  |         | sentence_0                                                                                     | sentence_1                                                                                        | label                                                         |
  |:--------|:-----------------------------------------------------------------------------------------------|:--------------------------------------------------------------------------------------------------|:--------------------------------------------------------------|
  | type    | string                                                                                         | string                                                                                            | float                                                         |
  | details | <ul><li>min: 27 characters</li><li>mean: 37.95 characters</li><li>max: 59 characters</li></ul> | <ul><li>min: 213 characters</li><li>mean: 480.53 characters</li><li>max: 500 characters</li></ul> | <ul><li>min: 0.0</li><li>mean: 0.2</li><li>max: 1.0</li></ul> |
* Samples:
  | sentence_0                                         | sentence_1                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                  | label            |
  |:---------------------------------------------------|:----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|:-----------------|
  | <code>Where is QDRANT_URL configured?</code>       | <code>    restart: unless-stopped<br>    environment:<br>      - GF_SECURITY_ALLOW_EMBEDDING=true<br>      - GF_AUTH_ANONYMOUS_ENABLED=true<br>      - GF_AUTH_ANONYMOUS_ORG_ROLE=Editor<br>      - GF_USERS_DEFAULT_THEME=dark<br>      - GF_SECURITY_ADMIN_USER=admin<br>      - GF_SECURITY_ADMIN_PASSWORD=Trenton2023<br>      - GF_SECURITY_COOKIE_SAMESITE=disabled<br>      - GF_INSTALL_PLUGINS=yesoreyeram-infinity-datasource<br>    volumes:<br>      - grafana_data:/var/lib/grafana<br>      - ./infra/grafana/provisioning:/etc/grafana/provisio</code>       | <code>0.0</code> |
  | <code>Where is load_chunks function?</code>        | <code>     */<br>    function openInNewWindow() {<br>        console.log('[VSCode] Delegating openInNewWindow to Editor module');<br>        if (window.Editor && typeof window.Editor.openEditorWindow === 'function') {<br>            window.Editor.openEditorWindow();<br>        }<br>    }<br><br>    /**<br>     * Copy editor URL to clipboard<br>     */<br>    function copyUrl() {<br>        console.log('[VSCode] Delegating copyUrl to Editor module');<br>        if (window.Editor && typeof window.Editor.copyEditorUrl === 'function') {<br>      </code> | <code>0.0</code> |
  | <code>Where is chunk_code function defined?</code> | <code>chunk_code(src:str, fpath:str, lang:str, target:int=900)->List[Dict]:<br>    try:<br>        if _ts_get_parser is None:<br>            raise RuntimeError("tree_sitter_languages not available")<br>        parser = _ts_get_parser(lang)<br>        tree = parser.parse(bytes(src, "utf-8"))<br>        wanted = FUNC_NODES.get(lang, set())<br>        nodes = []<br>        stack = [tree.root_node]<br>        while stack:<br>            n = stack.pop()<br>            if n.type in wanted:<br>                nodes.append(n)<br>            stack.</code>    | <code>1.0</code> |
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
- Python: 3.11.7
- Sentence Transformers: 5.1.1
- Transformers: 4.57.0
- PyTorch: 2.8.0
- Accelerate: 1.10.1
- Datasets: 4.2.0
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