from flask import Flask, request, jsonify
from flask_cors import CORS
import pandas as pd

from langchain.schema import Document
from langchain_huggingface import HuggingFaceEmbeddings
from langchain_community.vectorstores import Chroma

app = Flask(__name__)
CORS(app)

# === Load training data ===
print("Loading training data...")
df = pd.read_csv("train.csv")  # Make sure this file exists in the same directory
documents = [
    Document(page_content=text, metadata={"label": int(label)})
    for text, label in zip(df["text"].astype(str), df["label"].astype(int))
]

# === Create embeddings and in-memory Chroma ===
print("Creating embeddings...")
embedding_model = HuggingFaceEmbeddings(model_name="all-MiniLM-L6-v2")
print("Initializing Chroma in-memory...")
vectordb = Chroma.from_documents(documents, embedding=embedding_model)

@app.route("/check", methods=["POST"])
def check_prompt():
    data = request.get_json()
    if not data or "message" not in data:
        return jsonify({"error": "Missing 'message' in request"}), 400

    message = data["message"]

    # Perform similarity search
    try:
        results = vectordb.similarity_search_with_score(message, k=5)
    except Exception as e:
        return jsonify({"error": f"Vector search failed: {str(e)}"}), 500

    if not results:
        return jsonify({"status": "unknown", "reason": "No similar examples found"}), 200

    # Count how many of the top 5 are malicious
    malicious_votes = sum(int(doc.metadata.get("label", 0)) for doc, _ in results)
    majority_label = 1 if malicious_votes > len(results) // 2 else 0

    return jsonify({
        "message": message,
        "status": "malicious" if majority_label else "safe",
        "malicious_votes": malicious_votes,
        "total_considered": len(results),
        "similar_examples": [
            {
                "text": doc.page_content,
                "label": doc.metadata.get("label", 0),
                "score": score
            }
            for doc, score in results
        ]
    })

if __name__ == "__main__":
    print("Starting Flask server on port 9000...")
    app.run(host="0.0.0.0", port=9000)
