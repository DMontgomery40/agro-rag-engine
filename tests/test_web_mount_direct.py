from fastapi.testclient import TestClient
from server.app import app


def test_web_mount_serves_index_html_when_dist_present():
    client = TestClient(app)
    r = client.get('/web')
    # Starlette StaticFiles redirects /web to /web/ when html=True
    if r.status_code in (301, 302, 307, 308):
        r = client.get('/web/')
    assert r.status_code == 200
    body = r.text[:2000]
    assert 'AGRO Dashboard' in body
    assert 'Pipeline Summary' in body
