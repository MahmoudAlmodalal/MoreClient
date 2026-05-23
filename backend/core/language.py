"""Language detection — collapses everything to the two languages the UI
supports: Arabic ("ar") and English ("en", the default)."""

from langdetect import DetectorFactory, detect

# Make langdetect deterministic across runs.
DetectorFactory.seed = 0


def detect_language(text: str) -> str:
    """Return "ar" if the text is detected as Arabic, else "en"."""
    text = (text or "").strip()
    if not text:
        return "en"
    # Fast path: any Arabic-script character -> Arabic.
    if any("؀" <= ch <= "ۿ" for ch in text):
        return "ar"
    try:
        return "ar" if detect(text) == "ar" else "en"
    except Exception:
        return "en"
