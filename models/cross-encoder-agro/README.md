---
tags:
- sentence-transformers
- cross-encoder
- reranker
- generated_from_trainer
- dataset_size:195
- loss:BinaryCrossEntropyLoss
base_model: cross-encoder/ms-marco-MiniLM-L6-v2
pipeline_tag: text-ranking
library_name: sentence-transformers
---

# CrossEncoder based on cross-encoder/ms-marco-MiniLM-L6-v2

This is a [Cross Encoder](https://www.sbert.net/docs/cross_encoder/usage/usage.html) model finetuned from [cross-encoder/ms-marco-MiniLM-L6-v2](https://huggingface.co/cross-encoder/ms-marco-MiniLM-L6-v2) using the [sentence-transformers](https://www.SBERT.net) library. It computes scores for pairs of texts, which can be used for text reranking and semantic search.

## Model Details

### Model Description
- **Model Type:** Cross Encoder
- **Base model:** [cross-encoder/ms-marco-MiniLM-L6-v2](https://huggingface.co/cross-encoder/ms-marco-MiniLM-L6-v2) <!-- at revision c5ee24cb16019beea0893ab7796b1df96625c6b8 -->
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
    ['Where is the telemetry logging for queries and feedback?', '\n### Step 5: Iterate (Optional Nightly Job)\nAdd to crontab for automatic retraining:\n```bash\n# Edit crontab\ncrontab -e\n\n# Add this line (runs at 2:15 AM daily)\n15 2 * * * cd /Users/davidmontgomery/agro && . .venv/bin/activate && python scripts/mine_triplets.py && python scripts/train_reranker.py --epochs 1 --batch 16 && python scripts/eval_reranker.py --model models/cross-encoder-agro >> data/logs/nightly_reranker.log 2>&1\n```\n\n## 🔍 How It Works\n\n### Telemetry Flow:\n```\nUser Query → Retrieval → '],
    ['How does the indexing pipeline work? Where is the main indexer?', "/**\n * SIMPLE INDEX BUTTON - NO BULLSHIT\n */\n\nconst $ = id => document.getElementById(id);\n\nasync function runRealIndex() {\n    const repo = $('simple-repo-select')?.value;\n    const dense = $('simple-dense-check')?.checked;\n    const output = $('simple-output');\n    const btn = $('simple-index-btn');\n    \n    if (!repo) {\n        alert('Select a repo first');\n        return;\n    }\n    \n    btn.disabled = true;\n    btn.textContent = '⏳ INDEXING...';\n    output.style.display = 'block';\n    output"],
    ['Where is the semantic card building logic?', '      const resp = await fetch(api(\'/api/cards/build\'), { method: \'POST\' });\n      const data = await resp.json();\n      if (data.success || data.status === \'success\') { await load(); }\n      else { console.error(\'Failed to build cards:\', data.message || \'Unknown error\'); }\n    }catch(error){ console.error(\'Error building cards:\', error); }\n    finally{\n      const btn = document.getElementById(\'btn-cards-build\');\n      if (btn) { btn.disabled = false; btn.innerHTML = \'<span style="margin-right:'],
    ['Where is the Node.js MCP server implementation?', "                }\n            }\n        } catch (e) {\n            if (outputEl) outputEl.textContent = `✗ Error: ${e.message}`;\n            \n            if (window.showStatus) {\n                window.showStatus(`stdio MCP test failed: ${e.message}`, 'error');\n            }\n        } finally {\n            if (btn) btn.disabled = false;\n        }\n    }\n\n    /**\n     * Initialize MCP server management UI\n     */\n    function initMCPServerUI() {\n        // Bind HTTP server buttons\n        const btn"],
    ['Where are the keyword generation scripts?', '  <img src="assets/onboarding_carosel/auto-generate-keywords.png" alt="Auto-Generate Keywords" />\n</a>\n\nThe `scripts/` folder contains tools to analyze your codebase and generate optimal configurations:\n\n```bash\ncd /path/to/agro/scripts\n\n# Analyze a repo to find important keywords\npython analyze_keywords.py /path/to/your/agro\n\n# Enhanced version with more insights\npython analyze_keywords_v2.py /path/to/your/agro\n\n# Output shows:\n\n\n# - Most common file types\n\n\n# - Directory structure\n\n\n# - Sugges'],
]
scores = model.predict(pairs)
print(scores.shape)
# (5,)

# Or rank different texts based on similarity to a single text
ranks = model.rank(
    'Where is the telemetry logging for queries and feedback?',
    [
        '\n### Step 5: Iterate (Optional Nightly Job)\nAdd to crontab for automatic retraining:\n```bash\n# Edit crontab\ncrontab -e\n\n# Add this line (runs at 2:15 AM daily)\n15 2 * * * cd /Users/davidmontgomery/agro && . .venv/bin/activate && python scripts/mine_triplets.py && python scripts/train_reranker.py --epochs 1 --batch 16 && python scripts/eval_reranker.py --model models/cross-encoder-agro >> data/logs/nightly_reranker.log 2>&1\n```\n\n## 🔍 How It Works\n\n### Telemetry Flow:\n```\nUser Query → Retrieval → ',
        "/**\n * SIMPLE INDEX BUTTON - NO BULLSHIT\n */\n\nconst $ = id => document.getElementById(id);\n\nasync function runRealIndex() {\n    const repo = $('simple-repo-select')?.value;\n    const dense = $('simple-dense-check')?.checked;\n    const output = $('simple-output');\n    const btn = $('simple-index-btn');\n    \n    if (!repo) {\n        alert('Select a repo first');\n        return;\n    }\n    \n    btn.disabled = true;\n    btn.textContent = '⏳ INDEXING...';\n    output.style.display = 'block';\n    output",
        '      const resp = await fetch(api(\'/api/cards/build\'), { method: \'POST\' });\n      const data = await resp.json();\n      if (data.success || data.status === \'success\') { await load(); }\n      else { console.error(\'Failed to build cards:\', data.message || \'Unknown error\'); }\n    }catch(error){ console.error(\'Error building cards:\', error); }\n    finally{\n      const btn = document.getElementById(\'btn-cards-build\');\n      if (btn) { btn.disabled = false; btn.innerHTML = \'<span style="margin-right:',
        "                }\n            }\n        } catch (e) {\n            if (outputEl) outputEl.textContent = `✗ Error: ${e.message}`;\n            \n            if (window.showStatus) {\n                window.showStatus(`stdio MCP test failed: ${e.message}`, 'error');\n            }\n        } finally {\n            if (btn) btn.disabled = false;\n        }\n    }\n\n    /**\n     * Initialize MCP server management UI\n     */\n    function initMCPServerUI() {\n        // Bind HTTP server buttons\n        const btn",
        '  <img src="assets/onboarding_carosel/auto-generate-keywords.png" alt="Auto-Generate Keywords" />\n</a>\n\nThe `scripts/` folder contains tools to analyze your codebase and generate optimal configurations:\n\n```bash\ncd /path/to/agro/scripts\n\n# Analyze a repo to find important keywords\npython analyze_keywords.py /path/to/your/agro\n\n# Enhanced version with more insights\npython analyze_keywords_v2.py /path/to/your/agro\n\n# Output shows:\n\n\n# - Most common file types\n\n\n# - Directory structure\n\n\n# - Sugges',
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

* Size: 195 training samples
* Columns: <code>sentence_0</code>, <code>sentence_1</code>, and <code>label</code>
* Approximate statistics based on the first 195 samples:
  |         | sentence_0                                                                                    | sentence_1                                                                                       | label                                                         |
  |:--------|:----------------------------------------------------------------------------------------------|:-------------------------------------------------------------------------------------------------|:--------------------------------------------------------------|
  | type    | string                                                                                        | string                                                                                           | float                                                         |
  | details | <ul><li>min: 8 characters</li><li>mean: 47.79 characters</li><li>max: 79 characters</li></ul> | <ul><li>min: 70 characters</li><li>mean: 494.54 characters</li><li>max: 500 characters</li></ul> | <ul><li>min: 0.0</li><li>mean: 0.2</li><li>max: 1.0</li></ul> |
* Samples:
  | sentence_0                                                                   | sentence_1                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                    | label            |
  |:-----------------------------------------------------------------------------|:----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|:-----------------|
  | <code>Where is the telemetry logging for queries and feedback?</code>        | <code><br>### Step 5: Iterate (Optional Nightly Job)<br>Add to crontab for automatic retraining:<br>```bash<br># Edit crontab<br>crontab -e<br><br># Add this line (runs at 2:15 AM daily)<br>15 2 * * * cd /Users/davidmontgomery/agro && . .venv/bin/activate && python scripts/mine_triplets.py && python scripts/train_reranker.py --epochs 1 --batch 16 && python scripts/eval_reranker.py --model models/cross-encoder-agro >> data/logs/nightly_reranker.log 2>&1<br>```<br><br>## 🔍 How It Works<br><br>### Telemetry Flow:<br>```<br>User Query → Retrieval → </code>                | <code>0.0</code> |
  | <code>How does the indexing pipeline work? Where is the main indexer?</code> | <code>/**<br> * SIMPLE INDEX BUTTON - NO BULLSHIT<br> */<br><br>const $ = id => document.getElementById(id);<br><br>async function runRealIndex() {<br>    const repo = $('simple-repo-select')?.value;<br>    const dense = $('simple-dense-check')?.checked;<br>    const output = $('simple-output');<br>    const btn = $('simple-index-btn');<br>    <br>    if (!repo) {<br>        alert('Select a repo first');<br>        return;<br>    }<br>    <br>    btn.disabled = true;<br>    btn.textContent = '⏳ INDEXING...';<br>    output.style.display = 'block';<br>    output</code> | <code>0.0</code> |
  | <code>Where is the semantic card building logic?</code>                      | <code>      const resp = await fetch(api('/api/cards/build'), { method: 'POST' });<br>      const data = await resp.json();<br>      if (data.success \|\| data.status === 'success') { await load(); }<br>      else { console.error('Failed to build cards:', data.message \|\| 'Unknown error'); }<br>    }catch(error){ console.error('Error building cards:', error); }<br>    finally{<br>      const btn = document.getElementById('btn-cards-build');<br>      if (btn) { btn.disabled = false; btn.innerHTML = '<span style="margin-right:</code>                                    | <code>1.0</code> |
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