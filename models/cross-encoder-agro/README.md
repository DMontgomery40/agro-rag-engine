---
tags:
- sentence-transformers
- cross-encoder
- reranker
- generated_from_trainer
- dataset_size:37
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
    ['Where are RAG subtabs defined?', "            console.log('[VSCode] URL copied to clipboard (fallback)');\n            showNotification('VS Code URL copied to clipboard');\n        } catch (e) {\n            console.error('[VSCode] Fallback copy failed:', e);\n            showNotification(`VS Code URL: ${url}`);\n        } finally {\n            document.body.removeChild(textarea);\n        }\n    }\n\n    /**\n     * Restart VS Code server\n     */\n    async function restart() {\n        console.log('[VSCode] Restarting editor...');\n       "],
    ['Where are RAG subtabs defined?', "      ]),\n      REDIS_URL: L('Redis URL', 'Connection string for Redis, used for LangGraph checkpoints and optional session memory. The graph runs even if Redis is down (stateless mode).', [\n        ['Redis Docs', 'https://redis.io/docs/latest/']\n      ]),\n      REPO: L('Active Repository', 'Logical repository name for routing and indexing. MCP and CLI use this to scope retrieval.', [\n        ['Docs: MCP Quickstart', '/docs/QUICKSTART_MCP.md']\n      ]),\n      COLLECTION_NAME: L('Collection Name'"],
    ['hi there', 'main():\n    """Entry point."""\n    # Check dependencies\n    try:\n        from rich.console import Console\n        from rich.markdown import Markdown\n        from rich.panel import Panel\n        from rich.prompt import Prompt\n    except ImportError:\n        print("Error: Missing \'rich\' library. Install with: pip install rich")\n        sys.exit(1)\n\n    # Get config from environment\n    repo = os.getenv(\'REPO\', \'agro\')\n    thread_id = os.getenv(\'THREAD_ID\', \'cli-chat\')\n\n    # Create and run chat\n  '],
    ['how do i use the cli tool for agro?', "      OUT_DIR_BASE: L('Out Dir Base', 'Where retrieval looks for indices (chunks.jsonl, bm25_index/). Use ./out.noindex-shared for one index across branches so MCP and local tools stay in sync. Symptom of mismatch: rag_search returns 0 results.', [\n        ['Docs: Shared Index', '/files/README.md']\n      ], [['Requires restart (MCP)','info']]),\n      RAG_OUT_BASE: L('RAG Out Base', 'Optional override for Out Dir Base; used by internal loaders if provided.'),\n      MCP_HTTP_HOST: L('MCP HTTP Host"],
    ['feedback is IN CHAT interface now : \n\n"""\n### Conclusion\n\nBy porting the feedback mechanism from the /answer endpoint to the chat interface, you can enhance user interaction and ensure that feedback contributes to model improvements. This integration will require modifications to the chat message handling and feedback capturing logic, but it will lead to a more cohesive system.\n\n### References\n- **Chat Interface**: /Users/davidmontgomery/agro-rag-engine/gui/js/chat.js:1-128\n- **Feedback Mechanism**: /Users/davidmontgomery/agro-rag-engine/server/feedback.py:1-13`\n                \n👍 Helpful\n👎 Not Helpful\nor rate:\n⭐\n⭐⭐\n⭐⭐⭐\n⭐⭐⭐⭐\n⭐⭐⭐⭐⭐\nWhat was missing? (optional)\n✓ Feedback recorded: 2 stars\n💡 This helps train search quality (only the reranker, not the chat model)\n\n"""\n\nwhat i\'m talking about is this statement: \n💡 This helps train search quality (only the reranker, not the chat model)\n\n\nwhy can\'t the /chat endpoint be as smart as teh /answer endpoint??', "      OUT_DIR_BASE: L('Out Dir Base', 'Where retrieval looks for indices (chunks.jsonl, bm25_index/). Use ./out.noindex-shared for one index across branches so MCP and local tools stay in sync. Symptom of mismatch: rag_search returns 0 results.', [\n        ['Docs: Shared Index', '/files/README.md']\n      ], [['Requires restart (MCP)','info']]),\n      RAG_OUT_BASE: L('RAG Out Base', 'Optional override for Out Dir Base; used by internal loaders if provided.'),\n      MCP_HTTP_HOST: L('MCP HTTP Host"],
]
scores = model.predict(pairs)
print(scores.shape)
# (5,)

# Or rank different texts based on similarity to a single text
ranks = model.rank(
    'Where are RAG subtabs defined?',
    [
        "            console.log('[VSCode] URL copied to clipboard (fallback)');\n            showNotification('VS Code URL copied to clipboard');\n        } catch (e) {\n            console.error('[VSCode] Fallback copy failed:', e);\n            showNotification(`VS Code URL: ${url}`);\n        } finally {\n            document.body.removeChild(textarea);\n        }\n    }\n\n    /**\n     * Restart VS Code server\n     */\n    async function restart() {\n        console.log('[VSCode] Restarting editor...');\n       ",
        "      ]),\n      REDIS_URL: L('Redis URL', 'Connection string for Redis, used for LangGraph checkpoints and optional session memory. The graph runs even if Redis is down (stateless mode).', [\n        ['Redis Docs', 'https://redis.io/docs/latest/']\n      ]),\n      REPO: L('Active Repository', 'Logical repository name for routing and indexing. MCP and CLI use this to scope retrieval.', [\n        ['Docs: MCP Quickstart', '/docs/QUICKSTART_MCP.md']\n      ]),\n      COLLECTION_NAME: L('Collection Name'",
        'main():\n    """Entry point."""\n    # Check dependencies\n    try:\n        from rich.console import Console\n        from rich.markdown import Markdown\n        from rich.panel import Panel\n        from rich.prompt import Prompt\n    except ImportError:\n        print("Error: Missing \'rich\' library. Install with: pip install rich")\n        sys.exit(1)\n\n    # Get config from environment\n    repo = os.getenv(\'REPO\', \'agro\')\n    thread_id = os.getenv(\'THREAD_ID\', \'cli-chat\')\n\n    # Create and run chat\n  ',
        "      OUT_DIR_BASE: L('Out Dir Base', 'Where retrieval looks for indices (chunks.jsonl, bm25_index/). Use ./out.noindex-shared for one index across branches so MCP and local tools stay in sync. Symptom of mismatch: rag_search returns 0 results.', [\n        ['Docs: Shared Index', '/files/README.md']\n      ], [['Requires restart (MCP)','info']]),\n      RAG_OUT_BASE: L('RAG Out Base', 'Optional override for Out Dir Base; used by internal loaders if provided.'),\n      MCP_HTTP_HOST: L('MCP HTTP Host",
        "      OUT_DIR_BASE: L('Out Dir Base', 'Where retrieval looks for indices (chunks.jsonl, bm25_index/). Use ./out.noindex-shared for one index across branches so MCP and local tools stay in sync. Symptom of mismatch: rag_search returns 0 results.', [\n        ['Docs: Shared Index', '/files/README.md']\n      ], [['Requires restart (MCP)','info']]),\n      RAG_OUT_BASE: L('RAG Out Base', 'Optional override for Out Dir Base; used by internal loaders if provided.'),\n      MCP_HTTP_HOST: L('MCP HTTP Host",
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

* Size: 37 training samples
* Columns: <code>sentence_0</code>, <code>sentence_1</code>, and <code>label</code>
* Approximate statistics based on the first 37 samples:
  |         | sentence_0                                                                                      | sentence_1                                                                                      | label                                                          |
  |:--------|:------------------------------------------------------------------------------------------------|:------------------------------------------------------------------------------------------------|:---------------------------------------------------------------|
  | type    | string                                                                                          | string                                                                                          | float                                                          |
  | details | <ul><li>min: 3 characters</li><li>mean: 163.14 characters</li><li>max: 962 characters</li></ul> | <ul><li>min: 3 characters</li><li>mean: 436.76 characters</li><li>max: 500 characters</li></ul> | <ul><li>min: 0.0</li><li>mean: 0.22</li><li>max: 1.0</li></ul> |
* Samples:
  | sentence_0                                  | sentence_1                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                           | label            |
  |:--------------------------------------------|:-------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|:-----------------|
  | <code>Where are RAG subtabs defined?</code> | <code>            console.log('[VSCode] URL copied to clipboard (fallback)');<br>            showNotification('VS Code URL copied to clipboard');<br>        } catch (e) {<br>            console.error('[VSCode] Fallback copy failed:', e);<br>            showNotification(`VS Code URL: ${url}`);<br>        } finally {<br>            document.body.removeChild(textarea);<br>        }<br>    }<br><br>    /**<br>     * Restart VS Code server<br>     */<br>    async function restart() {<br>        console.log('[VSCode] Restarting editor...');<br>       </code>       | <code>0.0</code> |
  | <code>Where are RAG subtabs defined?</code> | <code>      ]),<br>      REDIS_URL: L('Redis URL', 'Connection string for Redis, used for LangGraph checkpoints and optional session memory. The graph runs even if Redis is down (stateless mode).', [<br>        ['Redis Docs', 'https://redis.io/docs/latest/']<br>      ]),<br>      REPO: L('Active Repository', 'Logical repository name for routing and indexing. MCP and CLI use this to scope retrieval.', [<br>        ['Docs: MCP Quickstart', '/docs/QUICKSTART_MCP.md']<br>      ]),<br>      COLLECTION_NAME: L('Collection Name'</code>                               | <code>1.0</code> |
  | <code>hi there</code>                       | <code>main():<br>    """Entry point."""<br>    # Check dependencies<br>    try:<br>        from rich.console import Console<br>        from rich.markdown import Markdown<br>        from rich.panel import Panel<br>        from rich.prompt import Prompt<br>    except ImportError:<br>        print("Error: Missing 'rich' library. Install with: pip install rich")<br>        sys.exit(1)<br><br>    # Get config from environment<br>    repo = os.getenv('REPO', 'agro')<br>    thread_id = os.getenv('THREAD_ID', 'cli-chat')<br><br>    # Create and run chat<br>  </code> | <code>0.0</code> |
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