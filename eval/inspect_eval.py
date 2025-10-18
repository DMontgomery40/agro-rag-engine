#!/usr/bin/env python3
"""Inspect AI evaluation for AGRO RAG system.

Runs golden questions through retrieval and evaluates performance
with full trace visibility in LangTrace.
"""
import os
import sys
from pathlib import Path

# Add parent to path
sys.path.insert(0, str(Path(__file__).parent.parent))

from inspect_ai import Task, task, eval
from inspect_ai.dataset import csv_dataset, FieldSpec
from inspect_ai.scorer import match, includes
from inspect_ai.solver import generate, chain_of_thought

# Set up environment
os.environ['LANGTRACE_API_KEY'] = os.getenv('LANGTRACE_API_KEY', '0b20be5d3e82b7c514cd1bea1fa583f92683e55ebe895452ece7d9261d4412d2')

# Custom solver that calls our RAG
from inspect_ai.solver import Solver, solver
from inspect_ai.model import ChatMessageUser, ChatMessageAssistant
from retrieval.hybrid_search import search_routed_multi

@solver
def agro_rag_solver():
    """Custom solver that uses AGRO's RAG instead of an LLM."""
    async def solve(state, generate):
        # Get the input question
        question = state.user_prompt.text
        
        # Run retrieval
        results = search_routed_multi(question, repo_override="agro", m=2, final_k=5)
        
        # Format output
        output = "\n".join(f"{i+1}. {r['file_path']}" for i, r in enumerate(results))
        
        # Add to messages
        state.messages.append(
            ChatMessageAssistant(content=output, source="generate")
        )
        
        return state
    
    return solve

@task
def agro_rag_eval():
    """Evaluate AGRO RAG system on golden questions."""
    return Task(
        dataset=csv_dataset(
            "data/langtrace_dataset.csv",
            FieldSpec(
                input="input",
                target="expected_output",
                id="id",
                metadata=["repo", "hit"]
            )
        ),
        plan=[agro_rag_solver()],
        scorer=includes()  # Check if expected files are in output
    )

if __name__ == "__main__":
    # Run evaluation
    eval(agro_rag_eval(), log_dir="data/evals/inspect_logs")

