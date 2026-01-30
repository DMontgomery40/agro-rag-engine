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
    ['How are code files split into smaller pieces for indexing?', 'main():\n    print(f"=== Clean Indexer v2 ===")\n    print(f"Repo: {REPO}")\n    print(f"Embedding: {EMBEDDING_TYPE}")\n    \n    # Get repo paths\n    try:\n        bases = get_repo_paths(REPO)\n    except:\n        bases = [str(Path(__file__).parent.parent)]\n    \n    outdir = out_dir(REPO)\n    os.makedirs(outdir, exist_ok=True)\n    os.makedirs(os.path.join(outdir, \'bm25_index\'), exist_ok=True)\n    \n    # Load repo-specific excludes\n    repo_excludes = exclude_paths(REPO)\n    print(f"Excludes: {repo_exc'],
    ['How are code files split into smaller pieces for indexing?', 'main():\n    print(f"=== Clean Indexer v2 ===")\n    print(f"Repo: {REPO}")\n    print(f"Embedding: {EMBEDDING_TYPE}")\n    \n    # Get repo paths\n    try:\n        bases = get_repo_paths(REPO)\n    except:\n        bases = [str(Path(__file__).parent.parent)]\n    \n    outdir = out_dir(REPO)\n    os.makedirs(outdir, exist_ok=True)\n    os.makedirs(os.path.join(outdir, \'bm25_index\'), exist_ok=True)\n    \n    # Load repo-specific excludes\n    repo_excludes = exclude_paths(REPO)\n    print(f"Excludes: {repo_exc'],
    ['Where is rrf_fusion called?', 'search(\n    query: str,\n    repo: str = None,\n    topk_bm25: int = 50,\n    topk_vector: int = 50,\n    final_k: int = 10,\n) -> List[Dict]:\n    """\n    Main search function.\n    \n    Args:\n        query: Search query\n        repo: Repository name (defaults to config)\n        topk_bm25: Number of BM25 results\n        topk_vector: Number of vector results\n        final_k: Final number of results to return\n    \n    Returns:\n        List of result dicts with file_path, start_line, end_line, code, scor'],
    ['Where is preprocess_query defined?', 'CardsBuildJob:\n    repo: str\n    enrich: bool = True\n    exclude_dirs: List[str] = field(default_factory=list)\n    exclude_patterns: List[str] = field(default_factory=list)\n    exclude_keywords: List[str] = field(default_factory=list)\n    job_id: str = field(default_factory=lambda: str(uuid.uuid4()))\n    started_at: float = field(default_factory=time.time)\n    stage: str = "scan"\n    total: int = 0\n    done: int = 0\n    last_emit_at: float = field(default_factory=time.time)\n    last_done: int = '],
    ['Where is the BM25 retriever loaded?', 'bm25_search(query: str, repo: str, k: int = 50) -> List[tuple]:\n    """BM25 sparse search. Returns [(chunk_id, score), ...]"""\n    idx_dir = os.path.join(out_dir(repo), \'bm25_index\')\n    \n    # Load BM25 index\n    try:\n        retriever = bm25s.BM25.load(idx_dir)\n    except Exception as e:\n        print(f"[bm25] Failed to load index: {e}")\n        return []\n    \n    # Load tokenizer with vocab\n    stemmer = Stemmer(\'english\')\n    tokenizer = Tokenizer(stemmer=stemmer, stopwords=\'en\')\n    try:\n  '],
]
scores = model.predict(pairs)
print(scores.shape)
# (5,)

# Or rank different texts based on similarity to a single text
ranks = model.rank(
    'How are code files split into smaller pieces for indexing?',
    [
        'main():\n    print(f"=== Clean Indexer v2 ===")\n    print(f"Repo: {REPO}")\n    print(f"Embedding: {EMBEDDING_TYPE}")\n    \n    # Get repo paths\n    try:\n        bases = get_repo_paths(REPO)\n    except:\n        bases = [str(Path(__file__).parent.parent)]\n    \n    outdir = out_dir(REPO)\n    os.makedirs(outdir, exist_ok=True)\n    os.makedirs(os.path.join(outdir, \'bm25_index\'), exist_ok=True)\n    \n    # Load repo-specific excludes\n    repo_excludes = exclude_paths(REPO)\n    print(f"Excludes: {repo_exc',
        'main():\n    print(f"=== Clean Indexer v2 ===")\n    print(f"Repo: {REPO}")\n    print(f"Embedding: {EMBEDDING_TYPE}")\n    \n    # Get repo paths\n    try:\n        bases = get_repo_paths(REPO)\n    except:\n        bases = [str(Path(__file__).parent.parent)]\n    \n    outdir = out_dir(REPO)\n    os.makedirs(outdir, exist_ok=True)\n    os.makedirs(os.path.join(outdir, \'bm25_index\'), exist_ok=True)\n    \n    # Load repo-specific excludes\n    repo_excludes = exclude_paths(REPO)\n    print(f"Excludes: {repo_exc',
        'search(\n    query: str,\n    repo: str = None,\n    topk_bm25: int = 50,\n    topk_vector: int = 50,\n    final_k: int = 10,\n) -> List[Dict]:\n    """\n    Main search function.\n    \n    Args:\n        query: Search query\n        repo: Repository name (defaults to config)\n        topk_bm25: Number of BM25 results\n        topk_vector: Number of vector results\n        final_k: Final number of results to return\n    \n    Returns:\n        List of result dicts with file_path, start_line, end_line, code, scor',
        'CardsBuildJob:\n    repo: str\n    enrich: bool = True\n    exclude_dirs: List[str] = field(default_factory=list)\n    exclude_patterns: List[str] = field(default_factory=list)\n    exclude_keywords: List[str] = field(default_factory=list)\n    job_id: str = field(default_factory=lambda: str(uuid.uuid4()))\n    started_at: float = field(default_factory=time.time)\n    stage: str = "scan"\n    total: int = 0\n    done: int = 0\n    last_emit_at: float = field(default_factory=time.time)\n    last_done: int = ',
        'bm25_search(query: str, repo: str, k: int = 50) -> List[tuple]:\n    """BM25 sparse search. Returns [(chunk_id, score), ...]"""\n    idx_dir = os.path.join(out_dir(repo), \'bm25_index\')\n    \n    # Load BM25 index\n    try:\n        retriever = bm25s.BM25.load(idx_dir)\n    except Exception as e:\n        print(f"[bm25] Failed to load index: {e}")\n        return []\n    \n    # Load tokenizer with vocab\n    stemmer = Stemmer(\'english\')\n    tokenizer = Tokenizer(stemmer=stemmer, stopwords=\'en\')\n    try:\n  ',
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
  | details | <ul><li>min: 27 characters</li><li>mean: 38.7 characters</li><li>max: 59 characters</li></ul> | <ul><li>min: 180 characters</li><li>mean: 482.63 characters</li><li>max: 500 characters</li></ul> | <ul><li>min: 0.0</li><li>mean: 0.2</li><li>max: 1.0</li></ul> |
* Samples:
  | sentence_0                                                              | sentence_1                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                              | label            |
  |:------------------------------------------------------------------------|:----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|:-----------------|
  | <code>How are code files split into smaller pieces for indexing?</code> | <code>main():<br>    print(f"=== Clean Indexer v2 ===")<br>    print(f"Repo: {REPO}")<br>    print(f"Embedding: {EMBEDDING_TYPE}")<br>    <br>    # Get repo paths<br>    try:<br>        bases = get_repo_paths(REPO)<br>    except:<br>        bases = [str(Path(__file__).parent.parent)]<br>    <br>    outdir = out_dir(REPO)<br>    os.makedirs(outdir, exist_ok=True)<br>    os.makedirs(os.path.join(outdir, 'bm25_index'), exist_ok=True)<br>    <br>    # Load repo-specific excludes<br>    repo_excludes = exclude_paths(REPO)<br>    print(f"Excludes: {repo_exc</code>    | <code>1.0</code> |
  | <code>How are code files split into smaller pieces for indexing?</code> | <code>main():<br>    print(f"=== Clean Indexer v2 ===")<br>    print(f"Repo: {REPO}")<br>    print(f"Embedding: {EMBEDDING_TYPE}")<br>    <br>    # Get repo paths<br>    try:<br>        bases = get_repo_paths(REPO)<br>    except:<br>        bases = [str(Path(__file__).parent.parent)]<br>    <br>    outdir = out_dir(REPO)<br>    os.makedirs(outdir, exist_ok=True)<br>    os.makedirs(os.path.join(outdir, 'bm25_index'), exist_ok=True)<br>    <br>    # Load repo-specific excludes<br>    repo_excludes = exclude_paths(REPO)<br>    print(f"Excludes: {repo_exc</code>    | <code>0.0</code> |
  | <code>Where is rrf_fusion called?</code>                                | <code>search(<br>    query: str,<br>    repo: str = None,<br>    topk_bm25: int = 50,<br>    topk_vector: int = 50,<br>    final_k: int = 10,<br>) -> List[Dict]:<br>    """<br>    Main search function.<br>    <br>    Args:<br>        query: Search query<br>        repo: Repository name (defaults to config)<br>        topk_bm25: Number of BM25 results<br>        topk_vector: Number of vector results<br>        final_k: Final number of results to return<br>    <br>    Returns:<br>        List of result dicts with file_path, start_line, end_line, code, scor</code> | <code>0.0</code> |
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