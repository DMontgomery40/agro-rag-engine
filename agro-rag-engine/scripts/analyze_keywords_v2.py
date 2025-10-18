import json
import os
import re
from collections import Counter, defaultdict
from pathlib import Path

def should_skip_directory(path):
    """Skip vendor/dependency directories"""
    skip_patterns = [
        'node_modules', '.venv', 'venv', '__pycache__', 
        '.git', 'dist', 'build', 'vendor', 'tmp',
        'test', 'tests', 'spec', 'specs',  # test files
        'migrations', 'db/migrate',  # migrations
        'locale', 'locales', 'i18n',  # translations
        '.bundle', 'coverage', '.pytest_cache'
    ]
    return any(skip in path for skip in skip_patterns)

def extract_semantic_terms(file_path, code):
    """Extract meaningful business/domain terms"""
    terms = set()
    
    # 1. Extract from file/directory names (most semantic!)
    path_parts = file_path.split('/')
    for part in path_parts:
        # Clean up: UserController.rb -> user, controller
        cleaned = re.sub(r'[._-]', ' ', part)
        words = re.findall(r'[A-Z][a-z]+|[a-z]+', cleaned)
        terms.update(w.lower() for w in words if len(w) > 3)
    
    # 2. Extract class names (PascalCase)
    class_names = re.findall(r'\bclass ([A-Z][a-zA-Z0-9_]+)', code)
    for name in class_names:
        # Split camelCase: AIStudioComponent -> ai, studio, component
        words = re.findall(r'[A-Z][a-z]+|[A-Z]+(?=[A-Z]|$)', name)
        terms.update(w.lower() for w in words if len(w) > 2)
    
    # 3. Extract function names (meaningful ones only)
    func_names = re.findall(r'\b(?:def|function|const)\s+([a-z][a-zA-Z0-9_]+)', code)
    for name in func_names:
        # Only keep multi-word functions: validate_oauth not just get
        if '_' in name:
            words = name.split('_')
            terms.update(w for w in words if len(w) > 3)
    
    # 4. Extract from comments (gold mine!)
    comments = re.findall(r'(?:#|//|/\*|\*)\s*(.+)', code)
    for comment in comments:
        # Extract capitalized words (likely domain terms)
        words = re.findall(r'\b[A-Z][a-z]{2,}\b', comment)
        terms.update(w.lower() for w in words)
    
    # 5. Extract string literals (API endpoints, routes, etc)
    strings = re.findall(r'["\']([^"\']{5,50})["\']', code)
    for s in strings:
        if '/' in s:  # likely a route
            parts = s.split('/')
            terms.update(p.lower() for p in parts if p.isalpha() and len(p) > 3)
    
    # Filter out programming keywords
    stop_words = {
        'return', 'function', 'class', 'const', 'import', 'export',
        'from', 'self', 'this', 'super', 'none', 'null', 'true', 'false',
        'async', 'await', 'yield', 'raise', 'assert', 'break', 'continue',
        'string', 'number', 'boolean', 'object', 'array', 'type', 'interface',
        'params', 'args', 'kwargs', 'options', 'config', 'props', 'state'
    }
    
    return {t for t in terms if t not in stop_words and t.isalpha()}

def analyze_repo_semantic(repo_path, repo_name):
    """Find meaningful business domain terms"""
    term_counts = Counter()
    term_files = defaultdict(set)
    directory_terms = Counter()
    
    total_files = 0
    
    for root, dirs, files in os.walk(repo_path):
        # Skip vendor directories
        if should_skip_directory(root):
            continue
        
        # Remove skippable dirs from traversal
        dirs[:] = [d for d in dirs if not should_skip_directory(os.path.join(root, d))]
        
        # Analyze directory name itself
        dir_name = os.path.basename(root)
        if dir_name and len(dir_name) > 3:
            directory_terms[dir_name.lower()] += 1
        
        for file in files:
            # Only source code files
            if not any(file.endswith(ext) for ext in ['.py', '.js', '.ts', '.tsx', '.rb', '.yml', '.java']):
                continue
            
            file_path = os.path.join(root, file)
            rel_path = os.path.relpath(file_path, repo_path)
            
            try:
                with open(file_path, 'r', encoding='utf-8', errors='ignore') as f:
                    code = f.read()
                    
                terms = extract_semantic_terms(rel_path, code)
                
                for term in terms:
                    term_counts[term] += 1
                    term_files[term].add(rel_path)
                
                total_files += 1
            except:
                continue
    
    # Calculate relevance scores
    scored_terms = []
    for term, count in term_counts.items():
        file_count = len(term_files[term])
        
        # Score formula:
        # - Appears in multiple files (2-20% of codebase) = domain term
        # - Too rare (1 file) = noise
        # - Too common (>20% files) = generic utility
        if file_count >= 2 and file_count <= total_files * 0.2:
            # Boost if term appears in directory names (very semantic)
            dir_boost = 2.0 if term in directory_terms else 1.0
            
            # Calculate domain specificity score
            score = (count * file_count * dir_boost) / (total_files + 1)
            
            scored_terms.append({
                'term': term,
                'score': score,
                'files': file_count,
                'mentions': count,
                'in_directories': term in directory_terms,
                'sample_files': list(term_files[term])[:3]
            })
    
    # Sort by score
    scored_terms.sort(key=lambda x: x['score'], reverse=True)
    
    return scored_terms, total_files, directory_terms

if __name__ == '__main__':
    repos = {
        'project': os.getenv('PROJECT_PATH', '/abs/path/to/project'),
        'faxbot': os.getenv('FAXBOT_PATH', '/abs/path/to/faxbot')
    }
    
    all_results = {}
    
    for repo_name, repo_path in repos.items():
        print(f'\n{"="*80}')
        print(f'SEMANTIC ANALYSIS: {repo_name}')
        print(f'{"="*80}')
        
        terms, total_files, directories = analyze_repo_semantic(repo_path, repo_name)
        all_results[repo_name] = terms[:50]
        
        print(f'\nAnalyzed {total_files} files')
        print(f'Found {len(terms)} meaningful domain terms')
        print(f'\nTop 30 Business/Domain Keywords:\n')
        
        for i, t in enumerate(terms[:30], 1):
            dir_marker = '📁' if t['in_directories'] else '  '
            print(f'{i:2}. {dir_marker} {t["term"]:20} | Score: {t["score"]:8.1f} | {t["files"]:3} files | {t["mentions"]:4} mentions')
        
        # Show sample context
        print(f'\n📄 Sample file locations for top terms:')
        for t in terms[:5]:
            print(f'\n  {t["term"]}:')
            for f in t['sample_files']:
                print(f'    - {f}')
    
    # Cross-analysis
    print(f'\n{"="*80}')
    print('CROSS-REPO COMPARISON')
    print(f'{"="*80}')
    
    viv_terms = {t['term'] for t in all_results['project'][:30]}
    fax_terms = {t['term'] for t in all_results['project'][:30]}
    
    shared = viv_terms & fax_terms
    viv_only = viv_terms - fax_terms
    fax_only = fax_terms - viv_terms
    
    print(f'\n🔄 Shared terms ({len(shared)}):')
    if shared:
        print(f'   {", ".join(sorted(shared)[:10])}')
    
    print(f'\n💊 PROJECT-specific ({len(viv_only)}):')
    print(f'   {", ".join(sorted(list(viv_only)[:15]))}')
    
    print(f'\n📠 PROJECT-specific ({len(fax_only)}):')
    print(f'   {", ".join(sorted(list(fax_only)[:15]))}')
    
    # Generate suggested queries
    print(f'\n{"="*80}')
    print('SUGGESTED EVAL QUERIES (based on actual terms)')
    print(f'{"="*80}')
    
    for repo_name, terms in all_results.items():
        print(f'\n{repo_name.upper()}:')
        top_terms = terms[:10]
        
        # Generate natural queries
        queries = []
        for t in top_terms[:5]:
            queries.append(f'  - "Where is {t["term"]} implemented?"')
            if t['in_directories']:
                queries.append(f'  - "How does {t["term"]} work?"')
        
        for q in queries[:8]:
            print(q)
    
    # Save
    with open('semantic_keywords.json', 'w') as f:
        json.dump(all_results, f, indent=2)
    
    print(f'\n✓ Saved to semantic_keywords.json')
