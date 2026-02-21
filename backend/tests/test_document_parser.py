"""
Tests for the document parser utility.
"""

import json
import pytest
from app.utils.document_parser import (
    parse_buffer,
    get_supported_types,
    _clean,
    _json_to_text,
)


class TestGetSupportedTypes:
    def test_always_includes_basics(self):
        types = get_supported_types()
        assert "txt" in types
        assert "md" in types
        assert "json" in types


class TestParseText:
    def test_plain_text(self):
        content = b"Hello, this is a knowledge base document."
        result = parse_buffer(content, "txt", "test.txt")
        assert result["content"] == "Hello, this is a knowledge base document."
        assert result["metadata"]["filename"] == "test.txt"

    def test_markdown(self):
        content = b"# Title\n\nSome content here."
        result = parse_buffer(content, "md", "doc.md")
        assert "Title" in result["content"]
        assert "Some content here" in result["content"]


class TestParseJson:
    def test_qa_format(self):
        data = [
            {"question": "What time do you open?", "answer": "9 AM"},
            {"question": "Where are you?", "answer": "123 Main St"},
        ]
        result = parse_buffer(json.dumps(data).encode(), "json", "faq.json")
        assert "What time do you open?" in result["content"]
        assert "9 AM" in result["content"]

    def test_dict_format(self):
        data = {"name": "Acme Corp", "hours": "9-5"}
        result = parse_buffer(json.dumps(data).encode(), "json", "info.json")
        assert "Acme Corp" in result["content"]


class TestClean:
    def test_normalizes_whitespace(self):
        assert _clean("  hello  \r\n  world  ") == "hello\nworld"

    def test_collapses_multiple_newlines(self):
        assert _clean("a\n\n\n\n\nb") == "a\n\nb"

    def test_strips_leading_trailing(self):
        assert _clean("  \n  hello  \n  ") == "hello"


class TestUnsupportedType:
    def test_raises_for_unknown_type(self):
        with pytest.raises(ValueError, match="Unsupported"):
            parse_buffer(b"data", "xyz", "file.xyz")
