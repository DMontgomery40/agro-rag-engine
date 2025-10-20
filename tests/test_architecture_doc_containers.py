from pathlib import Path


DOC = Path(__file__).resolve().parents[1] / "website/docs/development/architecture.md"


def test_containers_listed():
    text = DOC.read_text()
    # Required container names from infra/docker-compose.yml
    required = [
        "qdrant",
        "rag-redis",
        "agro-alertmanager",
        "agro-prometheus",
        "agro-loki",
        "agro-promtail",
        "agro-grafana",
    ]
    missing = [name for name in required if name not in text]
    assert not missing, f"Missing containers in architecture.md: {missing}"


