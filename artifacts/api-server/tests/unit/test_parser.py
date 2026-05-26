import pytest
from app.services.parser import chunk_text


class TestChunkText:
    def test_empty_string_returns_empty_list(self):
        assert chunk_text("") == []

    def test_short_text_single_chunk(self):
        text = "This is a short paragraph."
        result = chunk_text(text)
        assert result == ["This is a short paragraph."]

    def test_multiple_short_paragraphs_merged(self):
        text = "First para.\n\nSecond para.\n\nThird para."
        result = chunk_text(text, target=800)
        # All three fit in 800 chars, so they should be merged
        assert len(result) == 1
        assert "First para." in result[0]
        assert "Third para." in result[0]

    def test_long_paragraph_split_on_word_boundary(self):
        words = ["word"] * 200
        long_para = " ".join(words)  # ~1000 chars
        result = chunk_text(long_para, target=100)
        assert len(result) > 1
        for chunk in result:
            assert len(chunk) <= 110  # allow small overage at word boundary

    def test_custom_target_size_respected(self):
        text = "A" * 50 + "\n\n" + "B" * 50 + "\n\n" + "C" * 50
        result = chunk_text(text, target=60)
        # Each block is 50 chars; two blocks = 102 chars > 60, so they stay separate
        assert len(result) >= 2

    def test_whitespace_only_paragraphs_skipped(self):
        text = "Para one.\n\n   \n\nPara two."
        result = chunk_text(text)
        assert len(result) == 1
        assert "Para one." in result[0]
        assert "Para two." in result[0]

    def test_single_very_long_word_forms_one_chunk(self):
        text = "a" * 1200
        result = chunk_text(text, target=800)
        assert len(result) == 1
        assert result[0] == "a" * 1200
