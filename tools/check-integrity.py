# -*- coding: utf-8 -*-
"""Contrôle d'intégrité du contenu juridique — Motor As'Phalte.

Deux niveaux de vérification :

  1. SOURCE   — le texte des fichiers HTML est comparé caractère pour
                caractère, ligne par ligne, à l'empreinte de référence
                enregistrée dans tools/reference/. Aucune tolérance.

  2. COMPOSÉ  — si le rapport de composition a été produit (node tools/inspect.mjs),
                le texte réellement mis en pages est comparé à la même
                référence, en ignorant les seules différences d'espacement
                que la fragmentation d'un paragraphe entre deux pages peut
                introduire. Cela prouve qu'aucun caractère n'a été perdu,
                dupliqué ni déplacé par la mise en pages.

Dans les deux cas, les éléments purement éditoriaux ajoutés pour le PDF
(en-têtes, pieds de page, pagination, table des matières, mentions de
confidentialité) sont exclus : ils portent l'attribut data-editorial.

Usage :
    python tools/check-integrity.py            # vérifie
    python tools/check-integrity.py --record   # (re)constitue la référence
"""
import io
import re
import sys
import difflib
import pathlib
import unicodedata

ROOT = pathlib.Path(__file__).resolve().parent.parent
REFERENCE = ROOT / "tools" / "reference"
RENDERED = ROOT / ".inspect"

sys.path.insert(0, str(ROOT / "tools"))
import importlib.util

spec = importlib.util.spec_from_file_location(
    "extract_text", str(ROOT / "tools" / "extract-text.py")
)
extract_text = importlib.util.module_from_spec(spec)
spec.loader.exec_module(extract_text)


def significant_text(path):
    html = io.open(path, "r", encoding="utf-8").read()
    parser = extract_text.Extractor()
    parser.feed(html)
    parser.close()
    return extract_text.normalise("".join(parser.out))


def compact(text):
    """Suite des caractères non blancs, insensible à la fragmentation."""
    return re.sub(r"\s+", "", unicodedata.normalize("NFC", text))


def documents():
    return sorted(p for p in ROOT.glob("*.html"))


def record():
    REFERENCE.mkdir(parents=True, exist_ok=True)
    for path in documents():
        target = REFERENCE / (path.name + ".txt")
        io.open(target, "w", encoding="utf-8", newline=chr(10)).write(
            significant_text(path)
        )
        sys.stdout.write("reference: %s\n" % path.name)


def verify():
    if not REFERENCE.is_dir():
        sys.stderr.write(
            "Aucune reference enregistree. Lancez : python tools/check-integrity.py --record\n"
        )
        return 1

    failures = 0
    for path in documents():
        reference_file = REFERENCE / (path.name + ".txt")
        if not reference_file.is_file():
            sys.stdout.write("%-70s REFERENCE MANQUANTE\n" % path.name)
            failures += 1
            continue

        reference = io.open(reference_file, "r", encoding="utf-8").read()
        current = significant_text(path)

        if current == reference:
            source_status = "source: identique"
        else:
            source_status = "source: DIFFERENT"
            failures += 1
            diff = difflib.unified_diff(
                reference.splitlines(), current.splitlines(),
                "reference", "actuel", lineterm="", n=1,
            )
            for line in list(diff)[:40]:
                sys.stdout.write("    %s\n" % line)

        rendered_file = RENDERED / (path.stem + ".rendered.html")
        if rendered_file.is_file():
            rendered = significant_text(rendered_file)
            if compact(rendered) == compact(reference):
                composed_status = "compose: identique"
            else:
                composed_status = "compose: DIFFERENT"
                failures += 1
                a, b = compact(reference), compact(rendered)
                matcher = difflib.SequenceMatcher(None, a, b, autojunk=False)
                for tag, i1, i2, j1, j2 in matcher.get_opcodes():
                    if tag == "equal":
                        continue
                    sys.stdout.write(
                        "    %s @%d  reference: %r\n                actuel   : %r\n"
                        % (tag, i1, a[max(0, i1 - 40):i2 + 40], b[max(0, j1 - 40):j2 + 40])
                    )
                    break
        else:
            composed_status = "compose: non evalue"

        sys.stdout.write("%-64s %-20s %s\n" % (path.name[:64], source_status, composed_status))

    if failures:
        sys.stdout.write("\n%d ecart(s) detecte(s).\n" % failures)
        return 1
    sys.stdout.write("\nContenu juridique inchange sur l'ensemble du dossier.\n")
    return 0


if __name__ == "__main__":
    sys.exit(record() or 0 if "--record" in sys.argv else verify())
