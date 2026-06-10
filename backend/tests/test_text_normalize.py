from backend.services.ai import text_normalize as tn


def test_lowercases_and_strips_english():
    assert tn.tokenize("Opening HOURS") == ["opening", "hours"]


def test_folds_arabic_spelling_variants():
    # alef/hamza/yaa/teh-marbuta variants collapse so AR queries match the source
    # regardless of how the user diacritizes or spells them.
    assert tn.normalize("الخدمة") == tn.normalize("الخدمه")
    assert tn.normalize("إستفسار") == tn.normalize("استفسار")


def test_strips_arabic_diacritics_and_tatweel():
    assert tn.normalize("التبرّعات") == tn.normalize("التبرعات")
    assert tn.normalize("مســـاء") == tn.normalize("مساء")


def test_folds_arabic_indic_digits_to_ascii():
    # An AR user types ٥ / ٢٠١٤; the source stores 5 / 2014 — they must share tokens
    # so BM25 and the keyless hash embedding match numeric facts (hours, IDs, phones).
    assert tn.tokenize("الساعة ٥") == ["الساعه", "5"]
    assert "2014" in tn.tokenize("رقم ٢٠١٤")


def test_folds_extended_persian_digits():
    assert tn.tokenize("۵ ۲۰۱۴") == ["5", "2014"]
