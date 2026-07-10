"""
Regression tests for the six audited pipeline bugs.
Run: .venv/bin/python test_fixes.py  (no network, no DB, no API keys needed)
"""
import os
import asyncio

os.environ.setdefault("GEMINI_API_KEY", "test-key-not-used")

from services import article_builder, keyword_engine, structure_builder
from services.llm_client import LLMClient, LLMResponse


# ── Bug 3 + 4: DDGS last-resort fallback (string queries, no NameError) ───────
def test_ddgs_last_resort_fallback():
    calls = []

    class FakeDDGS:
        def text(self, query, max_results=5):
            assert isinstance(query, str), f"ddgs.text() got {type(query).__name__}, expected str"
            calls.append((query, max_results))
            if query.startswith("Detailed analysis") and max_results == 6:
                return [{"title": "Real Result", "href": "https://example.com/a", "body": "Useful insight text."}]
            return []

    orig_ddgs, orig_cat = article_builder.DDGS, article_builder.categorize_topic
    article_builder.DDGS = FakeDDGS
    # Simulate a mid-try failure: previously left blocked_domains unbound → NameError.
    article_builder.categorize_topic = lambda t: (_ for _ in ()).throw(RuntimeError("boom"))
    try:
        result = article_builder._retrieve_article_context_sync("why ai website builders fail")
    finally:
        article_builder.DDGS, article_builder.categorize_topic = orig_ddgs, orig_cat

    assert "TITLE: Real Result" in result, f"last-resort fallback did not produce snippets: {result[:200]}"
    assert all(isinstance(q, str) for q, _ in calls)


# ── Bug 2: JSON truncation detection + retry ─────────────────────────────────
def _make_client():
    return LLMClient("gemini", "gemini-3-flash-preview")


def test_generate_json_truncation_retry():
    client = _make_client()
    seen_limits = []

    def fake_generate(prompt, *, model=None, temperature=0.7, max_output_tokens=None, json_mode=False):
        seen_limits.append(max_output_tokens)
        if len(seen_limits) == 1:
            return LLMResponse('{"primary_keyword": "trunca', "MAX_TOKENS")
        return LLMResponse('{"primary_keyword": "ok"}', "STOP")

    client.generate = fake_generate
    result = client.generate_json("prompt", max_output_tokens=1024)
    assert result == {"primary_keyword": "ok"}
    assert seen_limits == [1024, 2048], f"expected doubled retry limit, got {seen_limits}"


def test_transient_503_retry():
    client = _make_client()
    calls = []

    class Overloaded(Exception):
        code = 503

    def flaky():
        calls.append(1)
        if len(calls) < 3:
            raise Overloaded("model overloaded")
        return "ok"

    assert client._call_with_retry(flaky, base_delay=0) == "ok"
    assert len(calls) == 3, f"expected 2 retries then success, got {len(calls)} calls"

    class Fatal(Exception):
        code = 400  # non-retryable

    def always_fatal():
        raise Fatal("bad request")

    try:
        client._call_with_retry(always_fatal, base_delay=0)
    except Fatal:
        pass
    else:
        raise AssertionError("non-retryable errors must propagate immediately")


def test_generate_json_raises_after_exhausted_retries():
    client = _make_client()
    client.generate = lambda *a, **k: LLMResponse('{"broken', "MAX_TOKENS")
    try:
        client.generate_json("prompt", max_output_tokens=512)
    except ValueError:
        pass
    else:
        raise AssertionError("generate_json should raise ValueError on persistent truncation")


# ── Bug 5: heading-count overshoot trimming ───────────────────────────────────
def test_trim_overshoot():
    structure = {
        "h1": "T",
        "sections": [
            {"h2": f"Section {i}", "subsections": [{"h3": f"S{i}.{j}"} for j in range(6)]}
            for i in range(10)
        ],
    }
    structure["sections"][-1]["h2"] = "FAQ"
    targets = structure_builder._compute_heading_targets(1500)  # h2_max = 7
    trimmed = structure_builder._trim_overshoot(structure, targets, 1500)

    assert len(trimmed["sections"]) == 7, f"expected 7 H2s, got {len(trimmed['sections'])}"
    assert trimmed["sections"][-1]["h2"] == "FAQ", "final (FAQ) section must survive the trim"
    assert all(len(s["subsections"]) <= 4 for s in trimmed["sections"])

    # 500-word tier: flat structure, no H3s
    flat = {"sections": [{"h2": "A", "subsections": [{"h3": "x"}]}, {"h2": "B", "subsections": []}]}
    trimmed_flat = structure_builder._trim_overshoot(flat, structure_builder._compute_heading_targets(500), 500)
    assert all(len(s["subsections"]) == 0 for s in trimmed_flat["sections"])


# ── Bug 6: keyword failure raises instead of silent error dict ────────────────
def test_keyword_failure_raises():
    orig_retrieve = keyword_engine._retrieve_context_sync
    orig_gather = keyword_engine.gather_search_context
    keyword_engine._retrieve_context_sync = lambda topic: "No context available."

    async def empty_grounding(topic):
        return {"related_questions": [], "related_searches": [], "competing_pages": []}

    keyword_engine.gather_search_context = empty_grounding
    try:
        asyncio.run(keyword_engine.generate_seo_keywords("some topic"))
    except RuntimeError as e:
        assert "no search context" in str(e).lower()
    else:
        raise AssertionError("generate_seo_keywords should raise when all retrieval fails")
    finally:
        keyword_engine._retrieve_context_sync = orig_retrieve
        keyword_engine.gather_search_context = orig_gather


# ── Bug 1: statistic/link grounding enforcement ───────────────────────────────
def test_grounding_enforcement():
    context = (
        "TITLE: Study\nURL: https://example.com/study\n"
        "INSIGHT: Adoption grew 42% in production teams."
    )
    article = "\n".join([
        "## The 42% Shift",  # heading with number — untouched
        "[Adoption grew 42%](https://example.com/study) across teams.",   # grounded — kept
        "[Over 600 million blogs exist](https://optinmonster.com/stats/) today.",  # fabricated link + stat — removed
        "The tooling costs $5,000 per seat. It remains popular though.",  # ungrounded stat sentence removed, rest kept
        "META_DESCRIPTION: A 99% accurate summary.",  # meta line — untouched
    ])
    cleaned, warnings = article_builder._ground_generated_article(article, context)

    assert "## The 42% Shift" in cleaned
    assert "(https://example.com/study)" in cleaned, "grounded citation must be preserved"
    assert "optinmonster.com" not in cleaned, "fabricated URL must be stripped"
    assert "600 million" not in cleaned, "ungrounded statistic must be removed"
    assert "$5,000" not in cleaned
    assert "It remains popular though." in cleaned, "non-stat sentences on the same line must survive"
    assert "META_DESCRIPTION: A 99% accurate summary." in cleaned
    assert len(warnings) >= 3, f"expected warnings for each removal, got: {warnings}"


if __name__ == "__main__":
    tests = [v for k, v in sorted(globals().items()) if k.startswith("test_")]
    for t in tests:
        t()
        print(f"PASS {t.__name__}")
    print(f"\n{len(tests)} tests passed.")
