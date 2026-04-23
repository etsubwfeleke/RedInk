import base64
from types import SimpleNamespace
from unittest.mock import patch

import pytest

from services.file_processor import FileProcessor


def test_detect_file_type_uses_extension_case_insensitively():
    assert FileProcessor.detect_file_type("Report.PDF") == "pdf"
    assert FileProcessor.detect_file_type("notes.Docx") == "docx"


def test_process_file_returns_text_for_plain_text(sample_file_contents):
    raw_text = "abcde"

    assert FileProcessor.process_file(raw_text, "student.txt") == raw_text
    assert FileProcessor.process_file(raw_text, "rubric.md") == raw_text


def test_process_file_handles_data_url_base64(base64_text_content):
    content = f"data:text/plain;base64,{base64_text_content}"

    assert FileProcessor.process_file(content, "sample.txt") == "Hello, encoded file content."


def test_process_file_falls_back_to_text_for_invalid_base64():
    assert FileProcessor.process_file("not-base64 at all", "notes.txt") == "not-base64 at all"
    assert FileProcessor.process_file("plain markdown", "README.md") == "plain markdown"


def test_process_pdf_uses_reader_and_joins_pages():
    fake_pages = [
        SimpleNamespace(extract_text=lambda: "Page one text"),
        SimpleNamespace(extract_text=lambda: None),
        SimpleNamespace(extract_text=lambda: "Page two text"),
    ]

    class FakePdfReader:
        def __init__(self, file_obj):
            self.pages = fake_pages

    with patch("services.file_processor.PyPDF2.PdfReader", FakePdfReader):
        result = FileProcessor.process_file(base64.b64encode(b"%PDF-1.4").decode("utf-8"), "sample.pdf")

    assert result == "Page one text\n\nPage two text"


def test_process_pdf_raises_value_error_on_reader_failure():
    with patch("services.file_processor.PyPDF2.PdfReader", side_effect=Exception("broken pdf")):
        with pytest.raises(ValueError, match="Failed to process PDF"):
            FileProcessor._process_pdf(b"broken")


def test_process_docx_extracts_paragraphs_and_tables():
    class FakeCell:
        def __init__(self, text):
            self.text = text

    class FakeRow:
        def __init__(self, cells):
            self.cells = cells

    class FakeTable:
        def __init__(self, rows):
            self.rows = rows

    fake_document = SimpleNamespace(
        paragraphs=[SimpleNamespace(text="Intro paragraph"), SimpleNamespace(text="   "), SimpleNamespace(text="Second paragraph")],
        tables=[FakeTable([FakeRow([FakeCell("A1"), FakeCell("B1")]), FakeRow([FakeCell("A2"), FakeCell("B2")])])],
    )

    with patch("services.file_processor.docx.Document", return_value=fake_document):
        result = FileProcessor.process_file(base64.b64encode(b"fake-docx-bytes").decode("utf-8"), "sample.docx")

    assert result == "Intro paragraph\n\nSecond paragraph\n\nA1 | B1\n\nA2 | B2"


def test_process_docx_raises_value_error_on_failure():
    with patch("services.file_processor.docx.Document", side_effect=Exception("broken docx")):
        with pytest.raises(ValueError, match="Failed to process DOCX"):
            FileProcessor._process_docx(b"broken")


def test_process_unknown_extension_defaults_to_text():
    assert FileProcessor.process_file("raw content", "archive.bin") == "raw content"
