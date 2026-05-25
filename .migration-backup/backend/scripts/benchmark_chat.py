"""Chat latency benchmark / acceptance gate for the demo (< 3s per response).

Fires a fixed set of representative AR + EN questions (plus one off-topic query
that should escalate) at the running backend's POST /api/chat, measures
wall-clock latency per request, and prints p50 / p95 / max with a per-query
table. Exits non-zero if p95 >= 3.0s so it can double as a CI-style check.

Prerequisites: backend running on the target host, knowledge base seeded
(python -m backend.scripts.seed_demo).

Run from the repo root:
    python -m backend.scripts.benchmark_chat
    python -m backend.scripts.benchmark_chat --base-url http://localhost:8000 --rounds 2
"""

import argparse
import sys
import time

import httpx

TARGET_P95_SECONDS = 3.0

# Drawn from the seeded NGO FAQ; the last entry is a human-request that should
# escalate deterministically (keyword trigger, independent of confidence/mode).
QUERIES = [
    "What are your opening hours?",
    "How can I donate to Amal Foundation?",
    "Who is eligible for aid?",
    "How do I apply for assistance?",
    "What programs do you run?",
    "How can I volunteer?",
    "ما هي ساعات العمل؟",
    "كيف يمكنني التبرّع؟",
    "من المؤهّل للحصول على المساعدة؟",
    "ما البرامج التي تقدمونها؟",
    "I'd like to talk to a human agent",  # keyword trigger -> expect escalate=Y
]


def _percentile(sorted_vals: list[float], pct: float) -> float:
    if not sorted_vals:
        return 0.0
    k = (len(sorted_vals) - 1) * pct
    lo = int(k)
    hi = min(lo + 1, len(sorted_vals) - 1)
    return sorted_vals[lo] + (sorted_vals[hi] - sorted_vals[lo]) * (k - lo)


def main() -> int:
    parser = argparse.ArgumentParser(description="Benchmark POST /api/chat latency.")
    parser.add_argument("--base-url", default="http://localhost:8000")
    parser.add_argument("--rounds", type=int, default=1, help="repeat the query set N times")
    args = parser.parse_args()

    url = args.base_url.rstrip("/") + "/api/chat"
    samples: list[float] = []
    print(f"Benchmarking {url}  ({len(QUERIES)} queries x {args.rounds} round(s))\n")
    print(f"{'ms':>8}  {'lang':>4}  {'esc':>3}  {'conf':>5}  query")
    print("-" * 72)

    with httpx.Client(timeout=30) as client:
        for _ in range(args.rounds):
            for q in QUERIES:
                start = time.perf_counter()
                resp = client.post(
                    url, json={"session_id": "bench", "message": q, "channel": "web"}
                )
                elapsed = time.perf_counter() - start
                samples.append(elapsed)
                resp.raise_for_status()
                body = resp.json()
                lang = body.get("language", "?")
                esc = "Y" if body.get("escalate") else "n"
                conf = body.get("confidence")
                conf_s = f"{conf:.2f}" if isinstance(conf, (int, float)) else "  - "
                print(f"{elapsed * 1000:8.1f}  {lang:>4}  {esc:>3}  {conf_s:>5}  {q[:40]}")

    samples.sort()
    p50 = _percentile(samples, 0.50)
    p95 = _percentile(samples, 0.95)
    mx = samples[-1]
    print("-" * 72)
    print(f"p50={p50 * 1000:.0f}ms  p95={p95 * 1000:.0f}ms  max={mx * 1000:.0f}ms  n={len(samples)}")

    if p95 >= TARGET_P95_SECONDS:
        print(f"FAIL: p95 {p95:.2f}s >= target {TARGET_P95_SECONDS:.1f}s")
        return 1
    print(f"PASS: p95 {p95:.2f}s < target {TARGET_P95_SECONDS:.1f}s")
    return 0


if __name__ == "__main__":
    sys.exit(main())
