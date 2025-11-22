"""Test script to verify config model extension with 23 new fields."""

import sys
sys.path.insert(0, '/Users/davidmontgomery/agro-rag-engine')

from server.models.agro_config_model import (
    AgroConfigRoot,
    DEFAULT_CONFIG,
    AGRO_CONFIG_KEYS,
    RetrievalConfig,
    ScoringConfig,
    IndexingConfig,
    RerankingConfig,
    GenerationConfig,
    TracingConfig,
    TrainingConfig,
    UIConfig,
    HydrationConfig,
    EvaluationConfig
)


def test_config_model():
    """Test the extended config model."""

    print("=" * 80)
    print("Testing AGRO Config Model Extension")
    print("=" * 80)

    # Test 1: Load default config
    print("\n1. Testing default config instantiation...")
    config = AgroConfigRoot()
    print("   ✓ Default config loaded successfully")

    # Test 2: Verify new fields in RetrievalConfig
    print("\n2. Testing RetrievalConfig new fields...")
    assert hasattr(config.retrieval, 'use_semantic_synonyms'), "Missing use_semantic_synonyms"
    assert hasattr(config.retrieval, 'topk_dense'), "Missing topk_dense"
    assert hasattr(config.retrieval, 'topk_sparse'), "Missing topk_sparse"
    assert config.retrieval.use_semantic_synonyms == 1
    assert config.retrieval.topk_dense == 75
    assert config.retrieval.topk_sparse == 75
    print("   ✓ 3 new RetrievalConfig fields verified")

    # Test 3: Verify new fields in ScoringConfig
    print("\n3. Testing ScoringConfig new fields...")
    assert hasattr(config.scoring, 'vendor_mode'), "Missing vendor_mode"
    assert hasattr(config.scoring, 'path_boosts'), "Missing path_boosts"
    assert config.scoring.vendor_mode == "prefer_first_party"
    assert config.scoring.path_boosts == "/gui,/server,/indexer,/retrieval"
    print("   ✓ 2 new ScoringConfig fields verified")

    # Test 4: Verify new fields in IndexingConfig
    print("\n4. Testing IndexingConfig new fields...")
    assert hasattr(config.indexing, 'skip_dense'), "Missing skip_dense"
    assert hasattr(config.indexing, 'out_dir_base'), "Missing out_dir_base"
    assert hasattr(config.indexing, 'repos_file'), "Missing repos_file"
    assert config.indexing.skip_dense == 0
    assert config.indexing.out_dir_base == "./out"
    assert config.indexing.repos_file == "./repos.json"
    print("   ✓ 3 new IndexingConfig fields verified")

    # Test 5: Verify new field in RerankingConfig
    print("\n5. Testing RerankingConfig new field...")
    assert hasattr(config.reranking, 'rerank_input_snippet_chars'), "Missing rerank_input_snippet_chars"
    assert config.reranking.rerank_input_snippet_chars == 700
    print("   ✓ 1 new RerankingConfig field verified")

    # Test 6: Verify new fields in GenerationConfig
    print("\n6. Testing GenerationConfig new fields...")
    assert hasattr(config.generation, 'gen_model_cli'), "Missing gen_model_cli"
    assert hasattr(config.generation, 'gen_model_ollama'), "Missing gen_model_ollama"
    assert config.generation.gen_model_cli == "qwen3-coder:14b"
    assert config.generation.gen_model_ollama == "qwen3-coder:30b"
    print("   ✓ 2 new GenerationConfig fields verified")

    # Test 7: Verify new fields in TracingConfig
    print("\n7. Testing TracingConfig new fields...")
    assert hasattr(config.tracing, 'tracing_mode'), "Missing tracing_mode"
    assert hasattr(config.tracing, 'trace_auto_ls'), "Missing trace_auto_ls"
    assert hasattr(config.tracing, 'trace_retention'), "Missing trace_retention"
    assert hasattr(config.tracing, 'agro_log_path'), "Missing agro_log_path"
    assert hasattr(config.tracing, 'alert_notify_severities'), "Missing alert_notify_severities"
    assert config.tracing.tracing_mode == "langsmith"
    assert config.tracing.trace_auto_ls == 1
    assert config.tracing.trace_retention == 50
    assert config.tracing.agro_log_path == "data/logs/queries.jsonl"
    assert config.tracing.alert_notify_severities == "critical,warning"
    print("   ✓ 5 new TracingConfig fields verified")

    # Test 8: Verify new fields in TrainingConfig
    print("\n8. Testing TrainingConfig new fields...")
    assert hasattr(config.training, 'agro_reranker_model_path'), "Missing agro_reranker_model_path"
    assert hasattr(config.training, 'agro_reranker_mine_mode'), "Missing agro_reranker_mine_mode"
    assert hasattr(config.training, 'agro_reranker_mine_reset'), "Missing agro_reranker_mine_reset"
    assert hasattr(config.training, 'agro_triplets_path'), "Missing agro_triplets_path"
    assert config.training.agro_reranker_model_path == "models/cross-encoder-agro"
    assert config.training.agro_reranker_mine_mode == "replace"
    assert config.training.agro_reranker_mine_reset == 0
    assert config.training.agro_triplets_path == "data/training/triplets.jsonl"
    print("   ✓ 4 new TrainingConfig fields verified")

    # Test 9: Verify new fields in UIConfig
    print("\n9. Testing UIConfig new fields...")
    ui_fields = [
        'grafana_dashboard_slug', 'grafana_base_url', 'grafana_auth_mode',
        'grafana_embed_enabled', 'grafana_kiosk', 'grafana_org_id', 'grafana_refresh',
        'editor_bind', 'editor_embed_enabled', 'editor_enabled', 'editor_image',
        'theme_mode', 'open_browser'
    ]
    for field in ui_fields:
        assert hasattr(config.ui, field), f"Missing {field}"
    assert config.ui.grafana_dashboard_slug == "agro-overview"
    assert config.ui.grafana_base_url == "http://127.0.0.1:3000"
    assert config.ui.theme_mode == "dark"
    assert config.ui.open_browser == 1
    print("   ✓ 13 new UIConfig fields verified")

    # Test 10: Verify new HydrationConfig
    print("\n10. Testing HydrationConfig...")
    assert hasattr(config, 'hydration'), "Missing hydration config"
    assert hasattr(config.hydration, 'hydration_mode'), "Missing hydration_mode"
    assert hasattr(config.hydration, 'hydration_max_chars'), "Missing hydration_max_chars"
    assert config.hydration.hydration_mode == "lazy"
    assert config.hydration.hydration_max_chars == 2000
    print("   ✓ HydrationConfig with 2 fields verified")

    # Test 11: Verify new EvaluationConfig
    print("\n11. Testing EvaluationConfig...")
    assert hasattr(config, 'evaluation'), "Missing evaluation config"
    assert hasattr(config.evaluation, 'golden_path'), "Missing golden_path"
    assert hasattr(config.evaluation, 'baseline_path'), "Missing baseline_path"
    assert hasattr(config.evaluation, 'eval_multi_m'), "Missing eval_multi_m"
    assert config.evaluation.golden_path == "data/evaluation_dataset.json"
    assert config.evaluation.baseline_path == "data/evals/eval_baseline.json"
    assert config.evaluation.eval_multi_m == 10
    print("   ✓ EvaluationConfig with 3 fields verified")

    # Test 12: Verify to_flat_dict() returns all keys
    print("\n12. Testing to_flat_dict()...")
    flat_dict = config.to_flat_dict()
    new_keys = [
        'USE_SEMANTIC_SYNONYMS', 'TOPK_DENSE', 'TOPK_SPARSE',
        'VENDOR_MODE', 'PATH_BOOSTS',
        'SKIP_DENSE', 'OUT_DIR_BASE', 'REPOS_FILE',
        'RERANK_INPUT_SNIPPET_CHARS',
        'GEN_MODEL_CLI', 'GEN_MODEL_OLLAMA',
        'TRACING_MODE', 'TRACE_AUTO_LS', 'TRACE_RETENTION', 'AGRO_LOG_PATH', 'ALERT_NOTIFY_SEVERITIES',
        'AGRO_RERANKER_MODEL_PATH', 'AGRO_RERANKER_MINE_MODE', 'AGRO_RERANKER_MINE_RESET', 'AGRO_TRIPLETS_PATH',
        'GRAFANA_DASHBOARD_SLUG', 'GRAFANA_BASE_URL', 'GRAFANA_AUTH_MODE', 'GRAFANA_EMBED_ENABLED',
        'GRAFANA_KIOSK', 'GRAFANA_ORG_ID', 'GRAFANA_REFRESH', 'EDITOR_BIND', 'EDITOR_EMBED_ENABLED',
        'EDITOR_ENABLED', 'EDITOR_IMAGE', 'THEME_MODE', 'OPEN_BROWSER',
        'HYDRATION_MODE', 'HYDRATION_MAX_CHARS',
        'GOLDEN_PATH', 'BASELINE_PATH', 'EVAL_MULTI_M'
    ]

    missing_keys = [key for key in new_keys if key not in flat_dict]
    if missing_keys:
        print(f"   ✗ Missing keys in to_flat_dict(): {missing_keys}")
        return False

    print(f"   ✓ All 23 new fields present in to_flat_dict()")
    print(f"   ✓ Total keys in flat_dict: {len(flat_dict)}")

    # Test 13: Verify AGRO_CONFIG_KEYS contains all keys
    print("\n13. Testing AGRO_CONFIG_KEYS...")
    missing_keys = [key for key in new_keys if key not in AGRO_CONFIG_KEYS]
    if missing_keys:
        print(f"   ✗ Missing keys in AGRO_CONFIG_KEYS: {missing_keys}")
        return False

    print(f"   ✓ All 23 new keys present in AGRO_CONFIG_KEYS")
    print(f"   ✓ Total keys in AGRO_CONFIG_KEYS: {len(AGRO_CONFIG_KEYS)}")

    # Test 14: Test from_flat_dict() round-trip
    print("\n14. Testing from_flat_dict() round-trip...")
    flat_dict = config.to_flat_dict()
    config2 = AgroConfigRoot.from_flat_dict(flat_dict)
    flat_dict2 = config2.to_flat_dict()

    # Compare all values
    differences = []
    for key in flat_dict:
        if flat_dict[key] != flat_dict2[key]:
            differences.append(f"{key}: {flat_dict[key]} != {flat_dict2[key]}")

    if differences:
        print("   ✗ Round-trip differences found:")
        for diff in differences:
            print(f"      {diff}")
        return False

    print("   ✓ Round-trip conversion successful (all values match)")

    # Test 15: Verify field count summary
    print("\n15. Field count summary...")
    retrieval_count = len([f for f in dir(config.retrieval) if not f.startswith('_')])
    scoring_count = len([f for f in dir(config.scoring) if not f.startswith('_')])
    indexing_count = len([f for f in dir(config.indexing) if not f.startswith('_')])
    reranking_count = len([f for f in dir(config.reranking) if not f.startswith('_')])
    generation_count = len([f for f in dir(config.generation) if not f.startswith('_')])
    tracing_count = len([f for f in dir(config.tracing) if not f.startswith('_')])
    training_count = len([f for f in dir(config.training) if not f.startswith('_')])
    ui_count = len([f for f in dir(config.ui) if not f.startswith('_')])
    hydration_count = len([f for f in dir(config.hydration) if not f.startswith('_')])
    evaluation_count = len([f for f in dir(config.evaluation) if not f.startswith('_')])

    print(f"   RetrievalConfig: {retrieval_count} fields")
    print(f"   ScoringConfig: {scoring_count} fields")
    print(f"   IndexingConfig: {indexing_count} fields")
    print(f"   RerankingConfig: {reranking_count} fields")
    print(f"   GenerationConfig: {generation_count} fields")
    print(f"   TracingConfig: {tracing_count} fields")
    print(f"   TrainingConfig: {training_count} fields")
    print(f"   UIConfig: {ui_count} fields")
    print(f"   HydrationConfig: {hydration_count} fields (NEW)")
    print(f"   EvaluationConfig: {evaluation_count} fields (NEW)")

    print("\n" + "=" * 80)
    print("All tests passed! ✓")
    print(f"Total configuration keys: {len(AGRO_CONFIG_KEYS)}")
    print(f"Total flat_dict keys: {len(flat_dict)}")
    print("=" * 80)

    return True


if __name__ == "__main__":
    try:
        success = test_config_model()
        sys.exit(0 if success else 1)
    except Exception as e:
        print(f"\n✗ Test failed with error: {e}")
        import traceback
        traceback.print_exc()
        sys.exit(1)
