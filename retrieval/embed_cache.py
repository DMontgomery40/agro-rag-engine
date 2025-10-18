import os, json
import tiktoken

class EmbeddingCache:
    def __init__(self, outdir: str):
        os.makedirs(outdir, exist_ok=True)
        self.path = os.path.join(outdir, "embed_cache.jsonl")
        self.cache = {}
        if os.path.exists(self.path):
            with open(self.path, "r", encoding="utf-8") as f:
                for line in f:
                    try:
                        o = json.loads(line)
                        self.cache[o["hash"]] = o["vec"]
                    except Exception:
                        pass

    def get(self, h: str):
        return self.cache.get(h)

    def put(self, h: str, v):
        self.cache[h] = v

    def save(self):
        with open(self.path, "w", encoding="utf-8") as f:
            for h, v in self.cache.items():
                f.write(json.dumps({"hash": h, "vec": v}) + "\n")

    def prune(self, valid_hashes: set):
        before = len(self.cache)
        self.cache = {h: v for h, v in self.cache.items() if h in valid_hashes}
        after = len(self.cache)
        pruned = before - after
        if pruned > 0:
            self.save()
        return pruned

    def embed_texts(self, client, texts, hashes, model="text-embedding-3-large", batch=64):
        embs = [None] * len(texts)
        to_embed, idx_map = [], []
        for i, (t, h) in enumerate(zip(texts, hashes)):
            v = self.get(h)
            if v is None:
                idx_map.append(i)
                to_embed.append(t)
            else:
                embs[i] = v
        enc = tiktoken.get_encoding('cl100k_base')

        def _clip_for_openai(text: str, max_tokens: int = 8000) -> str:
            toks = enc.encode(text)
            if len(toks) <= max_tokens:
                return text
            return enc.decode(toks[:max_tokens])

        for i in range(0, len(to_embed), batch):
            sub = [_clip_for_openai(t) for t in to_embed[i:i + batch]]
            r = client.embeddings.create(model=model, input=sub)
            for j, d in enumerate(r.data):
                orig = idx_map[i + j]
                vec = d.embedding
                embs[orig] = vec
                self.put(hashes[orig], vec)
        return embs

