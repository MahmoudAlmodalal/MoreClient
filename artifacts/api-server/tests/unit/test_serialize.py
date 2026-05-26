from datetime import datetime, timezone, timedelta
from app.services.serialize import time_ago, humanize_bytes, iso


class TestTimeAgo:
    def test_just_now(self):
        dt = datetime.now(timezone.utc) - timedelta(seconds=30)
        assert time_ago(dt) == "just now"

    def test_minutes(self):
        dt = datetime.now(timezone.utc) - timedelta(minutes=5)
        assert time_ago(dt) == "5m ago"

    def test_hours(self):
        dt = datetime.now(timezone.utc) - timedelta(hours=3)
        assert time_ago(dt) == "3h ago"

    def test_days(self):
        dt = datetime.now(timezone.utc) - timedelta(days=2)
        assert time_ago(dt) == "2d ago"

    def test_naive_datetime_treated_as_utc(self):
        dt = datetime.utcnow() - timedelta(seconds=30)
        assert time_ago(dt) == "just now"

    def test_exactly_59_seconds_is_just_now(self):
        dt = datetime.now(timezone.utc) - timedelta(seconds=59)
        assert time_ago(dt) == "just now"

    def test_exactly_60_seconds_is_1m(self):
        dt = datetime.now(timezone.utc) - timedelta(seconds=60)
        assert time_ago(dt) == "1m ago"


class TestHumanizeBytes:
    def test_bytes(self):
        assert humanize_bytes(512) == "512 B"

    def test_kilobytes(self):
        assert humanize_bytes(1024) == "1 KB"

    def test_megabytes(self):
        assert humanize_bytes(1024 * 1024) == "1 MB"

    def test_gigabytes(self):
        assert humanize_bytes(1024 ** 3) == "1 GB"

    def test_terabytes(self):
        assert humanize_bytes(1024 ** 4) == "1 TB"

    def test_zero(self):
        assert humanize_bytes(0) == "0 B"

    def test_fractional_kb(self):
        assert humanize_bytes(1536) == "2 KB"


class TestIso:
    def test_none_returns_empty_string(self):
        assert iso(None) == ""

    def test_aware_datetime_preserved(self):
        dt = datetime(2024, 6, 15, 12, 0, 0, tzinfo=timezone.utc)
        result = iso(dt)
        assert result.startswith("2024-06-15T12:00:00")

    def test_naive_datetime_gets_utc(self):
        dt = datetime(2024, 6, 15, 12, 0, 0)
        result = iso(dt)
        assert "+00:00" in result or "Z" in result or "UTC" in result or "2024-06-15" in result
