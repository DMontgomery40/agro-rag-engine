from __future__ import annotations

"""Qdrant recreate fallback wrappers to avoid hard failures on 404/exists."""

def recreate_collection(client, collection_name: str, vectors_config):
    """
    Recreate a Qdrant collection with proper error handling.
    Handles both old (flat) and new (nested) vector config formats.
    """
    try:
        # Check if collection exists first
        try:
            info = client.get_collection(collection_name)
            print(f"Collection '{collection_name}' already exists, deleting...")
            client.delete_collection(collection_name)
        except Exception:
            pass  # Collection doesn't exist, that's fine
        
        # Create with proper config
        return client.create_collection(
            collection_name=collection_name,
            vectors_config=vectors_config
        )
    except Exception as e:
        print(f"Error creating collection '{collection_name}': {e}")
        # Last resort: try recreate_collection method
        try:
            return client.recreate_collection(
                collection_name=collection_name,
                vectors_config=vectors_config
            )
        except Exception as e2:
            print(f"Recreate also failed: {e2}")
            raise

