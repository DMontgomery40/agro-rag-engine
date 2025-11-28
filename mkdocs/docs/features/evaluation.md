# Evaluation

Test retrieval quality with golden questions.

## Run Eval

```bash
python eval/eval_loop.py
```

Output:

```
Running 10 golden questions...

===========================
EVAL RESULTS
===========================
Total questions: 10
Top-1 accuracy:  70.0% (7/10)
Top-5 accuracy:  90.0% (9/10)
MRR:             0.82
Duration:        12.4s
```

## Golden Questions

Edit `data/golden.json`:

```json
[
  {
    "q": "Where is authentication validated?",
    "repo": "my-project",
    "expect_paths": ["auth", "validate", "token"]
  }
]
```

## Baseline Comparison

```bash
python eval/eval_loop.py --baseline  # Save current
# ... make changes ...
python eval/eval_loop.py --compare   # Compare
```
