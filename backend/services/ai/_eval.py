"""Repeatable bilingual retrieval/answer quality eval for the RAG core.

In-process (no server needed): runs against the live seeded Chroma store and
reports retrieval hit@1 / hit@3 / MRR per language, plus answer-substring
pass-rate when a chat provider key is present. Use it to capture a before/after
quality delta when changing chunking, embeddings, or retrieval.

Run from the repo root (seed first; honor the Chroma single-writer rule):
    py -X utf8 -m backend.scripts.seed_demo
    py -X utf8 -m backend.services.ai._eval
    py -X utf8 -m backend.services.ai._eval --answers   # also score generated answers

The harness uses whichever retrieval path is wired in: it prefers
``retrieval.hybrid_search`` and falls back to plain vector ``vectorstore.query``,
so the same script measures both the old and the new pipeline.
"""

from __future__ import annotations

import argparse
import sys
from dataclasses import dataclass

from backend.core.config import settings as cfg
from backend.services.ai import embeddings, vectorstore


@dataclass
class Case:
    query: str
    lang: str
    expect: tuple[str, ...]  # substrings; a hit if ANY appears in a retrieved chunk


# Golden set drawn verbatim from backend/seed/ngo_faq_{en,ar}.md so the expected
# substrings are exact (Arabic incl. diacritics as stored).
CASES: list[Case] = [
    # --- English ---
    Case("What are your opening hours?", "en", ("9:00 AM to 5:00 PM",)),
    Case("How can I donate to Amal Foundation?", "en", ("amalfoundation.org/donate",)),
    Case("Who is eligible for aid?", "en", ("below the local poverty line", "poverty line")),
    Case("How do I apply for assistance?", "en", ("three working days",)),
    Case("What programs do you run?", "en", ("Food Relief", "Scholarship")),
    Case("How can I volunteer?", "en", ("amalfoundation.org/volunteer", "16 years old")),
    Case("Is Amal Foundation a registered charity?", "en", ("NP-2014-0317",)),
    Case("What courses does the Skills Academy offer?", "en", ("8-week", "computer skills")),
    Case("Are donations tax-deductible?", "en", ("tax-deductible",)),
    Case("How can I contact you?", "en", ("hello@amalfoundation.org", "+970-555-0142")),
    # --- Arabic ---
    Case("ما هي ساعات العمل؟", "ar", ("9:00 صباحًا حتى 5:00 مساءً", "5:00 مساء")),
    Case("كيف يمكنني التبرّع؟", "ar", ("amalfoundation.org/donate",)),
    Case("من المؤهّل للحصول على المساعدة؟", "ar", ("خط الفقر",)),
    Case("ما البرامج التي تقدمونها؟", "ar", ("الإغاثة الغذائية",)),
    Case("كيف أتقدّم بطلب للحصول على مساعدة؟", "ar", ("ثلاثة أيام عمل",)),
    Case("هل مؤسسة أمل جمعية خيرية مسجّلة؟", "ar", ("NP-2014-0317",)),
    Case("كم تستغرق معالجة طلب المساعدة؟", "ar", ("ثلاثة أيام عمل",)),
    Case("ما الدورات التي تقدّمها أكاديمية المهارات؟", "ar", ("ثمانية أسابيع", "الحاسوب")),
    Case("كيف يمكنني التواصل معكم؟", "ar", ("hello@amalfoundation.org", "+970-555-0142")),
    Case("هل التبرّعات معفاة من الضرائب؟", "ar", ("معفاة من الضرائب",)),
]


def _retrieve(query: str, k: int):
    """Return the list of chunk texts the live pipeline would ground on (top-k)."""
    emb = embeddings.embed_query(query)
    try:
        from backend.services.ai import retrieval  # new hybrid path, if present

        hits = retrieval.hybrid_search(query, emb, k)
    except Exception:
        hits = vectorstore.query(emb, k=k)
    return [h.text for h in hits]


def _first_hit_rank(chunks: list[str], expect: tuple[str, ...]) -> int | None:
    for i, text in enumerate(chunks):
        if any(e in text for e in expect):
            return i + 1  # 1-based rank
    return None


def main() -> int:
    parser = argparse.ArgumentParser(description="RAG retrieval/answer quality eval.")
    parser.add_argument("--k", type=int, default=cfg.RETRIEVAL_K)
    parser.add_argument("--answers", action="store_true", help="also score generated answers")
    args = parser.parse_args()

    if vectorstore.is_empty():
        print("Chroma KB is empty — run: py -X utf8 -m backend.scripts.seed_demo")
        return 1

    print(f"Eval over {len(CASES)} cases (k={args.k}, embed={cfg.embed_provider}, "
          f"llm={'yes' if cfg.has_any_llm else 'no/keyless'})\n")
    print(f"{'lang':>4}  {'hit@1':>5}  {'rank':>4}  query")
    print("-" * 64)

    per_lang: dict[str, list[float]] = {"en": [], "ar": []}
    hit1 = {"en": 0, "ar": 0}
    hit3 = {"en": 0, "ar": 0}
    count = {"en": 0, "ar": 0}

    for c in CASES:
        chunks = _retrieve(c.query, args.k)
        rank = _first_hit_rank(chunks, c.expect)
        count[c.lang] += 1
        rr = 1.0 / rank if rank else 0.0
        per_lang[c.lang].append(rr)
        if rank == 1:
            hit1[c.lang] += 1
        if rank and rank <= 3:
            hit3[c.lang] += 1
        mark = "Y" if rank == 1 else ("." if rank else "X")
        print(f"{c.lang:>4}  {mark:>5}  {str(rank or '-'):>4}  {c.query[:42]}")

    print("-" * 64)
    overall_rr = []
    for lang in ("en", "ar"):
        n = count[lang] or 1
        mrr = sum(per_lang[lang]) / n
        overall_rr.extend(per_lang[lang])
        print(f"{lang.upper()}: hit@1={hit1[lang]}/{count[lang]}  "
              f"hit@3={hit3[lang]}/{count[lang]}  MRR={mrr:.3f}")
    n_all = len(overall_rr) or 1
    h1 = sum(hit1.values())
    h3 = sum(hit3.values())
    print(f"ALL: hit@1={h1}/{n_all}  hit@3={h3}/{n_all}  MRR={sum(overall_rr) / n_all:.3f}")

    if args.answers and cfg.has_any_llm:
        _score_answers(args.k)
    return 0


def _score_answers(k: int) -> None:
    """Run the full RAG strategy and check the generated answer contains expected text."""
    from backend.services.ai import rag

    class _S:  # minimal duck-typed Setting
        confidence_threshold = cfg.CONFIDENCE_THRESHOLD
        bot_tone = "professional"
        bot_name = "clientMORE"
        system_prompt_extra = ""

    setting = _S()
    print("\nAnswer grounding (LLM):")
    print("-" * 64)
    passed = 0
    for c in CASES:
        strategy = rag.resolve_strategy(c.query, setting, kb_empty=vectorstore.is_empty())
        result = strategy.run(c.query, c.lang, setting)
        ok = any(e in result.answer for e in c.expect)
        passed += int(ok)
        flag = "Y" if ok else ("ESC" if result.escalate else "n")
        print(f"{c.lang:>4}  {flag:>3}  {c.query[:42]}")
    print("-" * 64)
    print(f"answer-substring pass: {passed}/{len(CASES)}")


if __name__ == "__main__":
    sys.exit(main())
