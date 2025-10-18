#!/usr/bin/env python3
"""
Smart Keyword Generation for  and AGRO

This script analyzes codebases to generate meaningful, domain-specific keywords
that actually help with retrieval instead of generic programming terms.

Usage:
    python generate_smart_keywords.py  /path/to/
    python generate_smart_keywords.py agro /path/to/agro
"""

import json
import os
import re
import sys
from collections import Counter, defaultdict
from pathlib import Path
from typing import Dict, List, Set, Tuple


class SmartKeywordAnalyzer:
    def __init__(self, repo_name: str, repo_path: str):
        self.repo_name = repo_name
        self.repo_path = Path(repo_path)
        self.stop_words = self._load_stop_words()
        self.domain_patterns = self._get_domain_patterns()
        
    def _load_stop_words(self) -> Set[str]:
        """Programming language stop words that don't help retrieval"""
        return {
            # Generic programming terms
            'function', 'class', 'method', 'variable', 'parameter', 'argument',
            'return', 'import', 'export', 'require', 'module', 'package',
            'const', 'let', 'var', 'if', 'else', 'for', 'while', 'switch',
            'case', 'break', 'continue', 'try', 'catch', 'throw', 'finally',
            'async', 'await', 'promise', 'callback', 'handler', 'listener',
            'event', 'emit', 'on', 'off', 'once', 'trigger', 'dispatch',
            
            # Common utility terms
            'util', 'utils', 'helper', 'helpers', 'common', 'shared', 'base',
            'abstract', 'interface', 'type', 'types', 'enum', 'enums',
            'config', 'configuration', 'settings', 'options', 'params',
            'args', 'kwargs', 'props', 'properties', 'attributes',
            
            # Generic data types
            'string', 'number', 'boolean', 'object', 'array', 'list', 'dict',
            'map', 'set', 'null', 'undefined', 'none', 'true', 'false',
            
            # Common prefixes/suffixes
            'get', 'set', 'is', 'has', 'can', 'should', 'will', 'did',
            'create', 'update', 'delete', 'remove', 'add', 'push', 'pop',
            'find', 'search', 'filter', 'map', 'reduce', 'forEach',
            'init', 'initialize', 'setup', 'teardown', 'destroy', 'cleanup'
        }
    
    def _get_domain_patterns(self) -> Dict[str, List[str]]:
        """Domain-specific patterns for different repository types"""
        return {
            '': {
                'device_types': ['camera', 'sensor', 'switch', 'light', 'lock', 'thermostat', 'fan', 'outlet'],
                'protocols': ['rtsp', 'onvif', 'http', 'https', 'websocket', 'mqtt', 'zigbee', 'zwave'],
                'formats': ['h264', 'h265', 'mjpeg', 'mp4', 'avi', 'mkv', 'webm'],
                'services': ['streaming', 'recording', 'motion', 'detection', 'notification', 'automation'],
                'platforms': ['homekit', 'alexa', 'google', 'homeassistant', 'openhab'],
                'ai_terms': ['object', 'person', 'face', 'vehicle', 'detection', 'recognition', 'analysis']
            },
            'agro': {
                'rag_terms': ['retrieval', 'embedding', 'vector', 'chunk', 'rerank', 'hybrid'],
                'models': ['llm', 'gpt', 'claude', 'qwen', 'gemini', 'bert', 'roberta'],
                'databases': ['qdrant', 'pinecone', 'weaviate', 'chroma', 'redis', 'postgres'],
                'search_types': ['semantic', 'lexical', 'sparse', 'dense', 'bm25', 'tfidf'],
                'frameworks': ['langchain', 'langgraph', 'llamaindex', 'haystack', 'transformers'],
                'apis': ['openai', 'anthropic', 'cohere', 'huggingface', 'ollama', 'mlx']
            }
        }
    
    def extract_file_context(self, file_path: Path) -> Dict[str, any]:
        """Extract meaningful context from file paths and names"""
        context = {
            'path_terms': [],
            'file_name': file_path.stem.lower(),
            'directory_terms': [],
            'file_type': file_path.suffix.lower()
        }
        
        # Extract from directory structure
        for part in file_path.parts:
            if part in {'.git', 'node_modules', '__pycache__', '.venv', 'dist', 'build'}:
                continue
            # Split camelCase, snake_case, kebab-case
            terms = re.findall(r'[A-Z][a-z]+|[a-z]+', part.replace('-', '_').replace('.', '_'))
            context['directory_terms'].extend([t.lower() for t in terms if len(t) > 2])
            context['path_terms'].extend([t.lower() for t in terms if len(t) > 2])
        
        # Extract from filename
        name_terms = re.findall(r'[A-Z][a-z]+|[a-z]+', file_path.stem.replace('-', '_'))
        context['path_terms'].extend([t.lower() for t in name_terms if len(t) > 2])
        
        return context
    
    def extract_code_terms(self, code: str, file_context: Dict) -> Set[str]:
        """Extract meaningful terms from code content"""
        terms = set()
        
        # 1. Extract class names (PascalCase)
        class_names = re.findall(r'\bclass\s+([A-Z][a-zA-Z0-9_]+)', code)
        for name in class_names:
            # Split camelCase: CameraPlugin -> camera, plugin
            words = re.findall(r'[A-Z][a-z]+|[A-Z]+(?=[A-Z]|$)', name)
            terms.update(w.lower() for w in words if len(w) > 2)
        
        # 2. Extract function names (meaningful ones)
        func_patterns = [
            r'\b(?:def|function|const|let|var)\s+([a-z][a-zA-Z0-9_]+)',  # Python/JS
            r'\b([a-z][a-zA-Z0-9_]*)\s*\([^)]*\)\s*{',  # JS function calls
        ]
        
        for pattern in func_patterns:
            matches = re.findall(pattern, code)
            for match in matches:
                if '_' in match and len(match) > 5:  # snake_case functions
                    words = match.split('_')
                    terms.update(w for w in words if len(w) > 3)
                elif re.search(r'[A-Z]', match):  # camelCase functions
                    words = re.findall(r'[A-Z][a-z]+|[a-z]+', match)
                    terms.update(w.lower() for w in words if len(w) > 2)
        
        # 3. Extract from comments (gold mine!)
        comment_patterns = [
            r'//\s*(.+)',  # JS/TS
            r'#\s*(.+)',   # Python
            r'/\*\s*(.+?)\s*\*/',  # Block comments
        ]
        
        for pattern in comment_patterns:
            comments = re.findall(pattern, code, re.DOTALL | re.IGNORECASE)
            for comment in comments:
                # Extract capitalized words (likely domain terms)
                domain_words = re.findall(r'\b[A-Z][a-z]{2,}\b', comment)
                terms.update(w.lower() for w in domain_words)
                
                # Extract quoted terms
                quoted = re.findall(r'["\']([^"\']{3,20})["\']', comment)
                terms.update(q.lower() for q in quoted if q.replace('_', '').isalpha())
        
        # 4. Extract string literals (API endpoints, config keys, etc.)
        strings = re.findall(r'["\']([^"\']{4,30})["\']', code)
        for s in strings:
            if '/' in s and s.count('/') <= 3:  # likely API endpoint
                parts = s.split('/')
                terms.update(p.lower() for p in parts if p.isalpha() and len(p) > 2)
            elif '_' in s or re.search(r'[A-Z]', s):  # config keys, enum values
                words = re.findall(r'[A-Z][a-z]+|[a-z]+', s.replace('_', ' '))
                terms.update(w.lower() for w in words if len(w) > 2)
        
        # 5. Extract from imports (module names)
        import_patterns = [
            r'import\s+.*?\s+from\s+["\']([^"\']+)["\']',  # ES6
            r'require\s*\(\s*["\']([^"\']+)["\']',        # CommonJS
            r'from\s+([a-zA-Z_][a-zA-Z0-9_]*)',          # Python
        ]
        
        for pattern in import_patterns:
            imports = re.findall(pattern, code)
            for imp in imports:
                # Extract meaningful parts from module names
                parts = imp.replace('@', '').replace('/', '_').split('_')
                terms.update(p.lower() for p in parts if len(p) > 2 and p.isalpha())
        
        # 6. Domain-specific pattern matching
        if self.repo_name in self.domain_patterns:
            for category, patterns in self.domain_patterns[self.repo_name].items():
                for pattern in patterns:
                    if pattern in code.lower():
                        terms.add(pattern)
        
        return terms
    
    def analyze_repository(self) -> Tuple[List[Dict], List[Dict], List[str]]:
        """Analyze the repository and return discriminative, semantic, and LLM keywords"""
        print(f"🔍 Analyzing {self.repo_name} repository...")
        
        term_counts = Counter()
        term_files = defaultdict(set)
        file_contexts = []
        total_files = 0
        
        # Walk through repository
        for root, dirs, files in os.walk(self.repo_path):
            # Skip common directories
            dirs[:] = [d for d in dirs if d not in {
                '.git', 'node_modules', '__pycache__', '.venv', 'dist', 'build',
                'vendor', 'tmp', 'test', 'tests', 'spec', 'specs', 'migrations'
            }]
            
            for file in files:
                # Only process source code files
                if not any(file.endswith(ext) for ext in ['.py', '.js', '.ts', '.tsx', '.rb', '.go', '.java', '.cs']):
                    continue
                
                file_path = Path(root) / file
                rel_path = file_path.relative_to(self.repo_path)
                
                try:
                    with open(file_path, 'r', encoding='utf-8', errors='ignore') as f:
                        code = f.read()
                    
                    file_context = self.extract_file_context(rel_path)
                    code_terms = self.extract_code_terms(code, file_context)
                    
                    # Combine path terms and code terms
                    all_terms = code_terms | set(file_context['path_terms'])
                    
                    for term in all_terms:
                        if term not in self.stop_words and len(term) > 2:
                            term_counts[term] += 1
                            term_files[term].add(str(rel_path))
                    
                    file_contexts.append(file_context)
                    total_files += 1
                    
                except Exception as e:
                    print(f"⚠️  Error processing {rel_path}: {e}")
                    continue
        
        print(f"📊 Analyzed {total_files} files, found {len(term_counts)} unique terms")
        
        # Generate discriminative keywords (TF-IDF style)
        discriminative = self._generate_discriminative_keywords(term_counts, term_files, total_files)
        
        # Generate semantic keywords (business domain terms)
        semantic = self._generate_semantic_keywords(term_counts, term_files, file_contexts, total_files)
        
        # Generate LLM keywords (natural language phrases)
        llm_keywords = self._generate_llm_keywords(term_counts, term_files, total_files)
        
        return discriminative, semantic, llm_keywords
    
    def _generate_discriminative_keywords(self, term_counts: Counter, term_files: Dict[str, Set], total_files: int) -> List[Dict]:
        """Generate discriminative keywords using TF-IDF approach"""
        discriminative = []
        
        for term, count in term_counts.items():
            file_count = len(term_files[term])
            
            # TF-IDF style scoring
            tf = count
            idf = total_files / file_count if file_count > 0 else 1
            
            # Good discriminative terms:
            # - Appear in multiple files (not just one file)
            # - Don't appear in too many files (not generic)
            # - Have reasonable frequency
            if (file_count >= 2 and 
                file_count <= total_files * 0.3 and  # Not in >30% of files
                count >= 3):  # Appears at least 3 times
                
                score = tf * idf
                discriminative.append({
                    'term': term,
                    'score': round(score, 2),
                    'files': file_count,
                    'mentions': count,
                    'file_percentage': round(100 * file_count / total_files, 1),
                    'sample_files': list(term_files[term])[:3]
                })
        
        # Sort by score
        discriminative.sort(key=lambda x: x['score'], reverse=True)
        return discriminative[:60]
    
    def _generate_semantic_keywords(self, term_counts: Counter, term_files: Dict[str, Set], file_contexts: List[Dict], total_files: int) -> List[Dict]:
        """Generate semantic keywords focusing on business domain terms"""
        semantic = []
        
        # Boost terms that appear in directory/file names (very semantic)
        path_terms = Counter()
        for context in file_contexts:
            for term in context['path_terms']:
                path_terms[term] += 1
        
        for term, count in term_counts.items():
            file_count = len(term_files[term])
            
            # Semantic terms should be:
            # - Business/domain related (not technical implementation)
            # - Appear in meaningful contexts
            # - Have good distribution across files
            
            if (file_count >= 2 and 
                file_count <= total_files * 0.4 and
                count >= 2):
                
                # Boost if term appears in file/directory names
                path_boost = 2.0 if term in path_terms else 1.0
                
                # Boost domain-specific terms
                domain_boost = 1.0
                if self.repo_name in self.domain_patterns:
                    for patterns in self.domain_patterns[self.repo_name].values():
                        if term in patterns:
                            domain_boost = 3.0
                            break
                
                score = (count * file_count * path_boost * domain_boost) / (total_files + 1)
                
                semantic.append({
                    'term': term,
                    'score': round(score, 2),
                    'files': file_count,
                    'mentions': count,
                    'in_directories': term in path_terms,
                    'domain_boost': domain_boost > 1.0,
                    'sample_files': list(term_files[term])[:3]
                })
        
        semantic.sort(key=lambda x: x['score'], reverse=True)
        return semantic[:60]
    
    def _generate_llm_keywords(self, term_counts: Counter, term_files: Dict[str, Set], total_files: int) -> List[str]:
        """Generate natural language phrases for LLM understanding"""
        llm_phrases = []
        
        # Get top terms
        top_terms = [term for term, _ in term_counts.most_common(30)]
        
        # Create natural language phrases
        if self.repo_name == '':
            llm_phrases = [
                "smart home automation platform",
                "homekit bridge integration", 
                "camera streaming protocols",
                "motion detection algorithms",
                "rtsp onvif support",
                "ffmpeg video processing",
                "webhook notification system",
                "plugin architecture design",
                "device management system",
                "cloud storage integration",
                "ai object detection",
                "nvr recording features",
                "push notification delivery",
                "automation rule engine",
                "streaming codec optimization",
                "device discovery protocol",
                "camera thumbnail generation",
                "video encoder configuration",
                "storage management system",
                "api endpoint design"
            ]
        elif self.repo_name == 'agro':
            llm_phrases = [
                "retrieval augmented generation",
                "hybrid search implementation",
                "vector database integration",
                "semantic code analysis",
                "multi query expansion",
                "cross encoder reranking",
                "embedding cache optimization",
                "ast aware chunking",
                "evaluation harness framework",
                "model context protocol",
                "langgraph pipeline design",
                "bm25 sparse retrieval",
                "dense vector search",
                "confidence gating system",
                "traceability integration",
                "cost optimization profiles",
                "local model deployment",
                "keyword generation algorithms",
                "cards semantic summarization",
                "multi repository routing"
            ]
        else:
            # Generic phrases based on top terms
            for term in top_terms[:10]:
                llm_phrases.append(f"{term} implementation")
                llm_phrases.append(f"{term} configuration")
                llm_phrases.append(f"{term} management system")
        
        return llm_phrases[:20]
    
    def save_results(self, discriminative: List[Dict], semantic: List[Dict], llm_keywords: List[str]):
        """Save results to JSON files"""
        # Save discriminative keywords
        with open('discriminative_keywords.json', 'w') as f:
            result = {self.repo_name: [d['term'] for d in discriminative]}
            json.dump(result, f, indent=2)
        
        # Save semantic keywords
        with open('semantic_keywords.json', 'w') as f:
            result = {self.repo_name: semantic}
            json.dump(result, f, indent=2)
        
        # Save LLM keywords
        with open('llm_keywords.json', 'w') as f:
            result = {self.repo_name: llm_keywords}
            json.dump(result, f, indent=2)
        
        print(f"✅ Saved keywords to discriminative_keywords.json, semantic_keywords.json, llm_keywords.json")
    
    def print_summary(self, discriminative: List[Dict], semantic: List[Dict], llm_keywords: List[str]):
        """Print a summary of the analysis"""
        print(f"\n{'='*80}")
        print(f"📋 KEYWORD ANALYSIS SUMMARY: {self.repo_name.upper()}")
        print(f"{'='*80}")
        
        print(f"\n🎯 Top 10 Discriminative Keywords:")
        for i, kw in enumerate(discriminative[:10], 1):
            print(f"  {i:2}. {kw['term']:20} | Score: {kw['score']:6.1f} | {kw['files']:3} files | {kw['mentions']:4} mentions")
        
        print(f"\n🏢 Top 10 Semantic Keywords:")
        for i, kw in enumerate(semantic[:10], 1):
            dir_marker = '📁' if kw['in_directories'] else '  '
            domain_marker = '🎯' if kw['domain_boost'] else '  '
            print(f"  {i:2}. {dir_marker}{domain_marker} {kw['term']:18} | Score: {kw['score']:6.1f} | {kw['files']:3} files")
        
        print(f"\n🤖 LLM Keywords ({len(llm_keywords)} phrases):")
        for i, phrase in enumerate(llm_keywords[:10], 1):
            print(f"  {i:2}. {phrase}")
        
        print(f"\n📊 Statistics:")
        print(f"  - Total discriminative keywords: {len(discriminative)}")
        print(f"  - Total semantic keywords: {len(semantic)}")
        print(f"  - Total LLM phrases: {len(llm_keywords)}")


def main():
    if len(sys.argv) != 3:
        print("Usage: python generate_smart_keywords.py <repo_name> <repo_path>")
        print("Example: python generate_smart_keywords.py  /path/to/")
        sys.exit(1)
    
    repo_name = sys.argv[1]
    repo_path = sys.argv[2]
    
    if not os.path.exists(repo_path):
        print(f"❌ Repository path does not exist: {repo_path}")
        sys.exit(1)
    
    analyzer = SmartKeywordAnalyzer(repo_name, repo_path)
    discriminative, semantic, llm_keywords = analyzer.analyze_repository()
    
    analyzer.save_results(discriminative, semantic, llm_keywords)
    analyzer.print_summary(discriminative, semantic, llm_keywords)


if __name__ == '__main__':
    main()

