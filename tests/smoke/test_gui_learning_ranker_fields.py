from pathlib import Path


def test_learning_ranker_has_mine_config_fields():
    html = Path('gui/index.html').read_text(encoding='utf-8')
    assert 'name="AGRO_TRIPLETS_PATH"' in html
    assert 'name="AGRO_RERANKER_MINE_MODE"' in html
    assert 'name="AGRO_RERANKER_MINE_RESET"' in html

