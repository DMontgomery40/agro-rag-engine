#!/usr/bin/env python3
"""
Embedding Model Evaluation Script
Compare BGE-small, BGE-large, MXBAI, and others on your Apple Silicon setup
"""

import os
import time
import json
from typing import Dict, List, Any
from pathlib import Path

# Set up environment for testing
os.environ['REPO'] = 'agro'

def test_embedding_model(embedding_type: str, model_name: str = None, dimensions: int = None) -> Dict[str, Any]:
    """Test a specific embedding configuration"""
    print(f"\n🧪 Testing {embedding_type.upper()} embeddings...")
    
    # Set environment
    os.environ['EMBEDDING_TYPE'] = embedding_type
    if model_name:
        os.environ['EMBEDDING_MODEL_LOCAL'] = model_name
    if dimensions:
        os.environ['EMBEDDING_DIM'] = str(dimensions)
    
    try:
        # Import after setting env vars
        from retrieval.hybrid_search import _get_embedding
        
        test_queries = [
            "How does authentication work in this codebase?",
            "Where is the database connection configured?", 
            "What are the main API endpoints?",
            "How to handle errors in the application?",
            "Performance optimization techniques used"
        ]
        
        results = {
            'embedding_type': embedding_type,
            'model_name': model_name,
            'dimensions': None,
            'avg_time_ms': 0,
            'embeddings_generated': 0,
            'error': None
        }
        
        start_time = time.time()
        embeddings = []
        
        for query in test_queries:
            query_start = time.time()
            embedding = _get_embedding(query, kind="query")
            query_time = (time.time() - query_start) * 1000
            
            embeddings.append({
                'query': query,
                'embedding_dim': len(embedding),
                'time_ms': query_time,
                'first_values': embedding[:3]  # Just first 3 for debugging
            })
        
        total_time = (time.time() - start_time) * 1000
        results.update({
            'avg_time_ms': total_time / len(test_queries),
            'embeddings_generated': len(embeddings),
            'sample_embedding_dim': embeddings[0]['embedding_dim'] if embeddings else 0,
            'embeddings': embeddings
        })
        
        print(f"✅ {embedding_type}: {results['sample_embedding_dim']}D, {results['avg_time_ms']:.1f}ms avg")
        return results
        
    except Exception as e:
        error_result = {
            'embedding_type': embedding_type,
            'model_name': model_name,
            'error': str(e),
            'embeddings_generated': 0
        }
        print(f"❌ {embedding_type}: {e}")
        return error_result

def run_embedding_evaluation():
    """Run comprehensive embedding evaluation"""
    print("🚀 Apple Silicon Embedding Model Evaluation")
    print("=" * 50)
    
    # Test configurations
    configs = [
        {
            'name': 'BGE-Small',
            'embedding_type': 'local',
            'model_name': 'BAAI/bge-small-en-v1.5',
            'expected_dim': 384
        },
        {
            'name': 'BGE-Large', 
            'embedding_type': 'local',
            'model_name': 'BAAI/bge-large-en-v1.5',
            'expected_dim': 1024
        },
        {
            'name': 'MXBAI-512',
            'embedding_type': 'mxbai',
            'dimensions': 512,
            'expected_dim': 512
        },
        {
            'name': 'MXBAI-1024',
            'embedding_type': 'mxbai', 
            'dimensions': 1024,
            'expected_dim': 1024
        }
    ]
    
    results = []
    
    for config in configs:
        result = test_embedding_model(
            embedding_type=config['embedding_type'],
            model_name=config.get('model_name'),
            dimensions=config.get('dimensions')
        )
        result['config_name'] = config['name']
        result['expected_dim'] = config['expected_dim']
        results.append(result)
        
        # Small delay between tests
        time.sleep(2)
    
    # Save results
    output_file = Path('embedding_eval_results.json')
    with open(output_file, 'w') as f:
        json.dump(results, f, indent=2)
    
    # Print summary
    print("\n📊 EVALUATION SUMMARY")
    print("=" * 50)
    
    for result in results:
        if result.get('error'):
            print(f"❌ {result['config_name']}: ERROR - {result['error']}")
        else:
            dim_match = "✅" if result['sample_embedding_dim'] == result['expected_dim'] else "⚠️"
            print(f"{dim_match} {result['config_name']}: {result['sample_embedding_dim']}D, {result['avg_time_ms']:.1f}ms avg")
    
    print(f"\n💾 Results saved to: {output_file}")
    
    # Recommend best config
    successful_results = [r for r in results if not r.get('error')]
    if successful_results:
        fastest = min(successful_results, key=lambda x: x['avg_time_ms'])
        print(f"\n🏆 FASTEST: {fastest['config_name']} ({fastest['avg_time_ms']:.1f}ms)")
        
        highest_dim = max(successful_results, key=lambda x: x['sample_embedding_dim'])
        print(f"🎯 HIGHEST QUALITY: {highest_dim['config_name']} ({highest_dim['sample_embedding_dim']}D)")

if __name__ == "__main__":
    run_embedding_evaluation()
