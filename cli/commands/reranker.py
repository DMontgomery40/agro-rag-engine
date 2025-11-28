import click
import os
from rich.console import Console
from server.services.config_registry import get_config_registry
from cli.commands.utils import post, get

console = Console()
_config_registry = get_config_registry()

HELP = {
    "title": "Reranker",
    "description": "Train, evaluate, and manage the Cross-Encoder Reranker model.",
    "usage": "agro reranker [train|mine|mine-golden|evaluate|status|costs]",
    "examples": """
    # Mine training data from logs
    $ agro reranker mine

    # Train model with custom params
    $ agro reranker train --epochs 5 --batch 32 --max-length 256

    # Train on custom dataset
    $ agro reranker train --triplets ./data/custom_triplets.jsonl

    # Evaluate model accuracy
    $ agro reranker evaluate
    """,
    "commands": {
        "train": {
            "description": "Fine-tune the reranker model using mined triplets.",
            "usage": "agro reranker train [--epochs N] [--batch N] [--max-length N] [--triplets PATH] [--out PATH] [--base MODEL]",
            "examples": "$ agro reranker train --epochs 5 --max-length 128"
        },
        "mine": {
            "description": "Extract training triplets from query logs (clicks/feedback).",
            "usage": "agro reranker mine [--log-path PATH] [--out-path PATH] [--mode append|replace] [--reset]",
            "examples": "$ agro reranker mine --mode replace"
        },
        "mine-golden": {
            "description": "Generate training triplets from the Golden Dataset (synthetic mining).",
            "usage": "agro reranker mine-golden",
            "examples": "$ agro reranker mine-golden"
        },
        "evaluate": {
            "description": "Run evaluation metrics (Accuracy/MRR) on the current model using test triplets.",
            "usage": "agro reranker evaluate",
            "examples": "$ agro reranker evaluate"
        },
        "status": {
            "description": "Check status of running training/mining jobs.",
            "usage": "agro reranker status",
            "examples": "$ agro reranker status"
        },
        "costs": {
            "description": "Show estimated costs associated with reranker usage.",
            "usage": "agro reranker costs",
            "examples": "$ agro reranker costs"
        }
    }
}

@click.command()
def status():
    """Reranker training status."""
    console.print(get("/api/reranker/status"))

@click.command()
@click.option("--epochs", default=lambda: _config_registry.get_int("RERANKER_TRAIN_EPOCHS", 2), help="Number of training epochs")
@click.option("--batch", default=lambda: _config_registry.get_int("RERANKER_TRAIN_BATCH", 16), help="Training batch size")
@click.option("--max-length", default=lambda: _config_registry.get_int("AGRO_RERANKER_MAXLEN", 512), help="Max sequence length")
@click.option("--triplets", default=lambda: _config_registry.get_str("AGRO_TRIPLETS_PATH", "data/training/triplets.jsonl"), help="Path to triplets.jsonl")
@click.option("--out", default=lambda: _config_registry.get_str("AGRO_RERANKER_MODEL_PATH", "models/cross-encoder-agro"), help="Output directory for model")
@click.option("--base", help="Base model to fine-tune")
def train(epochs, batch, max_length, triplets, out, base):
    """Trigger reranker training."""
    payload = {
        "epochs": epochs,
        "batch_size": batch,
        "max_length": max_length
    }
    if triplets: payload["triplets_path"] = triplets
    if out: payload["output_path"] = out
    if base: payload["base_model"] = base
    res = post("/api/reranker/train", payload)
    console.print(res)

@click.command()
@click.option("--log-path", default=lambda: _config_registry.get_str("AGRO_LOG_PATH", "data/logs/queries.jsonl"), help="Source logs path")
@click.option("--out-path", default=lambda: _config_registry.get_str("AGRO_TRIPLETS_PATH", "data/training/triplets.jsonl"), help="Output triplets path")
@click.option("--mode", type=click.Choice(["append", "replace"]), default=lambda: _config_registry.get_str("AGRO_RERANKER_MINE_MODE", "append"), help="Mining mode")
@click.option("--reset", is_flag=True, default=lambda: _config_registry.get_bool("AGRO_RERANKER_MINE_RESET", False), help="Reset output file before mining")
def mine(log_path, out_path, mode, reset):
    """Trigger triplet mining from logs."""
    payload = {}
    if log_path: payload["log_path"] = log_path
    if out_path: payload["triplets_path"] = out_path
    if mode: payload["mode"] = mode
    if reset: payload["reset"] = True
    res = post("/api/reranker/mine", payload)
    console.print(res)

@click.command(name="mine-golden")
def mine_golden():
    """Mine triplets from golden dataset."""
    res = post("/api/reranker/mine_golden")
    console.print(res)

@click.command()
def evaluate():
    """Evaluate reranker model accuracy."""
    res = post("/api/reranker/evaluate")
    console.print(res)

@click.command()
def costs():
    """Show reranker cost statistics."""
    console.print(get("/api/reranker/costs"))
