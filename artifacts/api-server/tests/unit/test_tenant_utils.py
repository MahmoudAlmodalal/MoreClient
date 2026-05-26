from app.services.tenant import slugify_tenant_key


class TestSlugifyTenantKey:
    def test_normal_name(self):
        assert slugify_tenant_key("My Company") == "my-company"

    def test_special_characters_stripped(self):
        result = slugify_tenant_key("Hello World! & Co.")
        assert result == "hello-world-co"

    def test_already_lowercase_no_change(self):
        assert slugify_tenant_key("acme") == "acme"

    def test_numbers_preserved(self):
        assert slugify_tenant_key("Company 123") == "company-123"

    def test_long_name_truncated_at_32(self):
        name = "a" * 50
        result = slugify_tenant_key(name)
        assert len(result) <= 32

    def test_empty_string_returns_fallback(self):
        result = slugify_tenant_key("")
        assert result.startswith("tenant-")

    def test_only_special_chars_returns_fallback(self):
        result = slugify_tenant_key("!@#$%^")
        assert result.startswith("tenant-")

    def test_no_leading_or_trailing_dash(self):
        result = slugify_tenant_key("  My Company  ")
        assert not result.startswith("-")
        assert not result.endswith("-")
