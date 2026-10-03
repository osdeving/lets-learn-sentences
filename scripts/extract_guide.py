#!/usr/bin/env python3
"""Extract the 3,000 numbered study entries from the source PDF.

The PDF is deliberately regular: each study page has one category, one
situation, and ten numbered entries. This script turns that source into the
JSON consumed by the web app and fails loudly if any structural invariant is
lost during extraction.
"""

from __future__ import annotations

import json
import re
import subprocess
import sys
import tempfile
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
PDF = ROOT / "Guia_3000_Expressoes_Ingles_PTBR.pdf"
OUTPUT = ROOT / "public" / "data" / "sentences.json"

CATEGORY_RE = re.compile(r"^(\d{2})\s*/\s*(.+)$")
RANGE_RE = re.compile(
    r"^Entradas\s+(\d{4})[–-](\d{4})\s+•\s+situação\s+(\d+)\s+de\s+10$"
)
ENTRY_RE = re.compile(r"^(\d{4})\s+(.+)$")


def nonempty(lines: list[str], start: int) -> tuple[int, str]:
    index = start
    while index < len(lines) and not lines[index].strip():
        index += 1
    if index >= len(lines):
        raise ValueError("Unexpected end of page")
    return index, lines[index].strip()


def extract_text() -> str:
    if not PDF.exists():
        raise FileNotFoundError(PDF)
    with tempfile.NamedTemporaryFile(suffix=".txt") as target:
        subprocess.run(
            ["pdftotext", "-layout", str(PDF), target.name],
            check=True,
        )
        return Path(target.name).read_text(encoding="utf-8")


def parse() -> dict:
    entries: list[dict] = []
    categories: dict[int, dict] = {}
    situations: dict[str, dict] = {}

    for page_number, page in enumerate(extract_text().split("\f"), start=1):
        lines = page.splitlines()
        numbered = [i for i, line in enumerate(lines) if ENTRY_RE.match(line.strip())]
        if not numbered:
            continue

        category_match = next(
            (CATEGORY_RE.match(line.strip()) for line in lines if CATEGORY_RE.match(line.strip())),
            None,
        )
        range_index = next(
            (i for i, line in enumerate(lines) if RANGE_RE.match(line.strip())),
            None,
        )
        if not category_match or range_index is None:
            raise ValueError(f"Study metadata missing on PDF page {page_number}")

        range_match = RANGE_RE.match(lines[range_index].strip())
        assert range_match
        title_index = range_index - 1
        while title_index >= 0 and not lines[title_index].strip():
            title_index -= 1
        situation_title = lines[title_index].strip()

        category_number = int(category_match.group(1))
        category_title = category_match.group(2).strip()
        situation_number = int(range_match.group(3))
        situation_id = f"{category_number:02d}-{situation_number:02d}"

        categories[category_number] = {
            "id": f"{category_number:02d}",
            "number": category_number,
            "title": category_title,
        }
        situations[situation_id] = {
            "id": situation_id,
            "number": situation_number,
            "categoryId": f"{category_number:02d}",
            "title": situation_title,
            "start": range_match.group(1),
            "end": range_match.group(2),
        }

        for line_index in numbered:
            match = ENTRY_RE.match(lines[line_index].strip())
            assert match
            sound_index, sound_line = nonempty(lines, line_index + 1)
            translation_index, translation = nonempty(lines, sound_index + 1)
            if not sound_line.startswith("Som: "):
                raise ValueError(
                    f"Entry {match.group(1)} has no pronunciation line on page {page_number}"
                )
            if translation.startswith(("Som:", "Prática:", "Entradas ")):
                raise ValueError(f"Entry {match.group(1)} has no translation")
            entries.append(
                {
                    "id": match.group(1),
                    "english": match.group(2).strip(),
                    "pronunciation": sound_line.removeprefix("Som: ").strip(),
                    "portuguese": translation,
                    "categoryId": f"{category_number:02d}",
                    "situationId": situation_id,
                    "origin": "guide",
                    "audioUrl": None,
                    "sourcePage": page_number,
                }
            )

    ids = [entry["id"] for entry in entries]
    expected_ids = [f"{number:04d}" for number in range(1, 3001)]
    if ids != expected_ids:
        missing = sorted(set(expected_ids) - set(ids))
        duplicates = sorted({item for item in ids if ids.count(item) > 1})
        raise ValueError(
            f"Expected sequential IDs 0001-3000; missing={missing[:10]}, duplicates={duplicates[:10]}"
        )
    if len(categories) != 30 or len(situations) != 300:
        raise ValueError(
            f"Expected 30 categories and 300 situations; got {len(categories)} and {len(situations)}"
        )

    return {
        "meta": {
            "title": "Inglês para a vida real",
            "source": PDF.name,
            "language": "en-US",
            "count": len(entries),
            "schemaVersion": 1,
        },
        "categories": [categories[key] for key in sorted(categories)],
        "situations": [situations[key] for key in sorted(situations)],
        "sentences": entries,
    }


def main() -> int:
    data = parse()
    OUTPUT.parent.mkdir(parents=True, exist_ok=True)
    OUTPUT.write_text(
        json.dumps(data, ensure_ascii=False, separators=(",", ":")),
        encoding="utf-8",
    )
    print(
        f"Wrote {data['meta']['count']} entries, "
        f"{len(data['categories'])} categories, and "
        f"{len(data['situations'])} situations to {OUTPUT}"
    )
    return 0


if __name__ == "__main__":
    sys.exit(main())
