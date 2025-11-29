# API Documentation & OpenAPI Spec

AGRO exposes a full OpenAPI 3 schema through the FastAPI app defined in `server.asgi:create_app`. The legacy `server/app.py` entry point just wires that up for older scripts, but all the docs are served by the ASGI app.

## Interactive API Docs

You get two automatically generated, always-in-sync documentation UIs:

=== "Swagger UI (:material-api: /docs)"

    - **URL**: `http://localhost:8012/docs`
    - Interactive explorer for all endpoints
    - Try requests directly from the browser
    - Shows request/response models, query params, and examples

=== "ReDoc (:material-book-open-variant: /redoc)"

    - **URL**: `http://localhost:8012/redoc`
    - Single-page, document-style reference
    - Better for reading through the whole API structure
    - Good search and navigation for larger schemas

!!! note
    These docs are generated from the same Pydantic models and router definitions that the server uses internally. When you add or change endpoints, the OpenAPI schema and both UIs update automatically the next time you start the server.

## Downloading the OpenAPI Spec

The raw schema is available in both JSON and YAML. Replace `localhost:8012` with whatever host/port you’re running AGRO on.

=== "JSON (:material-code-json:)"

    ```bash
    curl http://localhost:8012/openapi.json -o openapi.json
    ```

=== "YAML (:material-code-tags:)"

    ```bash
    curl http://localhost:8012/openapi.yaml -o openapi.yaml
    ```

??? info "Where this comes from in the code"
    The legacy entry point in `server/app.py` just does:

    ```python linenums="1"
    from server.asgi import create_app

    # Global singleton for legacy scripts
    app = create_app()
    ```

    All the routing and schema generation live under `server/asgi.py` and `server/routers/`. The OpenAPI spec you see at `/openapi.json` and `/openapi.yaml` is generated directly from those routers and their Pydantic models.