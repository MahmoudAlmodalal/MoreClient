"""Shared bilingual (AR/EN) text normalization + tokenization.

Pure-Python/regex — no external deps. Used by the keyless hash embedding and the
BM25 lexical index so Arabic morphology and casing are handled consistently on
both sides of retrieval. Arabic normalization folds the common spelling variants
(alef/hamza/yaa/teh-marbuta), strips diacritics + tatweel, and maps Arabic-Indic
digits to ASCII, which materially improves lexical matching for AR queries that
don't diacritize exactly like the source — and for numeric facts (opening hours,
registration IDs, phone numbers) an AR user types as ٥ but the source stores as 5.
"""

from __future__ import annotations

import re

# Tashkeel (harakat) U+064B–U+0652, superscript alef U+0670, and tatweel U+0640.
_AR_DIACRITICS = re.compile("[ً-ْٰـ]")

# Arabic-Indic (U+0660–U+0669) and extended/Persian Arabic-Indic (U+06F0–U+06F9)
# digits → ASCII 0-9, so "الساعة ٥" and "5:00 PM" share the same numeric tokens.
_DIGIT_FOLD = {0x0660 + i: str(i) for i in range(10)}
_DIGIT_FOLD.update({0x06F0 + i: str(i) for i in range(10)})

# Spelling-variant folds applied after diacritic stripping.
_AR_FOLD = {
    "أ": "ا",  # أ -> ا
    "إ": "ا",  # إ -> ا
    "آ": "ا",  # آ -> ا
    "ٱ": "ا",  # ٱ -> ا
    "ى": "ي",  # ى -> ي
    "ة": "ه",  # ة -> ه
    "ؤ": "و",  # ؤ -> و
    "ئ": "ي",  # ئ -> ي
    "ء": "",        # ء -> (drop bare hamza)
}
_AR_FOLD_TABLE = {ord(k): v for k, v in _AR_FOLD.items()}
_AR_FOLD_TABLE.update(_DIGIT_FOLD)

_TOKEN_RE = re.compile(r"\w+", re.UNICODE)


def normalize(text: str) -> str:
    """Lowercase + Arabic-fold a string for lexical comparison."""
    if not text:
        return ""
    text = text.lower()
    text = _AR_DIACRITICS.sub("", text)
    return text.translate(_AR_FOLD_TABLE)


def tokenize(text: str) -> list[str]:
    """Normalize then split into Unicode word tokens (drops punctuation/empties)."""
    return _TOKEN_RE.findall(normalize(text))
