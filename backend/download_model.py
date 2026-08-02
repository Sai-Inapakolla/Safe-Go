import os
import urllib.request

MODEL_DIR = "app/rag/model_cache/all-MiniLM-L6-v2"
POOLING_DIR = os.path.join(MODEL_DIR, "1_Pooling")

os.makedirs(POOLING_DIR, exist_ok=True)

FILES = {
    "config.json": "https://huggingface.co/sentence-transformers/all-MiniLM-L6-v2/resolve/main/config.json",
    "pytorch_model.bin": "https://huggingface.co/sentence-transformers/all-MiniLM-L6-v2/resolve/main/pytorch_model.bin",
    "tokenizer.json": "https://huggingface.co/sentence-transformers/all-MiniLM-L6-v2/resolve/main/tokenizer.json",
    "tokenizer_config.json": "https://huggingface.co/sentence-transformers/all-MiniLM-L6-v2/resolve/main/tokenizer_config.json",
    "vocab.txt": "https://huggingface.co/sentence-transformers/all-MiniLM-L6-v2/resolve/main/vocab.txt",
    "special_tokens_map.json": "https://huggingface.co/sentence-transformers/all-MiniLM-L6-v2/resolve/main/special_tokens_map.json",
    "modules.json": "https://huggingface.co/sentence-transformers/all-MiniLM-L6-v2/resolve/main/modules.json",
    "sentence_bert_config.json": "https://huggingface.co/sentence-transformers/all-MiniLM-L6-v2/resolve/main/sentence_bert_config.json",
    "1_Pooling/config.json": "https://huggingface.co/sentence-transformers/all-MiniLM-L6-v2/resolve/main/1_Pooling/config.json"
}

print("Starting streaming download of all-MiniLM-L6-v2 model files...")
for rel_path, url in FILES.items():
    dest_path = os.path.join(MODEL_DIR, rel_path.replace("/", os.sep))
    if os.path.exists(dest_path) and os.path.getsize(dest_path) > 0:
        print(f"Already exists: {rel_path}")
        continue
    print(f"Downloading {rel_path}...")
    try:
        # Stream download directly to file to prevent MemoryError
        urllib.request.urlretrieve(url, dest_path)
        print(f"Successfully downloaded {rel_path} ({os.path.getsize(dest_path)} bytes)")
    except Exception as e:
        print(f"Error downloading {rel_path}: {e}")
print("Download process completed.")
