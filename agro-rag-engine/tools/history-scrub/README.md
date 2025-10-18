History Rewrite Plan (Remove banned tokens and repo/collection token "target")

This procedure creates a mirror clone, scrubs all refs (branches/tags), and prepares a force-push. It does NOT run the push.

Prereqs
- Python 3.9+
- git-filter-repo installed: pip install git-filter-repo

Steps
1) Create a mirror (prefer a disk with free space):
   git clone --mirror <REPO_URL> repo-mirror && cd repo-mirror

   # Or, from a local clone on the same disk (faster, hardlinks):
   git clone --mirror . ../repo-mirror && cd ../repo-mirror

2) Install git-filter-repo if missing:
   python3 -m pip install --user git-filter-repo

3) Run the scrub (drops any path matching banned tokens and scrubs blob contents):
   SCRUB_TOKENS="token1,Token1" python3 ../tools/history-scrub/scrub_filter.py

4) Review
   # Confirm there are no matches across ALL refs
   git grep -nI -E 'token1|Token1|\bcode_chunks_target\b|\btarget\b' --all | head -n 20

   # Show remotes
   git remote -v
   git show-ref | head -n 20

5) (Optional) Delete any refs that still contain a banned token in their name (rare)
   git for-each-ref --format='%(refname)' | grep -i token1 | xargs -n1 git update-ref -d

6) Push (manual, irreversible)
   # Mirror force push — DO THIS ONLY AFTER REVIEW
   git push --mirror --force

Post-push
- All collaborators must re-clone or hard-reset to rewritten refs.
- Optionally, delete any Qdrant collections named code_chunks_scrypted or code_chunks_target if they exist.
