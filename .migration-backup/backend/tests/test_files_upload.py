"""Upload hardening helpers (backend/routers/files.py)."""

from backend.routers.files import _content_matches_extension, _sanitize_filename


def test_sanitize_strips_path_components():
    assert _sanitize_filename("../../etc/passwd") == "passwd"
    assert _sanitize_filename("a/b/c.pdf") == "c.pdf"
    assert _sanitize_filename("C:\\Windows\\evil.txt").endswith("evil.txt")


def test_sanitize_falls_back_to_upload():
    assert _sanitize_filename("") == "upload"
    assert _sanitize_filename(None) == "upload"


def test_sanitize_strips_control_chars():
    assert "\n" not in _sanitize_filename("re\nport.pdf")


def test_pdf_magic_match():
    assert _content_matches_extension(".pdf", b"%PDF-1.7\n...")
    assert not _content_matches_extension(".pdf", b"MZ\x90\x00")  # spoofed exe


def test_zip_container_match():
    assert _content_matches_extension(".docx", b"PK\x03\x04rest-of-zip")
    assert _content_matches_extension(".xlsx", b"PK\x03\x04rest-of-zip")
    assert not _content_matches_extension(".docx", b"not-a-zip-file")


def test_text_has_no_signature_requirement():
    assert _content_matches_extension(".txt", b"anything goes")
    assert _content_matches_extension(".md", b"# heading")
