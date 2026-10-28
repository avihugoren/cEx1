"""Build the Hebrew GPU / NVLink learning path.

Writes two files next to this folder:
  ../gpu-learning-path.html          the page as a fragment, for publishing as a hosted page
  ../gpu-learning-path-offline.html  a complete standalone HTML file that works with no internet

Run: python3 build.py
"""
from pathlib import Path

HERE = Path(__file__).resolve().parent
OUT = HERE.parent

template = (HERE / "template.html").read_text(encoding="utf-8")
page = (template
        .replace("%%GLOSSARY%%", (HERE / "data-glossary.js").read_text(encoding="utf-8"))
        .replace("%%PATH%%", (HERE / "data-path.js").read_text(encoding="utf-8")))

(OUT / "gpu-learning-path.html").write_text(page, encoding="utf-8")

# Offline file: a full document with its own charset, so Hebrew renders correctly when opened from disk.
split = page.index('<div dir="rtl"')
head, rest = page[:split], page[split:]
head = head.replace('<meta name="claude:viewport-fit-sides" content="cover">\n', "")
offline = (
    '<!doctype html>\n<html lang="he" dir="rtl">\n<head>\n<meta charset="utf-8">\n'
    '<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">\n'
    + head + "</head>\n<body>\n" + rest + "</body>\n</html>\n"
)
(OUT / "gpu-learning-path-offline.html").write_text(offline, encoding="utf-8")
print("wrote", OUT / "gpu-learning-path.html")
print("wrote", OUT / "gpu-learning-path-offline.html")
