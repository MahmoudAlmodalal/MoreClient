from backend.services.ai import rag
from backend.services.ai.vectorstore import Hit


def test_lexical_anchor_allows_small_typo():
    assert rag._has_lexical_anchor(
        "What is state digram?",
        "The state diagram shows every circuit state and transition.",
    )


def test_english_non_answer_is_detected():
    assert rag._looks_unanswered(
        'I do not have information about "state digram" in the provided context.',
        "en",
    )


def test_vector_rag_ignores_corrupt_hits(monkeypatch):
    monkeypatch.setattr("backend.services.ai.rag.embeddings.embed_query", lambda text: [1.0])
    monkeypatch.setattr(
        "backend.services.ai.rag.retrieval.hybrid_search",
        lambda query_text, query_embedding, k, tenant_key=None: [
            Hit(text="bad\ufffd\ufffd\ufffd\ufffd\ufffd", distance=0.05, metadata={}),
            Hit(
                text="State diagram shows the states and transitions.",
                distance=0.2,
                metadata={},
            ),
        ],
    )
    monkeypatch.setattr(
        "backend.services.ai.rag._call_provider",
        lambda provider, messages: "A state diagram shows the states and transitions.",
    )

    setting = type("Setting", (), {"confidence_threshold": 0.45})()
    result = rag.VectorRagStrategy().run("What is state diagram?", "en", setting)

    assert result.escalate is False
    assert "state diagram" in result.answer.lower()
