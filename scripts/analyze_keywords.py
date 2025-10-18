import json
import os
from collections import Counter, defaultdict
from pathlib import Path
import re

def extract_tokens(code):
    """Extract meaningful tokens from code"""
    # Remove strings and comments
    code = re.sub(r'["\'].*?["\']', '', code)
    code = re.sub(r'#.*?\n', '', code)
    code = re.sub(r'//.*?\n', '', code)
    
    # Extract identifiers (camelCase, snake_case, etc)
    tokens = re.findall(r'\b[a-zA-Z_][a-zA-Z0-9_]*\b', code)
    return [t.lower() for t in tokens if len(t) > 2]

def analyze_repo(repo_path):
    """Analyze a repo for discriminative keywords"""
    file_tokens = defaultdict(set)  # file -> set of tokens
    global_counts = Counter()  # token -> total count
    
    for root, dirs, files in os.walk(repo_path):
        # Skip common ignore patterns
        dirs[:] = [d for d in dirs if d not in {'.git', 'node_modules', '__pycache__', '.venv', 'dist', 'build'}]
        
        for file in files:
            if not any(file.endswith(ext) for ext in ['.py', '.js', '.ts', '.tsx', '.rb', '.java', '.go']):
                continue
                
            file_path = os.path.join(root, file)
            try:
                with open(file_path, 'r', encoding='utf-8', errors='ignore') as f:
                    code = f.read()
                    tokens = extract_tokens(code)
                    file_tokens[file_path].update(tokens)
                    global_counts.update(tokens)
            except:
                continue
    
    # Calculate TF-IDF style scores
    num_files = len(file_tokens)
    doc_freq = Counter()  # how many files contain each token
    
    for tokens in file_tokens.values():
        doc_freq.update(tokens)
    
    # Score = term frequency * inverse document frequency
    keyword_scores = {}
    for token, total_count in global_counts.items():
        df = doc_freq[token]
        idf = num_files / df if df > 0 else 0
        
        # High score = appears often but in few files (discriminative)
        # Low score = appears everywhere (stop word) or rarely (noise)
        if df > 1 and df < num_files * 0.05:  # in 2+ files but <5% of files
            keyword_scores[token] = total_count * idf
    
    return keyword_scores, doc_freq, num_files

def find_discriminative_keywords(repo_path, top_n=50):
    """Find the most discriminative keywords in a repo"""
    keyword_scores, doc_freq, num_files = analyze_repo(repo_path)
    
    # Sort by score
    sorted_keywords = sorted(keyword_scores.items(), key=lambda x: x[1], reverse=True)
    
    results = []
    for token, score in sorted_keywords[:top_n]:
        results.append({
            'keyword': token,
            'score': round(score, 2),
            'appears_in_files': doc_freq[token],
            'file_percentage': round(100 * doc_freq[token] / num_files, 1)
        })
    
    return results

if __name__ == '__main__':
    repos = {
        'project': os.getenv('PROJECT_PATH', '/abs/path/to/project'),
        'project': os.getenv('project_PATH', '/abs/path/to/project')
    }
    
    all_results = {}
    
    for repo_name, repo_path in repos.items():
        print(f'\n{"="*80}')
        print(f'ANALYZING: {repo_name}')
        print(f'{"="*80}')
        
        keywords = find_discriminative_keywords(repo_path, top_n=30)
        all_results[repo_name] = keywords
        
        print(f'\nTop 30 Discriminative Keywords (best for queries):\n')
        for i, kw in enumerate(keywords, 1):
            print(f'{i:2}. {kw["keyword"]:20} | Score: {kw["score"]:8.1f} | In {kw["appears_in_files"]:3} files ({kw["file_percentage"]:4.1f}%)')
    
    # Find cross-contamination terms
    print(f'\n{"="*80}')
    print('CROSS-CONTAMINATION ANALYSIS')
    print(f'{"="*80}')
    
    viv_keywords = {k['keyword'] for k in all_results['project'][:30]}
    fax_keywords = {k['keyword'] for k in all_results['project'][:30]}
    
    overlap = viv_keywords & fax_keywords
    print(f'\nShared keywords (cause confusion): {len(overlap)}')
    if overlap:
        print(f'  {", ".join(sorted(overlap))}')
    
    print(f'\nPROJECT-only keywords (use these!): {len(viv_keywords - fax_keywords)}')
    print(f'  {", ".join(sorted(list(viv_keywords - fax_keywords)[:10]))}')
    
    print(f'\nPROJECT-only keywords (use these!): {len(fax_keywords - viv_keywords)}')
    print(f'  {", ".join(sorted(list(fax_keywords - viv_keywords)[:10]))}')
    
    # Save to data/
    out_path = Path('data/discriminative_keywords.json')
    out_path.parent.mkdir(parents=True, exist_ok=True)
    with open(out_path, 'w') as f:
        json.dump(all_results, f, indent=2)
    
    print(f'\n✓ Results saved to {out_path}')
