"""Read-only structural/text/layout QA of the synthetic PDF fixture.

Generate with ATV_PDF_QA=1 vitest product-pdf.spec.ts; render separately with
pdftoppm and inspect every page. Extraction alone is not visual approval.
"""
import json
import re
from pathlib import Path
import pdfplumber
from pypdf import PdfReader

folder = Path(__file__).resolve().parents[1] / "test-results/pdf"
fixture = json.loads((folder / "atv-synthetic-report.json").read_text(encoding="utf-8"))
path = folder / "atv-synthetic-report.pdf"
reader = PdfReader(path)
assert "/OpenAction" not in reader.trailer["/Root"]
assert "/Names" not in reader.trailer["/Root"]
assert reader.metadata.title == fixture["editorial"]["title"]
with pdfplumber.open(path) as pdf:
    texts = []
    for index, page in enumerate(pdf.pages):
        text = page.extract_text()
        assert f"{index + 1} / {len(pdf.pages)}" in text
        assert "A Tua Vida nos Astros" in text
        assert not page.annots, "No external links or active annotations"
        for char in page.chars:
            assert 52 <= char["x0"] <= char["x1"] <= page.width - 52, char
            assert 25 <= char["top"] < char["bottom"] <= page.height - 25, char
        texts.append(text)
    joined = "\n".join(texts)
    compact = lambda value: re.sub(r"\s+", "", value)
    # Remove recurring page furniture before checking text split across pages.
    cleaned = re.sub(r"A Tua Vida nos Astros|Cópia pessoal \| Revisão 4 \| \d+ / \d+", "", joined)
    for section in fixture["editorial"]["sections"]:
        assert compact(section["title"]) in compact(cleaned)
        assert compact(section["text"]) in compact(cleaned)
    for fact in fixture["calculation"]["facts"]:
        assert compact(fact["display"]) in compact(cleaned)
        assert compact(fact["source"]) in compact(cleaned)
    assert "RAW_INPUT_SECRET" not in joined
    print(json.dumps({"pages": len(pdf.pages), "bytes": path.stat().st_size,
                      "text_bounds_metadata_inert_content": "PASS"}))
