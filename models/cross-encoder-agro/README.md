---
tags:
- sentence-transformers
- cross-encoder
- reranker
- generated_from_trainer
- dataset_size:67
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
    ['Where is the React chat interface component?', "import React, { useState, useEffect, useRef, useCallback } from 'react';\nimport { useAPI } from '../../hooks/useAPI';\n\ninterface Message {\n  id: string;\n  role: 'user' | 'assistant';\n  content: string;\n  timestamp: number;\n  citations?: string[];\n  confidence?: number;\n  eventId?: string; // For feedback correlation\n}\n\nexport const ChatInterface: React.FC<ChatInterfaceProps> = ({ onTraceUpdate }) => {\n  const [messages, setMessages] = useState<Message[]>([]);\n  const [input, setInput] = useState('');\n  const [streaming, setStreaming] = useState(false);\n  const { api } = useAPI();\n  \n  const sendMessage = async () => {\n    const response = await fetch(api('chat'), {\n      method: 'POST',\n      headers: { 'Content-Type': 'application/json' },\n      body: JSON.stringify({ question: input, stream: true })\n    });\n    // Handle streaming response...\n  };"],
    ['Where is the FastAPI application created?', '"""ASGI entry point for AGRO FastAPI application.\n\nThis module creates and configures the FastAPI app with all routers,\nmiddleware, and startup/shutdown handlers.\n"""\nfrom fastapi import FastAPI\nfrom fastapi.middleware.cors import CORSMiddleware\nfrom contextlib import asynccontextmanager\n\nfrom server.routers import config, search, eval, indexing, profiles\nfrom server.feedback import router as feedback_router\n\n@asynccontextmanager\nasync def lifespan(app: FastAPI):\n    """Application lifespan handler."""\n    # Startup\n    print("AGRO starting up...")\n    yield\n    # Shutdown\n    print("AGRO shutting down...")\n\ndef create_app() -> FastAPI:\n    """Factory function to create FastAPI app."""\n    app = FastAPI(\n        title="AGRO RAG API",\n        description="Another Good RAG Option - Enterprise RAG for codebases",\n        version="1.0.0",\n        lifespan=lifespan\n    )\n    \n    # Add CORS\n    app.add_middleware(CORSMiddleware, allow_origins=["*"], allow_methods=["*"])\n    \n    # Include routers\n    app.include_router(search.router)\n    app.include_router(config.router)\n    app.include_router(feedback_router)\n    \n    return app'],
    ['Where is the golden test dataset?', 'Evaluation loop script...'],
    ['How is query telemetry logged in AGRO?', 'import json\nimport time\nimport os\nimport uuid\nfrom pathlib import Path\nfrom typing import List, Dict, Any, Optional\n\ndef _resolve_log_path() -> Path:\n    """Resolve the telemetry log path from config registry."""\n    _log_path_str = os.getenv("AGRO_LOG_PATH", "data/logs/queries.jsonl")\n    return Path(_log_path_str)\n\ndef log_query_event(\n    query_raw: str,\n    query_rewritten: Optional[str],\n    retrieved: List[Dict[str, Any]],\n    answer_text: str,\n    ground_truth_refs: Optional[List[str]] = None,\n    latency_ms: Optional[int] = None,\n) -> str:\n    """Log a query event and return event_id for later feedback correlation."""\n    event_id = str(uuid.uuid4())\n    evt = {\n        "type": "query",\n        "event_id": event_id,\n        "ts": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),\n        "query_raw": query_raw,\n        "retrieval": retrieved,\n        "answer_text": answer_text,\n    }\n    with _resolve_log_path().open("a") as f:\n        f.write(json.dumps(evt) + "\\n")\n    return event_id\n\ndef log_feedback_event(event_id: str, feedback: Dict[str, Any]) -> None:\n    """Log feedback for a previous query event."""\n    evt = {"type": "feedback", "event_id": event_id, "feedback": feedback}\n    with _resolve_log_path().open("a") as f:\n        f.write(json.dumps(evt) + "\\n")'],
    ['How do I train the cross-encoder reranker?', '#!/usr/bin/env python3\n"""Train the cross-encoder reranker model.\n\nUsage:\n    python scripts/train_reranker.py --epochs 3 --batch 16\n\nReads triplets from data/training/triplets.jsonl and fine-tunes\na cross-encoder model for reranking search results.\n"""\nimport argparse\nimport json\nfrom pathlib import Path\nfrom sentence_transformers import CrossEncoder, InputExample\nfrom sentence_transformers.cross_encoder.evaluation import CECorrelationEvaluator\n\ndef load_triplets(path: str):\n    """Load training triplets."""\n    triplets = []\n    with open(path) as f:\n        for line in f:\n            t = json.loads(line)\n            triplets.append(t)\n    return triplets\n\ndef train(triplets_path: str, output_path: str, epochs: int = 2, batch_size: int = 16):\n    """Train the cross-encoder model."""\n    triplets = load_triplets(triplets_path)\n    \n    # Create training examples\n    examples = []\n    for t in triplets:\n        query = t["query"]\n        pos = t["positive_text"]\n        for neg in t["negative_texts"]:\n            examples.append(InputExample(texts=[query, pos], label=1.0))\n            examples.append(InputExample(texts=[query, neg], label=0.0))\n    \n    # Train model\n    model = CrossEncoder("cross-encoder/ms-marco-MiniLM-L-6-v2")\n    model.fit(train_dataloader=examples, epochs=epochs)\n    model.save(output_path)'],
]
scores = model.predict(pairs)
print(scores.shape)
# (5,)

# Or rank different texts based on similarity to a single text
ranks = model.rank(
    'Where is the React chat interface component?',
    [
        "import React, { useState, useEffect, useRef, useCallback } from 'react';\nimport { useAPI } from '../../hooks/useAPI';\n\ninterface Message {\n  id: string;\n  role: 'user' | 'assistant';\n  content: string;\n  timestamp: number;\n  citations?: string[];\n  confidence?: number;\n  eventId?: string; // For feedback correlation\n}\n\nexport const ChatInterface: React.FC<ChatInterfaceProps> = ({ onTraceUpdate }) => {\n  const [messages, setMessages] = useState<Message[]>([]);\n  const [input, setInput] = useState('');\n  const [streaming, setStreaming] = useState(false);\n  const { api } = useAPI();\n  \n  const sendMessage = async () => {\n    const response = await fetch(api('chat'), {\n      method: 'POST',\n      headers: { 'Content-Type': 'application/json' },\n      body: JSON.stringify({ question: input, stream: true })\n    });\n    // Handle streaming response...\n  };",
        '"""ASGI entry point for AGRO FastAPI application.\n\nThis module creates and configures the FastAPI app with all routers,\nmiddleware, and startup/shutdown handlers.\n"""\nfrom fastapi import FastAPI\nfrom fastapi.middleware.cors import CORSMiddleware\nfrom contextlib import asynccontextmanager\n\nfrom server.routers import config, search, eval, indexing, profiles\nfrom server.feedback import router as feedback_router\n\n@asynccontextmanager\nasync def lifespan(app: FastAPI):\n    """Application lifespan handler."""\n    # Startup\n    print("AGRO starting up...")\n    yield\n    # Shutdown\n    print("AGRO shutting down...")\n\ndef create_app() -> FastAPI:\n    """Factory function to create FastAPI app."""\n    app = FastAPI(\n        title="AGRO RAG API",\n        description="Another Good RAG Option - Enterprise RAG for codebases",\n        version="1.0.0",\n        lifespan=lifespan\n    )\n    \n    # Add CORS\n    app.add_middleware(CORSMiddleware, allow_origins=["*"], allow_methods=["*"])\n    \n    # Include routers\n    app.include_router(search.router)\n    app.include_router(config.router)\n    app.include_router(feedback_router)\n    \n    return app',
        'Evaluation loop script...',
        'import json\nimport time\nimport os\nimport uuid\nfrom pathlib import Path\nfrom typing import List, Dict, Any, Optional\n\ndef _resolve_log_path() -> Path:\n    """Resolve the telemetry log path from config registry."""\n    _log_path_str = os.getenv("AGRO_LOG_PATH", "data/logs/queries.jsonl")\n    return Path(_log_path_str)\n\ndef log_query_event(\n    query_raw: str,\n    query_rewritten: Optional[str],\n    retrieved: List[Dict[str, Any]],\n    answer_text: str,\n    ground_truth_refs: Optional[List[str]] = None,\n    latency_ms: Optional[int] = None,\n) -> str:\n    """Log a query event and return event_id for later feedback correlation."""\n    event_id = str(uuid.uuid4())\n    evt = {\n        "type": "query",\n        "event_id": event_id,\n        "ts": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),\n        "query_raw": query_raw,\n        "retrieval": retrieved,\n        "answer_text": answer_text,\n    }\n    with _resolve_log_path().open("a") as f:\n        f.write(json.dumps(evt) + "\\n")\n    return event_id\n\ndef log_feedback_event(event_id: str, feedback: Dict[str, Any]) -> None:\n    """Log feedback for a previous query event."""\n    evt = {"type": "feedback", "event_id": event_id, "feedback": feedback}\n    with _resolve_log_path().open("a") as f:\n        f.write(json.dumps(evt) + "\\n")',
        '#!/usr/bin/env python3\n"""Train the cross-encoder reranker model.\n\nUsage:\n    python scripts/train_reranker.py --epochs 3 --batch 16\n\nReads triplets from data/training/triplets.jsonl and fine-tunes\na cross-encoder model for reranking search results.\n"""\nimport argparse\nimport json\nfrom pathlib import Path\nfrom sentence_transformers import CrossEncoder, InputExample\nfrom sentence_transformers.cross_encoder.evaluation import CECorrelationEvaluator\n\ndef load_triplets(path: str):\n    """Load training triplets."""\n    triplets = []\n    with open(path) as f:\n        for line in f:\n            t = json.loads(line)\n            triplets.append(t)\n    return triplets\n\ndef train(triplets_path: str, output_path: str, epochs: int = 2, batch_size: int = 16):\n    """Train the cross-encoder model."""\n    triplets = load_triplets(triplets_path)\n    \n    # Create training examples\n    examples = []\n    for t in triplets:\n        query = t["query"]\n        pos = t["positive_text"]\n        for neg in t["negative_texts"]:\n            examples.append(InputExample(texts=[query, pos], label=1.0))\n            examples.append(InputExample(texts=[query, neg], label=0.0))\n    \n    # Train model\n    model = CrossEncoder("cross-encoder/ms-marco-MiniLM-L-6-v2")\n    model.fit(train_dataloader=examples, epochs=epochs)\n    model.save(output_path)',
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

* Size: 67 training samples
* Columns: <code>sentence_0</code>, <code>sentence_1</code>, and <code>label</code>
* Approximate statistics based on the first 67 samples:
  |         | sentence_0                                                                                    | sentence_1                                                                                        | label                                                          |
  |:--------|:----------------------------------------------------------------------------------------------|:--------------------------------------------------------------------------------------------------|:---------------------------------------------------------------|
  | type    | string                                                                                        | string                                                                                            | float                                                          |
  | details | <ul><li>min: 26 characters</li><li>mean: 39.0 characters</li><li>max: 47 characters</li></ul> | <ul><li>min: 11 characters</li><li>mean: 326.21 characters</li><li>max: 1369 characters</li></ul> | <ul><li>min: 0.0</li><li>mean: 0.33</li><li>max: 1.0</li></ul> |
* Samples:
  | sentence_0                                                | sentence_1                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                  | label            |
  |:----------------------------------------------------------|:------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|:-----------------|
  | <code>Where is the React chat interface component?</code> | <code>import React, { useState, useEffect, useRef, useCallback } from 'react';<br>import { useAPI } from '../../hooks/useAPI';<br><br>interface Message {<br>  id: string;<br>  role: 'user' \| 'assistant';<br>  content: string;<br>  timestamp: number;<br>  citations?: string[];<br>  confidence?: number;<br>  eventId?: string; // For feedback correlation<br>}<br><br>export const ChatInterface: React.FC<ChatInterfaceProps> = ({ onTraceUpdate }) => {<br>  const [messages, setMessages] = useState<Message[]>([]);<br>  const [input, setInput] = useState('');<br>  const [streaming, setStreaming] = useState(false);<br>  const { api } = useAPI();<br>  <br>  const sendMessage = async () => {<br>    const response = await fetch(api('chat'), {<br>      method: 'POST',<br>      headers: { 'Content-Type': 'application/json' },<br>      body: JSON.stringify({ question: input, stream: true })<br>    });<br>    // Handle streaming response...<br>  };</code>                                                                                                                                                                   | <code>1.0</code> |
  | <code>Where is the FastAPI application created?</code>    | <code>"""ASGI entry point for AGRO FastAPI application.<br><br>This module creates and configures the FastAPI app with all routers,<br>middleware, and startup/shutdown handlers.<br>"""<br>from fastapi import FastAPI<br>from fastapi.middleware.cors import CORSMiddleware<br>from contextlib import asynccontextmanager<br><br>from server.routers import config, search, eval, indexing, profiles<br>from server.feedback import router as feedback_router<br><br>@asynccontextmanager<br>async def lifespan(app: FastAPI):<br>    """Application lifespan handler."""<br>    # Startup<br>    print("AGRO starting up...")<br>    yield<br>    # Shutdown<br>    print("AGRO shutting down...")<br><br>def create_app() -> FastAPI:<br>    """Factory function to create FastAPI app."""<br>    app = FastAPI(<br>        title="AGRO RAG API",<br>        description="Another Good RAG Option - Enterprise RAG for codebases",<br>        version="1.0.0",<br>        lifespan=lifespan<br>    )<br>    <br>    # Add CORS<br>    app.add_middleware(CORSMiddleware, allow_origins=["*"], allow_methods=["*"])<br>    <br>    # Include r...</code> | <code>1.0</code> |
  | <code>Where is the golden test dataset?</code>            | <code>Evaluation loop script...</code>                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                      | <code>0.0</code> |
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