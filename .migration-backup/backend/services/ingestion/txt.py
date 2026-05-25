"""Plain-text extraction (utf-8 with a lenient fallback)."""


def extract_txt(data: bytes) -> str:
    try:
        return data.decode("utf-8").strip()
    except UnicodeDecodeError:
        return data.decode("utf-8", errors="replace").strip()
