"""
Extracts a statistical "writing style fingerprint" from human-authored article
text, and aggregates many fingerprints into a single profile that can be
injected into the generation prompt. No neural training involved — this is a
lightweight feature-extraction model, chosen because it works from a handful
of examples, needs no GPU/hosting, and plugs directly into the existing
prompt-based pipeline (see Idea.md's "Quality Optimizer" step).
"""
import re
import statistics
from collections import Counter
from typing import Any, Dict, List

import httpx
import trafilatura

USER_AGENT = (
    "Mozilla/5.0 (compatible; ArticleShipStyleTrainer/1.0; "
    "+https://articleship.example/bot)"
)

TRANSITION_PHRASES = [
    "however", "meanwhile", "that said", "on the other hand", "in fact",
    "for instance", "for example", "here's the thing", "at the end of the day",
    "in other words", "to be fair", "the truth is", "put simply",
    "as a result", "on top of that", "even so", "granted", "to be clear",
    "in practice", "in reality", "turns out", "worth noting", "notably",
    "ultimately", "still", "yet", "besides", "meaning",
]

_SENTENCE_SPLIT_RE = re.compile(r"(?<=[.!?])\s+(?=[A-Z0-9\"'])")
_WORD_RE = re.compile(r"[A-Za-z']+")
_CONTRACTION_RE = re.compile(r"\b\w+'\w+\b")
_PASSIVE_RE = re.compile(
    r"\b(is|was|were|are|been|being|be)\s+\w+ed\b", re.IGNORECASE
)


def fetch_article_text(url: str, timeout: float = 20.0) -> str:
    """Download a URL and extract its main article text (boilerplate stripped)."""
    resp = httpx.get(
        url,
        headers={"User-Agent": USER_AGENT},
        timeout=timeout,
        follow_redirects=True,
    )
    resp.raise_for_status()

    extracted = trafilatura.extract(
        resp.text,
        include_comments=False,
        include_tables=False,
        favor_recall=True,
        url=url,
    )
    if not extracted or len(extracted.strip()) < 200:
        raise ValueError(f"Could not extract usable article text from {url}")
    return extracted.strip()


def _split_sentences(text: str) -> List[str]:
    normalized = re.sub(r"\s+", " ", text).strip()
    if not normalized:
        return []
    return [s.strip() for s in _SENTENCE_SPLIT_RE.split(normalized) if s.strip()]


def _split_paragraphs(text: str) -> List[str]:
    return [p.strip() for p in re.split(r"\n\s*\n", text) if p.strip()]


def _syllable_count(word: str) -> int:
    word = word.lower()
    groups = re.findall(r"[aeiouy]+", word)
    count = len(groups)
    if word.endswith("e") and count > 1:
        count -= 1
    return max(count, 1)


def _ngrams(words: List[str], n: int) -> List[str]:
    return [" ".join(words[i:i + n]) for i in range(len(words) - n + 1)]


def extract_style_features(text: str) -> Dict[str, Any]:
    """Compute a scalar/frequency fingerprint of a single article's writing style."""
    sentences = _split_sentences(text)
    paragraphs = _split_paragraphs(text)
    words = _WORD_RE.findall(text)
    lower_words = [w.lower() for w in words]

    if not sentences or not words:
        raise ValueError("Text has no extractable sentences/words")

    sentence_lengths = [len(_WORD_RE.findall(s)) for s in sentences]
    word_lengths = [len(w) for w in words]
    syllables = sum(_syllable_count(w) for w in words)

    total_words = len(words)
    total_sentences = len(sentences)

    flesch_reading_ease = (
        206.835
        - 1.015 * (total_words / total_sentences)
        - 84.6 * (syllables / total_words)
    )

    starters = [s.split()[0].lower() for s in sentences if s.split()]
    transitions_found = Counter()
    lower_text = text.lower()
    for phrase in TRANSITION_PHRASES:
        hits = lower_text.count(phrase)
        if hits:
            transitions_found[phrase] = hits

    bigrams = Counter(_ngrams(lower_words, 2))
    trigrams = Counter(_ngrams(lower_words, 3))

    contractions = len(_CONTRACTION_RE.findall(text))
    passive_hits = len(_PASSIVE_RE.findall(text))
    em_dashes = text.count("—") + text.count(" - ")
    semicolons = text.count(";")
    questions = text.count("?")
    exclamations = text.count("!")

    return {
        "word_count": total_words,
        "sentence_count": total_sentences,
        "paragraph_count": len(paragraphs) or 1,
        "avg_sentence_length": statistics.mean(sentence_lengths),
        "stdev_sentence_length": (
            statistics.pstdev(sentence_lengths) if len(sentence_lengths) > 1 else 0.0
        ),
        "avg_word_length": statistics.mean(word_lengths),
        "avg_paragraph_sentences": total_sentences / (len(paragraphs) or 1),
        "type_token_ratio": len(set(lower_words)) / total_words,
        "flesch_reading_ease": flesch_reading_ease,
        "contractions_per_1k_words": contractions / total_words * 1000,
        "passive_per_1k_sentences": passive_hits / total_sentences * 1000,
        "em_dash_per_1k_words": em_dashes / total_words * 1000,
        "semicolon_per_1k_words": semicolons / total_words * 1000,
        "question_per_1k_sentences": questions / total_sentences * 1000,
        "exclamation_per_1k_sentences": exclamations / total_sentences * 1000,
        "top_sentence_starters": Counter(starters).most_common(15),
        "top_transitions": transitions_found.most_common(15),
        "top_bigrams": [bg for bg, c in bigrams.most_common(40) if c > 1],
        "top_trigrams": [tg for tg, c in trigrams.most_common(20) if c > 1],
    }


_SCALAR_KEYS = [
    "avg_sentence_length", "stdev_sentence_length", "avg_word_length",
    "avg_paragraph_sentences", "type_token_ratio", "flesch_reading_ease",
    "contractions_per_1k_words", "passive_per_1k_sentences",
    "em_dash_per_1k_words", "semicolon_per_1k_words",
    "question_per_1k_sentences", "exclamation_per_1k_sentences",
]


def aggregate_style_profile(all_features: List[Dict[str, Any]]) -> Dict[str, Any]:
    """Combine per-article fingerprints (weighted by word count) into one profile."""
    if not all_features:
        raise ValueError("No source features to aggregate")

    weights = [max(f.get("word_count", 1), 1) for f in all_features]
    total_weight = sum(weights)

    scalars: Dict[str, float] = {}
    for key in _SCALAR_KEYS:
        values = [f.get(key, 0.0) for f in all_features]
        weighted_mean = sum(v * w for v, w in zip(values, weights)) / total_weight
        scalars[key] = weighted_mean
        scalars[f"{key}_stdev"] = (
            statistics.pstdev(values) if len(values) > 1 else 0.0
        )

    starters = Counter()
    transitions = Counter()
    bigrams = Counter()
    trigrams = Counter()
    for f in all_features:
        starters.update(dict(f.get("top_sentence_starters", [])))
        transitions.update(dict(f.get("top_transitions", [])))
        bigrams.update(f.get("top_bigrams", []))
        trigrams.update(f.get("top_trigrams", []))

    return {
        "source_count": len(all_features),
        "total_words_analyzed": total_weight,
        "scalars": scalars,
        "top_sentence_starters": [w for w, _ in starters.most_common(15)],
        "top_transitions": [w for w, _ in transitions.most_common(15)],
        "top_bigrams": [w for w, _ in bigrams.most_common(25)],
        "top_trigrams": [w for w, _ in trigrams.most_common(15)],
    }


def render_style_guidance(profile: Dict[str, Any]) -> str:
    """Turn an aggregate style profile into a natural-language prompt block."""
    if not profile:
        return ""

    s = profile.get("scalars", {})
    avg_len = s.get("avg_sentence_length", 0)
    stdev_len = s.get("stdev_sentence_length", 0)
    ttr = s.get("type_token_ratio", 0)
    flesch = s.get("flesch_reading_ease", 0)
    contractions = s.get("contractions_per_1k_words", 0)
    passive = s.get("passive_per_1k_sentences", 0)
    para_sentences = s.get("avg_paragraph_sentences", 0)

    starters = ", ".join(profile.get("top_sentence_starters", [])[:8])
    transitions = ", ".join(profile.get("top_transitions", [])[:8])
    phrases = ", ".join(profile.get("top_trigrams", [])[:8])

    return f"""LEARNED STYLE FINGERPRINT (statistically derived from {profile.get('source_count', 0)} human-authored reference articles, {profile.get('total_words_analyzed', 0):,} words analyzed):
- Sentence length: average {avg_len:.1f} words, varying by about ±{stdev_len:.1f} words. Mix short punchy sentences with longer ones — do NOT write uniform-length sentences back to back, that reads as AI-generated.
- Paragraphs run about {para_sentences:.1f} sentences long.
- Vocabulary richness (type-token ratio) ≈ {ttr:.2f} — avoid repeating the same word/phrase for a concept; vary word choice the way these reference authors do.
- Readability (Flesch reading ease) ≈ {flesch:.0f} — match this register (higher = simpler/conversational, lower = denser/technical).
- Contractions appear ~{contractions:.1f} times per 1,000 words — use them naturally (don't, it's, we're) rather than writing in a stiff, formal register, unless that contradicts the topic's tone.
- Passive voice is used sparingly (~{passive:.1f} instances per 1,000 sentences) — strongly prefer active voice.
- Common sentence openers in this style: {starters or 'varied, not templated'}.
- Favored transitions/connective phrases: {transitions or 'varied'}.
- Characteristic recurring phrases to draw inspiration from (do not copy verbatim): {phrases or 'n/a'}.

Match this fingerprint's rhythm and voice while writing the article below. This is about HOW the sentences are built, not what they say — never let it override the topic, facts, or SEO requirements."""
