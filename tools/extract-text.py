# -*- coding: utf-8 -*-
"""Extract the significant legal text of a document, ignoring editorial chrome.

Any element carrying the attribute data-editorial (or one of the editorial
classes) is skipped together with its whole subtree, so that presentation
metadata added for the PDF (cover, TOC, running header/footer, page numbers)
never pollutes the integrity comparison.
"""
import sys, io, re, unicodedata
from html.parser import HTMLParser

VOID = {"area","base","br","col","embed","hr","img","input","link","meta",
        "param","source","track","wbr"}
SKIP_TAGS = {"script", "style", "head", "template"}
EDITORIAL_CLASSES = {
    "doc-toc", "doc-runner", "doc-toolbar", "doc-composing",
    "pagedjs_margin-content",
}

class Extractor(HTMLParser):
    def __init__(self):
        super().__init__(convert_charrefs=True)
        self.out = []
        self.stack = []          # open element names
        self.skip_depth = 0
        self.skip_stack = []     # names of elements that opened a skip

    def _is_editorial(self, attrs):
        d = dict(attrs)
        if "data-editorial" in d:
            return True
        cls = set((d.get("class") or "").split())
        return bool(cls & EDITORIAL_CLASSES)

    def handle_starttag(self, tag, attrs):
        if tag in VOID:
            if self.skip_depth == 0 and tag == "br":
                self.out.append("\n")
            return
        self.stack.append(tag)
        if self.skip_depth:
            self.skip_depth += 1
            return
        if tag in SKIP_TAGS or self._is_editorial(attrs):
            self.skip_depth = 1

    def handle_startendtag(self, tag, attrs):
        if self.skip_depth == 0 and tag == "br":
            self.out.append("\n")

    def handle_endtag(self, tag):
        if tag in VOID:
            return
        # unwind to the matching open tag (tolerates unclosed elements)
        if tag in self.stack:
            while self.stack:
                t = self.stack.pop()
                if self.skip_depth:
                    self.skip_depth -= 1
                if t == tag:
                    break
        if self.skip_depth == 0 and tag in ("p","div","li","td","th","tr","h1",
                "h2","h3","h4","h5","h6","section","article","table","ul","ol",
                "blockquote","header","footer","main","nav"):
            self.out.append("\n")

    def handle_data(self, data):
        if self.skip_depth == 0:
            self.out.append(data)

def normalise(text):
    text = unicodedata.normalize("NFC", text)
    text = text.replace("\u00a0", " ").replace("\u202f", " ").replace("\u2009", " ")
    lines = []
    for raw in text.split("\n"):
        line = re.sub(r"[ \t\r\f\v]+", " ", raw).strip()
        if line:
            lines.append(line)
    return "\n".join(lines) + "\n"

def main():
    src = sys.argv[1]
    dst = sys.argv[2]
    with io.open(src, "r", encoding="utf-8") as fh:
        html = fh.read()
    p = Extractor()
    p.feed(html)
    p.close()
    with io.open(dst, "w", encoding="utf-8", newline=chr(10)) as fh:
        fh.write(normalise("".join(p.out)))

if __name__ == "__main__":
    main()
