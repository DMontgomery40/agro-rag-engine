from fastapi.testclient import TestClient
from server.app import app


def test_config_get_masks_secrets_and_has_repos():
    client = TestClient(app)
    r = client.get('/api/config')
    assert r.status_code == 200
    data = r.json()
    assert 'env' in data and isinstance(data['env'], dict)
    assert 'repos' in data
    # ensure secret mask shape if a known secret is set (tolerate absence)
    for k in ['OPENAI_API_KEY', 'ANTHROPIC_API_KEY']:
        if k in data['env'] and data['env'][k]:
            assert data['env'][k] == '••••••••••••••••'


def test_config_schema_includes_required_keys():
    client = TestClient(app)
    r = client.get('/api/config-schema')
    assert r.status_code == 200
    data = r.json()
    assert 'schema' in data and 'values' in data and 'ui' in data
    values = data['values']
    assert 'retrieval' in values
    assert 'FINAL_K' in values['retrieval']
    assert 'LANGGRAPH_FINAL_K' in values['retrieval']
    assert 'reranker' in values
    # tolerate missing optional fields, but keys should exist
    assert 'AGRO_RERANKER_ENABLED' in values['reranker']

