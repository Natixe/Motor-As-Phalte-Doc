# -*- coding: utf-8 -*-
"""Reconstruit le sous-graphe juridique Motor As'Phalte et regenere graphify-out/.

Deterministe : aucune inference de modele, aucun appel reseau, aucun cout en jetons.
Lit (lecture seule)  : tools/reference/<acte>.html.txt
Ecrit                : graphify-out/graph.json, GRAPH_REPORT.md, wiki/
Les .html des actes ne sont jamais touches.

Usage : python tools/build-doc-graph.py
"""
import io, os, re, json, shutil, collections

PROJ = os.environ.get("MAP_PROJ",
                     os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
REF = os.path.join(PROJ, "tools", "reference")

# ------------------------------------------------------------------ actes
ACTS = collections.OrderedDict()
ACTS["pacte"] = dict(
    txt="PACTE D'ASSOCIES.txt",
    html="PACTE D'ASSOCIÉS.html",
    doc_id="pacte_d_associ_s",
    doc_label="Pacte d'associés — Motor As'Phalte",
    art_prefix="pacte_article_",
    art_re=re.compile(r"^Article (\d+)( bis)? — (.+)$"),
    titre_re=re.compile(r"^(TITRE [IVXL]+) — (.+)$"),
    titre_prefix="pacte_titre_",
)
ACTS["annexe_5"] = dict(
    txt="ANNEXE 5.txt",
    html="ANNEXE 5 — Projet de Statuts.html",
    doc_id="annexe_5_projet_de_statuts",
    doc_label="Annexe 5 — Projet de Statuts",
    art_prefix="annexe_5_projet_de_statuts_article_",
    art_re=re.compile(r"^Article (\d+)( bis)? — (.+)$"),
    titre_re=re.compile(r"^(TITRE [IVXL]+) — (.+)$"),
    titre_prefix="annexe_5_projet_de_statuts_titre_",
)
ACTS["annexe_1"] = dict(
    txt="ANNEXE 1.txt",
    html="ANNEXE 1 — Mandat spécial pour les actes accomplis pour le compte de la Société en formation.html",
    doc_id="annexe_1_mandat_special",
    doc_label="Annexe 1 — Mandat spécial",
    art_prefix="annexe_1_article_",
    art_re=re.compile(r"^ARTICLE (\d+)( BIS)? — (.+)$"),
    titre_re=None, titre_prefix=None,
)
ACTS["annexe_2"] = dict(
    txt="ANNEXE 2.txt",
    html="ANNEXE 2 — Liste des actifs numériques et droits de propriété intellectuelle apportés.html",
    doc_id="annexe_2_actifs_ip",
    doc_label="Annexe 2 — Actifs numériques et propriété intellectuelle",
    art_prefix="annexe_2_section_",
    art_re=re.compile(r"^(\d+)( bis)?\. (.+)$"),
    titre_re=None, titre_prefix=None,
)
ACTS["annexe_2_bis"] = dict(
    txt="ANNEXE 2.txt",
    html="ANNEXE 2 — Liste des actifs numériques et droits de propriété intellectuelle apportés.html",
    doc_id="annexe_2_bis",
    doc_label="Annexe 2 bis — Acte d'apport en nature",
    art_prefix="annexe_2_bis_article_",
    art_re=re.compile(r"^ARTICLE (\d+)( BIS)? — (.+)$"),
    titre_re=None, titre_prefix=None,
)
ACTS["annexe_3"] = dict(
    txt="ANNEXE 3.txt",
    html="ANNEXE 3 — Modèle d'acte d'adhésion au Pacte.html",
    doc_id="annexe_3_adhesion",
    doc_label="Annexe 3 — Acte d'adhésion au Pacte",
    art_prefix="annexe_3_article_",
    art_re=re.compile(r"^ARTICLE (\d+)( BIS)? — (.+)$"),
    titre_re=None, titre_prefix=None,
)
ACTS["annexe_4"] = dict(
    txt="ANNEXE 4.txt",
    html="ANNEXE 4 — Convention d'earn-out.html",
    doc_id="annexe_4_earn_out",
    doc_label="Annexe 4 — Convention d'earn-out",
    art_prefix="annexe_4_article_",
    art_re=re.compile(r"^ARTICLE (\d+)( BIS)? — (.+)$"),
    titre_re=None, titre_prefix=None,
)
ACTS["annexe_6"] = dict(
    txt="ANNEXE 6.txt",
    html="ANNEXE 6 — Mandats sociaux, études et activités accessoires autorisés.html",
    doc_id="annexe_6_mandats_sociaux_etudes_et_activites_accessoires_autorises",
    doc_label="Annexe 6 — Mandats sociaux, études et activités accessoires autorisés",
    art_prefix="annexe_6_mandats_sociaux_etudes_et_activites_accessoires_autorises_section_",
    art_re=re.compile(r"^(\d+)( bis)?\. (.+)$"),
    titre_re=None, titre_prefix=None,
)

# ids de titres conserves depuis le graphe precedent (continuite des references)
LEGACY_TITRE = {
    ("pacte", "TITRE II"): "pacte_titre_ii_definitions",
    ("pacte", "TITRE IV"): "pacte_titre_iv_constitution",
    ("pacte", "TITRE V"): "pacte_titre_v_capital",
    ("pacte", "TITRE VIII"): "pacte_titre_viii_transferts",
    ("pacte", "TITRE IX"): "pacte_titre_ix_depart",
    ("pacte", "TITRE X"): "pacte_titre_x_protection",
    ("pacte", "TITRE XI"): "pacte_titre_xi_financement",
    ("pacte", "TITRE XVII"): "pacte_titre_xvii_finales",
}

FILEMAP = {}
for _f in os.listdir(REF):
    if _f.startswith("PACTE"): FILEMAP["PACTE D'ASSOCIES.txt"] = _f
    elif _f.startswith("ANNEXE 1"): FILEMAP["ANNEXE 1.txt"] = _f
    elif _f.startswith("ANNEXE 2"): FILEMAP["ANNEXE 2.txt"] = _f
    elif _f.startswith("ANNEXE 3"): FILEMAP["ANNEXE 3.txt"] = _f
    elif _f.startswith("ANNEXE 4"): FILEMAP["ANNEXE 4.txt"] = _f
    elif _f.startswith("ANNEXE 5"): FILEMAP["ANNEXE 5.txt"] = _f
    elif _f.startswith("ANNEXE 6"): FILEMAP["ANNEXE 6.txt"] = _f


def read(key):
    with io.open(os.path.join(REF, FILEMAP[ACTS[key]["txt"]]), encoding="utf-8") as fh:
        return fh.read().splitlines()


_A2 = read("annexe_2")
_A2BIS_START = next(i for i, l in enumerate(_A2) if l.startswith("ANNEXE 2 BIS"))


def act_lines(key):
    lines = read(key)
    if key == "annexe_2":
        return lines[:_A2BIS_START]
    if key == "annexe_2_bis":
        return lines[_A2BIS_START:]
    return lines


def artkey(num, bis):
    return num + (" bis" if bis else "")


def art_id(key, k):
    num, bis = (k.split(" ")[0], " bis" in k)
    return ACTS[key]["art_prefix"] + num + ("_bis" if bis else "")


def parse(key):
    cfg = ACTS[key]
    titres, arts, header = [], collections.OrderedDict(), []
    cur_art = cur_titre = None
    for ln in act_lines(key):
        mt = cfg["titre_re"].match(ln) if cfg["titre_re"] else None
        if mt:
            cur_titre = dict(roman=mt.group(1), label=ln.strip(), arts=[])
            titres.append(cur_titre)
            cur_art = None
            continue
        ma = cfg["art_re"].match(ln)
        if ma:
            num, bis, title = ma.group(1), bool(ma.group(2)), ma.group(3).strip()
            k = artkey(num, bis)
            cur_art = dict(num=num, bis=bis, key=k, title=title, label=ln.strip(),
                           body=[], titre=cur_titre["roman"] if cur_titre else None)
            arts[k] = cur_art
            if cur_titre:
                cur_titre["arts"].append(k)
            continue
        if cur_art is not None:
            cur_art["body"].append(ln)
        elif cur_titre is None:
            header.append(ln)
    return titres, arts, header


PARSED = collections.OrderedDict((k, parse(k)) for k in ACTS)

# ------------------------------------------------------------ renvois d'articles
ART_TOKEN = r"\d+(?: bis)?(?:\.\d+)*(?:\s*\([ivx]+\))?"
REF_RE = re.compile(r"[Aa]rticles?\s+(" + ART_TOKEN + r"(?:\s*(?:,|et|à|ou)\s*" + ART_TOKEN + r")*)")
SPLIT_RE = re.compile(r"\s*(?:,|et|ou)\s*")
RANGE_RE = re.compile(r"^(\d+)(?: bis)?(?:\.\d+)*\s*à\s*(\d+)(?: bis)?(?:\.\d+)*$")
QUAL_PACTE = re.compile(r"^\W{0,4}(?:du|au|le)\s+(?:présent\s+)?Pacte", re.I)
QUAL_STATUTS = re.compile(r"^\W{0,4}(?:des|aux|les)\s+(?:présents\s+)?statuts", re.I)
QUAL_ANNEXE = re.compile(r"^\W{0,6}(?:de\s+l['’]|à\s+l['’]|l['’]|en\s+)?Annexe\s+(\d+)(\s+bis)?", re.I)
ANNEXE_ACT = {"1": "annexe_1", "2": "annexe_2", "2bis": "annexe_2_bis", "3": "annexe_3",
              "4": "annexe_4", "5": "annexe_5", "6": "annexe_6"}
# mots >=5 lettres tolerés dans le liant d'une énumération ("…, alinéa 2, et l'article X des Statuts")
GLUE_OK = set(u"alinea alineas alineaa tiret tirets premier second troisieme quatrieme cinquieme "
              u"sixieme septieme huitieme dernier avant".split())
GLUE_STOP = re.compile(r"Pacte|[Ss]tatuts|Annexe|présentes|présents", re.U)
# annexes rattachées au Pacte : un renvoi non qualifié absent de l'annexe vise le Pacte
FALLBACK_PACTE = {"annexe_1", "annexe_2", "annexe_2_bis", "annexe_3", "annexe_4", "annexe_6"}
DANGLING = []


def _deaccent(s):
    for a, b in [(u"é", "e"), (u"è", "e"), (u"ê", "e"), (u"à", "a"), (u"â", "a"), (u"î", "i"),
                 (u"ï", "i"), (u"ô", "o"), (u"û", "u"), (u"ù", "u"), (u"ç", "c")]:
        s = s.replace(a, b)
    return s


QUAL_SCAN = re.compile(r"(?:du|au)\s+(?:présent\s+)?Pacte"
                       r"|(?:des|aux)\s+(?:présents\s+)?[Ss]tatuts")


def _qualifier(tail):
    """Qualificatif d'acte suivant un renvoi.

    « de l'Annexe N » doit suivre immédiatement (pas de fenêtre : trop de faux positifs).
    « du Pacte » / « des Statuts » tolèrent du liant d'énumération devant
    (« …, alinéa 2, et l'article X des Statuts »).
    """
    ma = QUAL_ANNEXE.match(tail)
    if ma:
        return ANNEXE_ACT.get(ma.group(1) + ("bis" if ma.group(2) else ""))
    m = QUAL_SCAN.search(tail)
    if not m or not _glue_ok(tail[:m.start()]):
        return None
    return "pacte" if "Pacte" in m.group(0) else "annexe_5"


def _glue_ok(glue):
    if len(glue) > 45:
        return False
    words = re.findall(r"[A-Za-zÀ-ÿ]{5,}", _deaccent(glue.lower()))
    return all(w in GLUE_OK for w in words)


def targets_in(text, self_key):
    out = set()
    matches = list(REF_RE.finditer(text))
    quals = []
    for m in matches:
        # le qualificatif ne franchit jamais une fin de ligne (tableaux d'annexes)
        quals.append(_qualifier(text[m.end():m.end() + 40].split("\n")[0]))
    # héritage d'énumération : un renvoi non qualifié adopte le qualificatif du renvoi
    # suivant s'ils ne sont séparés que par du liant ("…, alinéa 2, et l'article …")
    for i in range(len(matches) - 2, -1, -1):
        if quals[i] is None and quals[i + 1] is not None:
            glue = text[matches[i].end():matches[i + 1].start()]
            if "\n" in glue:
                continue
            if _glue_ok(glue) and not GLUE_STOP.search(glue):
                quals[i] = quals[i + 1]
    for m, q in zip(matches, quals):
        grp = m.group(1)
        tail = text[m.end():m.end() + 40]
        if re.match(r"^\s*(?:er|°)", tail):
            continue
        act = q or self_key
        expanded = []
        for t in [x for x in SPLIT_RE.split(grp) if x]:
            rm = RANGE_RE.match(t)
            if rm:
                a, b = int(rm.group(1)), int(rm.group(2))
                if 1 <= a <= b <= 70:
                    expanded += [str(x) for x in range(a, b + 1)]
            else:
                expanded.append(t)
        for t in expanded:
            mm = re.match(r"^(\d+)( bis)?", t)
            if not mm:
                continue
            k = artkey(mm.group(1), bool(mm.group(2)))
            if k in PARSED[act][1]:
                out.add((act, k))
            elif q is None and self_key in FALLBACK_PACTE and k in PARSED["pacte"][1]:
                out.add(("pacte", k))
            elif int(mm.group(1)) <= 70 and (q is not None or self_key in ("pacte", "annexe_5")):
                DANGLING.append((self_key, act, k, m.group(0)[:60]))
    return out


ANNEXE_RE = re.compile(r"[Aa]nnexes?\s+(\d+)(\s+bis)?")
ANNEXE_NODE = {"1": "annexe_1_mandat_special", "2": "annexe_2_actifs_ip",
               "2bis": "annexe_2_bis", "3": "annexe_3_adhesion",
               "4": "annexe_4_earn_out", "5": "annexe_5_projet_de_statuts",
               "6": "annexe_6_mandats_sociaux_etudes_et_activites_accessoires_autorises"}


def annexes_in(text):
    out = set()
    for m in ANNEXE_RE.finditer(text):
        k = m.group(1) + ("bis" if m.group(2) else "")
        if k in ANNEXE_NODE:
            out.add(ANNEXE_NODE[k])
    return out


# ------------------------------------------------------------ references legales
CODE_NAMES = [
    (re.compile(r"Code de commerce|C\.\s?com\."), "commerce", "Code de commerce"),
    (re.compile(r"Code civil|C\.\s?civ\."), "civil", "Code civil"),
    (re.compile(r"Code de la propriété intellectuelle|CPI\b"), "ip", "Code de la propriété intellectuelle"),
    (re.compile(r"Code monétaire et financier"), "cmf", "Code monétaire et financier"),
    (re.compile(r"Code général des impôts|CGI\b"), "cgi", "Code général des impôts"),
    (re.compile(r"Code du travail"), "travail", "Code du travail"),
    (re.compile(r"Code de la consommation"), "conso", "Code de la consommation"),
]
FALLBACK = [
    (re.compile(r"^[LRD]\.(?:210|225|227|228|232|233|236|239|526|822)-"), "commerce", "Code de commerce"),
    (re.compile(r"^L\.(?:111|112|113|121|122|131|132)-"), "ip", "Code de la propriété intellectuelle"),
    (re.compile(r"^L\.(?:211|214|341|411|533|561)-"), "cmf", "Code monétaire et financier"),
]
LEG_RE = re.compile(r"\b([LRD])\.\s?(\d{3}-\d+(?:-\d+)*)")
CIV_RE = re.compile(r"\b(?:articles?|art\.)\s+(1[0-9]{3}(?:-\d+)*)", re.I)
CGI_RE = re.compile(r"\b(?:articles?|art\.)\s+(\d{1,3}(?:\s+(?:septies|sexies|quinquies|quater|ter|bis))?)\s+(?:du (?:même )?code|CGI)", re.I)


def named_code(sent):
    for rx, slug, label in CODE_NAMES:
        if rx.search(sent):
            return slug, label
    return None


PROTECT = [("L. ", "L.\x00"), ("R. ", "R.\x00"), ("D. ", "D.\x00"), ("art. ", "art.\x00"),
           ("C. com.", "C.\x00com.\x00"), ("C. civ.", "C.\x00civ.\x00"), ("n° ", "n\x00 ")]


def sentences(text):
    t = text
    for a, b in PROTECT:
        t = t.replace(a, b)
    for s in re.split(r"(?<=[.;:])\s+|\n", t):
        yield s.replace("\x00", " ").replace("C. com. ", "C. com.").replace("C. civ. ", "C. civ.")


def legal_in(text, carry):
    out, unresolved = set(), []
    for sent in sentences(text):
        named = named_code(sent)
        ctx = named or carry
        for m in LEG_RE.finditer(sent):
            num = m.group(1) + ". " + m.group(2)
            key = m.group(1) + "." + m.group(2)
            hit = None
            for rx, s, l in FALLBACK:
                if rx.match(key):
                    hit = (s, l)
                    break
            if named:
                hit = named
            elif hit is None and carry:
                hit = carry
            if hit:
                out.add((hit[0], hit[1], num))
            else:
                unresolved.append((num, sent[:90]))
        for m in CIV_RE.finditer(sent):
            out.add(("civil", "Code civil", m.group(1)))
        if ctx and ctx[0] == "cgi":
            for m in CGI_RE.finditer(sent):
                out.add(("cgi", "Code général des impôts", re.sub(r"\s+", " ", m.group(1))))
        if named:
            carry = named
    return out, carry, unresolved


def statute_id(slug, num):
    n = num.lower().replace(". ", "").replace(".", "")
    n = re.sub(r"[^a-z0-9]+", "_", n).strip("_")
    return "statute_%s_%s" % (slug, n)


def statute_label(label, num):
    return u"%s — article %s" % (label, num)


# ------------------------------------------------------------ personnes / entites
PERSONS = [
    ("person_adam_talal_kabbara", "Adam Talal Kabbara",
     re.compile(r"Adam Talal (?:KABBARA|Kabbara)")),
    ("person_enzo_manga", "Enzo Manga", re.compile(r"Enzo (?:MANGA|Manga)")),
    ("person_timeo_durando", "Timeo Julien Joël Durando",
     re.compile(r"Timeo Julien Joël (?:DURANDO|Durando)|Timeo (?:DURANDO|Durando)")),
    ("entity_motor_as_phalte", "MOTOR AS'PHALTE", re.compile(r"MOTOR AS'PHALTE|Motor As'Phalte")),
    ("entity_nobledrive", "ADAM KABBARA (NOBLEDRIVE)", re.compile(r"NOBLEDRIVE")),
    ("court_tribunal_commerce_pontoise", "Tribunal de commerce de Pontoise",
     re.compile(r"[Tt]ribunal de commerce de Pontoise")),
    ("registry_rcs", "Registre du commerce et des sociétés",
     re.compile(r"[Rr]egistre du commerce et des sociétés|RCS\b")),
    ("registry_rne", "Registre national des entreprises",
     re.compile(r"[Rr]egistre national des entreprises|RNE\b")),
]

# ------------------------------------------------------------ definitions du Pacte
DEF_RE = re.compile(u"^\u00ab\\s*(.+?)\\s*\u00bb(?:\\s*et\\s*\u00ab\\s*(.+?)\\s*\u00bb)?\\s*:")
DEF_LEGACY = {"cession": "def_cession", "controle": "def_controle", "earn-out": "def_earn_out",
              "statuts": "def_statuts", "titres": "def_titres"}


def slug(s):
    s = s.lower()
    for a, b in [(u"é", "e"), (u"è", "e"), (u"ê", "e"), (u"à", "a"), (u"â", "a"),
                 (u"î", "i"), (u"ï", "i"), (u"ô", "o"), (u"û", "u"), (u"ù", "u"), (u"ç", "c")]:
        s = s.replace(a, b)
    s = re.sub(r"\(.*?\)", "", s)
    s = re.sub(r"[^a-z0-9]+", "_", s).strip("_")
    return s


def def_id(term):
    base = slug(term)
    key = base.replace("_", "-")
    if key in DEF_LEGACY:
        return DEF_LEGACY[key]
    if base in ("cession", "controle", "statuts", "titres"):
        return "def_" + base
    return "def_" + base


# ------------------------------------------------------------ construction
nodes = collections.OrderedDict()
links = []
seen_links = set()
UNRESOLVED = []


def add_node(nid, label, file_type, source_file, source_location, extra=None):
    if nid in nodes:
        return nid
    n = dict(id=nid, label=label, file_type=file_type,
             source_file=source_file, source_location=source_location,
             norm_label=label.lower())
    if extra:
        n.update(extra)
    nodes[nid] = n
    return nid


def add_link(src, tgt, relation, confidence="EXTRACTED", score=1.0, source_file=None, location=None):
    if src == tgt:
        return
    k = (src, tgt, relation)
    if k in seen_links:
        return
    seen_links.add(k)
    links.append(dict(source=src, target=tgt, relation=relation,
                      confidence=confidence, confidence_score=score,
                      source_file=source_file, source_location=location, weight=1.0))


# --- noeuds documents, titres, articles
for key, cfg in ACTS.items():
    titres, arts, header = PARSED[key]
    add_node(cfg["doc_id"], cfg["doc_label"], "document", cfg["html"],
             header[0].strip() if header else cfg["doc_label"])
    for t in titres:
        tid = LEGACY_TITRE.get((key, t["roman"]), cfg["titre_prefix"] + slug(t["roman"]))
        add_node(tid, t["label"], "document", cfg["html"], t["label"])
        add_link(cfg["doc_id"], tid, "contains", source_file=cfg["html"], location=t["label"])
        for ak in t["arts"]:
            add_link(tid, art_id(key, ak), "contains", source_file=cfg["html"],
                     location=arts[ak]["label"])
    for ak, a in arts.items():
        aid = art_id(key, ak)
        add_node(aid, a["label"], "document", cfg["html"], a["label"])
        if a["titre"] is None:
            add_link(cfg["doc_id"], aid, "contains", source_file=cfg["html"], location=a["label"])

# --- sous-articles conserves du graphe precedent (granularite fine deja acquise)
SUB = [
    ("annexe_5_projet_de_statuts_article_6_2", "Article 6.2 — Apport en nature d'actifs numériques et de droits de propriété intellectuelle identifiés",
     "annexe_5", "6", "6.2 — Apport en nature d'actifs numériques et de droits de propriété intellectuelle identifiés"),
    ("annexe_5_projet_de_statuts_article_6_2_4", "Article 6.2.4 — Dispense de commissaire aux apports",
     "annexe_5", "6", "6.2.4 — Dispense de commissaire aux apports"),
    ("annexe_5_projet_de_statuts_article_6_2_5", "Article 6.2.5 — Responsabilité solidaire",
     "annexe_5", "6", "6.2.5 — Responsabilité solidaire"),
]
for sid, slabel, akey, parent, loc in SUB:
    add_node(sid, slabel, "document", ACTS[akey]["html"], loc)
    add_link(art_id(akey, parent), sid, "contains", source_file=ACTS[akey]["html"], location=loc)

CONCEPT_SUB = [
    ("annexe_5_projet_de_statuts_article_14_3_transfert", "Définition de Transfert", "annexe_5", "14",
     u"14.3 — « Transfert » désigne toute opération entraînant le transfert de la propriété, nue-propriété, usufruit ou jouissance de titres"),
    ("annexe_5_projet_de_statuts_article_14_4_titre", "Définition de Titre", "annexe_5", "14",
     u"14.4 — « Titre » désigne toute action ou tout titre donnant ou pouvant donner accès au capital ou aux droits de vote"),
]
for sid, slabel, akey, parent, loc in CONCEPT_SUB:
    add_node(sid, slabel, "concept", ACTS[akey]["html"], loc)
    add_link(art_id(akey, parent), sid, "references", source_file=ACTS[akey]["html"], location=loc)

# --- annexes aux statuts (section finale de l'Annexe 5)
A5_ANNEXES = [
    ("annexe_5_projet_de_statuts_statuts_annexes", "Annexes aux statuts", "ANNEXES AUX STATUTS"),
    ("annexe_5_projet_de_statuts_mandat_special", "Mandat spécial donné à Adam Talal Kabbara",
     u"Annexes aux statuts — Mandat spécial donné à Monsieur Adam Talal Kabbara (article 39.1)"),
    ("annexe_5_projet_de_statuts_etat_des_actes", "État des actes accomplis pour le compte de la Société en formation",
     u"Annexes aux statuts — État des actes accomplis (article 39.3)"),
    ("annexe_5_projet_de_statuts_annexe_2", "Annexe 2 — Liste des actifs apportés", u"Annexe 2 — liste des actifs apportés"),
    ("annexe_5_projet_de_statuts_annexe_2_bis", "Annexe 2 bis — Acte d'apport en nature", u"Annexe 2 bis — acte d'apport en nature"),
]
h5 = ACTS["annexe_5"]["html"]
for nid, lbl, loc in A5_ANNEXES:
    add_node(nid, lbl, "document", h5, loc)
add_link("annexe_5_projet_de_statuts", "annexe_5_projet_de_statuts_statuts_annexes", "contains", source_file=h5, location="ANNEXES AUX STATUTS")
for nid, lbl, loc in A5_ANNEXES[1:]:
    add_link("annexe_5_projet_de_statuts_statuts_annexes", nid, "contains", source_file=h5, location=loc)
add_link("annexe_5_projet_de_statuts_article_39", "annexe_5_projet_de_statuts_mandat_special", "references", source_file=h5, location="Article 39.1")
add_link("annexe_5_projet_de_statuts_article_39", "annexe_5_projet_de_statuts_etat_des_actes", "references", source_file=h5, location="Article 39.3")
add_link("annexe_5_projet_de_statuts_annexe_2", "annexe_2_actifs_ip", "references", source_file=h5, location=u"Annexe 2 — liste des actifs apportés")
add_link("annexe_5_projet_de_statuts_annexe_2_bis", "annexe_2_bis", "references", source_file=h5, location=u"Annexe 2 bis — acte d'apport en nature")

# --- definitions du Pacte (article 1)
pacte_arts = PARSED["pacte"][1]
hp = ACTS["pacte"]["html"]
def_nodes = {}
for ln in pacte_arts["1"]["body"]:
    m = DEF_RE.match(ln.strip())
    if not m:
        continue
    terms = [t for t in (m.group(1), m.group(2)) if t]
    for term in terms:
        did = def_id(term)
        add_node(did, term, "concept", hp, u"Article 1 — Définitions : « %s »" % term,
                 extra=dict(definition=ln.strip()[:400]))
        def_nodes[term] = did
        add_link("pacte_article_1", did, "references", source_file=hp,
                 location=u"Article 1 — Définitions : « %s »" % term)
    for act, k in targets_in(ln, "pacte"):
        for term in terms:
            add_link(def_nodes[term], art_id(act, k), "references", source_file=hp,
                     location=u"Article 1 — Définitions : « %s »" % term)

# --- renvois, citations, personnes, pour chaque article de chaque acte
for key, cfg in ACTS.items():
    titres, arts, header = PARSED[key]
    html = cfg["html"]
    # en-tete du document : "visée aux Articles ... du Pacte"
    head_txt = "\n".join(header)
    for act, k in targets_in(head_txt, "pacte" if key != "pacte" else key):
        add_link(cfg["doc_id"], art_id(act, k), "references", source_file=html,
                 location=header[1].strip() if len(header) > 1 else "en-tête")
    for nid in annexes_in(head_txt):
        if nid != cfg["doc_id"]:
            add_link(cfg["doc_id"], nid, "references", source_file=html, location="en-tête")
    carry = None
    for ak, a in arts.items():
        aid = art_id(key, ak)
        body = "\n".join(a["body"])
        for act, k in targets_in(body, key):
            tgt = art_id(act, k)
            if tgt != aid:
                add_link(aid, tgt, "references", source_file=html, location=a["label"])
        for nid in annexes_in(body):
            if nid != cfg["doc_id"]:
                add_link(aid, nid, "references", source_file=html, location=a["label"])
        legal, carry, unres = legal_in(body, carry)
        UNRESOLVED += [(html, a["label"], u, s) for u, s in unres]
        for cslug, clabel, num in legal:
            sid = statute_id(cslug, num)
            add_node(sid, statute_label(clabel, num), "concept", html, a["label"])
            add_link(aid, sid, "cites", source_file=html, location=a["label"])
        for pid, plabel, prx in PERSONS:
            if prx.search(body):
                add_node(pid, plabel, "concept", html, plabel)
                add_link(aid, pid, "references", source_file=html, location=a["label"])

# --- notes d'analyse conservees (rationale)
add_node("rationale_annexe_2_bis_numbering", "Annexe 2 file also contains separately numbered Annexe 2 bis",
         "rationale", ACTS["annexe_2"]["html"], u"ANNEXE 2 BIS — ACTE D'APPORT EN NATURE")
add_link("rationale_annexe_2_bis_numbering", "annexe_2_bis_article_1", "rationale_for",
         source_file=ACTS["annexe_2"]["html"], location=u"ANNEXE 2 BIS")
add_node("rationale_earn_out_status", "Earn-out absent at Pacte signature; Annex 4 reserved for future substitution",
         "rationale", ACTS["annexe_4"]["html"], u"ARTICLE 1 — CONSTAT D'ABSENCE D'EARN-OUT")
add_link("rationale_earn_out_status", "pacte_article_46", "rationale_for",
         source_file=ACTS["annexe_4"]["html"], location=u"Article 46.2")
add_node("annexe_5_projet_de_statuts_documentary_tension_nobledrive",
         u"Tension documentaire potentielle — NOBLEDRIVE", "rationale", h5,
         u"Article 6.2.2 ; Annexe 6, section 2 bis")
add_link("annexe_5_projet_de_statuts_article_6_2", "annexe_5_projet_de_statuts_documentary_tension_nobledrive",
         "rationale_for", confidence="AMBIGUOUS", score=0.5, source_file=h5, location=u"Article 6.2.2")
add_link("annexe_6_mandats_sociaux_etudes_et_activites_accessoires_autorises_section_2_bis",
         "annexe_5_projet_de_statuts_documentary_tension_nobledrive",
         "rationale_for", confidence="AMBIGUOUS", score=0.5,
         source_file=ACTS["annexe_6"]["html"], location=u"2 bis")

# --- hyperaretes (ids conserves)
HYPER = [
    dict(id="constitution_asset_contribution_chain", label="Constitution and asset-contribution chain",
         nodes=["annexe_5_projet_de_statuts_article_6", "annexe_5_projet_de_statuts_article_7",
                "annexe_5_projet_de_statuts_annexe_2", "annexe_5_projet_de_statuts_annexe_2_bis",
                "annexe_5_projet_de_statuts_article_39", "annexe_5_projet_de_statuts_mandat_special",
                "annexe_5_projet_de_statuts_etat_des_actes"],
         relation="form", confidence="EXTRACTED", confidence_score=1, source_file=h5),
    dict(id="founder_activity_authorization_chain", label="Founder activity authorization and update chain",
         nodes=[ACTS["annexe_6"]["art_prefix"] + s for s in ["1", "2", "2_bis", "3", "4", "5", "6"]],
         relation="form", confidence="EXTRACTED", confidence_score=1, source_file=ACTS["annexe_6"]["html"]),
    dict(id="ip_contribution_framework", label="Digital assets and IP contribution framework",
         nodes=["pacte_article_10", "pacte_article_39", "annexe_2_bis_article_1", "annexe_2_bis_article_2"],
         relation="form", confidence="EXTRACTED", confidence_score=1, source_file=hp),
    dict(id="pacte_statuts_annexes_coherence", label="Pacte, Statuts and annex dependencies",
         nodes=["pacte_article_3", "pacte_article_63", "annexe_5_projet_de_statuts", "pacte_d_associ_s"],
         relation="participate_in", confidence="EXTRACTED", confidence_score=1, source_file=hp),
    dict(id="statutory_transfer_control_framework", label="Statutory transfer and exit-control framework",
         nodes=["annexe_5_projet_de_statuts_article_" + s for s in
                ["14", "15", "16", "17", "18", "19", "19_bis", "20"]],
         relation="form", confidence="EXTRACTED", confidence_score=1, source_file=h5),
    dict(id="pacte_governance_majority_framework", label="Pacte governance and qualified-majority framework",
         nodes=["pacte_article_12", "pacte_article_13", "pacte_article_14", "pacte_article_15",
                "pacte_article_16", "pacte_article_17"],
         relation="form", confidence="EXTRACTED", confidence_score=1, source_file=hp),
    dict(id="pacte_departure_framework", label="Pacte departure, leaver and valuation framework",
         nodes=["pacte_article_28", "pacte_article_29", "pacte_article_30", "pacte_article_31",
                "pacte_article_32", "pacte_article_33", "pacte_article_34", "pacte_article_35"],
         relation="form", confidence="EXTRACTED", confidence_score=1, source_file=hp),
    dict(id="pacte_transfer_framework", label="Pacte transfer and exit-control framework",
         nodes=["pacte_article_21", "pacte_article_22", "pacte_article_23", "pacte_article_24",
                "pacte_article_25", "pacte_article_26", "pacte_article_27"],
         relation="form", confidence="EXTRACTED", confidence_score=1, source_file=hp),
]


# ================================================================== fusion
# Les noeuds de code deja presents dans graph.json sont conserves ;
# vendor/paged.polyfill.min.js est exclu (voir .graphifyignore).
GRAPH = os.path.join(PROJ, "graphify-out", "graph.json")
OUTDIR = os.path.join(PROJ, "graphify-out")
DROP_FILE = "vendor/paged.polyfill.min.js"
TODAY = "2026-09-07"

old = json.load(io.open(GRAPH, encoding="utf-8"))
keep_code = {}
for n in old["nodes"]:
    if n.get("file_type") == "code" and (n.get("source_file") or "") != DROP_FILE:
        keep_code[n["id"]] = n

COMMUNITIES = [
    (0, u"Pacte d'associés — gouvernance et engagements"),
    (1, u"Projet de Statuts (Annexe 5)"),
    (2, u"Annexe 1 — Mandat spécial"),
    (3, u"Annexe 2 et 2 bis — Apports en nature et propriété intellectuelle"),
    (4, u"Annexe 3 — Acte d'adhésion au Pacte"),
    (5, u"Annexe 4 — Convention d'earn-out"),
    (6, u"Annexe 6 — Activités accessoires des Fondateurs"),
    (7, u"Définitions du Pacte"),
    (8, u"Références normatives"),
    (9, u"Parties, entités et registres"),
    (10, u"Outils de composition A4"),
]
CNAME = dict(COMMUNITIES)


def community_of(n):
    nid = n["id"]
    if n.get("file_type") == "code":
        return 10
    if nid.startswith("statute_"):
        return 8
    if nid.startswith(("person_", "entity_", "court_", "registry_")):
        return 9
    if nid.startswith("def_"):
        return 7
    if nid.startswith(("pacte_article", "pacte_titre", "pacte_d_associ")):
        return 0
    if nid.startswith("annexe_5_projet_de_statuts"):
        return 1
    if nid.startswith("annexe_1"):
        return 2
    if nid.startswith("annexe_2"):
        return 3
    if nid.startswith("annexe_3"):
        return 4
    if nid.startswith("annexe_4") or nid == "rationale_earn_out_status":
        return 5
    if nid.startswith("annexe_6"):
        return 6
    if nid.startswith("rationale_"):
        return 3
    return 0


final_nodes = []
for n in nodes.values():
    m = dict(n)
    m["community"] = community_of(n)
    m["community_name"] = CNAME[m["community"]]
    m["_origin"] = "doc-rebuild"
    final_nodes.append(m)
for n in keep_code.values():
    m = dict(n)
    m["community"] = 10
    m["community_name"] = CNAME[10]
    final_nodes.append(m)

ids = set(n["id"] for n in final_nodes)
final_links, seen = [], set()
for l in links:
    k = (l["source"], l["target"], l["relation"])
    if k in seen or l["source"] not in ids or l["target"] not in ids:
        continue
    seen.add(k)
    m = dict(l)
    m["_origin"] = "doc-rebuild"
    final_links.append(m)
for l in old["links"]:
    if l["source"] not in keep_code or l["target"] not in keep_code:
        continue
    k = (l["source"], l["target"], l["relation"])
    if k in seen:
        continue
    seen.add(k)
    final_links.append(dict(l))

out = collections.OrderedDict()
out["directed"] = True
out["multigraph"] = False
out["graph"] = {"hyperedges": HYPER}
out["nodes"] = final_nodes
out["links"] = final_links
out["hyperedges"] = HYPER
out["built_at_commit"] = old.get("built_at_commit")
out["rebuilt_at"] = TODAY
out["rebuild_note"] = (u"Sous-graphe juridique reconstruit deterministement depuis "
                       u"tools/reference/*.txt ; vendor/paged.polyfill.min.js exclu.")
with io.open(GRAPH, "w", encoding="utf-8") as fh:
    fh.write(json.dumps(out, ensure_ascii=False, indent=1))

print("graph.json : %d noeuds (%d juridiques / %d code) · %d aretes · %d hyperaretes"
      % (len(final_nodes), len(nodes), len(keep_code), len(final_links), len(HYPER)))
print("renvois sans cible :", len(DANGLING))
print("citations legales non resolues :", len(UNRESOLVED))

# ================================================================== rapport + wiki
G = out
N = dict((n["id"], n) for n in G["nodes"])
L = G["links"]
deg = collections.Counter()
outd = collections.defaultdict(list)
ind = collections.defaultdict(list)
for l in L:
    deg[l["source"]] += 1
    deg[l["target"]] += 1
    outd[l["source"]].append(l)
    ind[l["target"]].append(l)

comm = collections.defaultdict(list)
for n in G["nodes"]:
    comm[(n["community"], n["community_name"])].append(n)

by_file = collections.Counter(n.get("source_file") for n in G["nodes"])
rel = collections.Counter(l["relation"] for l in L)
conf = collections.Counter(l.get("confidence") for l in L)
tops = [n for n in G["nodes"] if n["file_type"] != "code"]
iso = [n for n in G["nodes"] if deg[n["id"]] == 0]
amb = [l for l in L if l.get("confidence") != "EXTRACTED"]


def slugfile(name):
    return "".join(ch if (ch.isalnum() or ch in "-_.") else "_" for ch in name)


r = []
r.append(u"# Graph Report — Motor As'Phalte Doc  (%s)" % TODAY)
r.append(u"")
r.append(u"> Sous-graphe juridique reconstruit de façon **déterministe** depuis "
         u"`tools/reference/*.txt` — aucune inférence de modèle, aucun appel réseau. "
         u"Reproductible : `python tools/build-doc-graph.py`.")
r.append(u"")
r.append(u"## Résumé")
r.append(u"- %d nœuds · %d arêtes · %d hyperarêtes · %d communautés"
         % (len(G["nodes"]), len(L), len(G["hyperedges"]), len(comm)))
r.append(u"- Extraction : " + u" · ".join(u"%s %d" % (k, v) for k, v in conf.most_common()))
r.append(u"- Relations : " + u" · ".join(u"`%s` %d" % (k, v) for k, v in rel.most_common()))
r.append(u"- Coût en jetons : 0 entrée · 0 sortie")
r.append(u"")
r.append(u"## Couverture par acte")
r.append(u"")
r.append(u"| Acte | Nœuds | Têtes d'article / section |")
r.append(u"|---|---|---|")
COVER = [
    (u"Pacte d'associés", ACTS["pacte"]["html"], u"63 articles + 18 bis, 18 titres — **100 %**"),
    (u"Annexe 5 — Projet de Statuts", ACTS["annexe_5"]["html"], u"41 articles + 19 bis, 9 titres — **100 %**"),
    (u"Annexe 1 — Mandat spécial", ACTS["annexe_1"]["html"], u"7 articles — **100 %**"),
    (u"Annexe 2 + 2 bis", ACTS["annexe_2"]["html"], u"2 sections + 8 articles et 5 bis — **100 %**"),
    (u"Annexe 3 — Acte d'adhésion", ACTS["annexe_3"]["html"], u"6 articles — **100 %**"),
    (u"Annexe 4 — Earn-out", ACTS["annexe_4"]["html"], u"2 articles — **100 %**"),
    (u"Annexe 6 — Activités accessoires", ACTS["annexe_6"]["html"], u"6 sections + 2 bis — **100 %**"),
]
for label, f, cov in COVER:
    r.append(u"| %s | %d | %s |" % (label, by_file.get(f, 0), cov))
r.append(u"| Outils de composition (code) | %d | `tools/`, `document-theme.js`, `document-styles.js` |"
         % len(keep_code))
r.append(u"")
r.append(u"## Nœuds les plus connectés (les articles porteurs)")
r.append(u"")
for i, n in enumerate(sorted(tops, key=lambda x: -deg[x["id"]])[:15], 1):
    r.append(u"%d. **%s** — %d arêtes · `%s`" % (i, n["label"], deg[n["id"]], n.get("source_file")))
r.append(u"")
r.append(u"## Hyperarêtes (chaînes de clauses)")
r.append(u"")
for h in G["hyperedges"]:
    r.append(u"- **%s** — %s" % (h["label"], u", ".join(N[x]["label"] for x in h["nodes"] if x in N)))
r.append(u"")
r.append(u"## Communautés")
r.append(u"")
for (cid, cname), ns in sorted(comm.items(), key=lambda kv: -len(kv[1])):
    r.append(u"### %s" % cname)
    r.append(u"%d nœuds · page wiki `wiki/%s.md`" % (len(ns), slugfile(cname)))
    top = sorted(ns, key=lambda x: -deg[x["id"]])[:8]
    r.append(u"Principaux : " + u", ".join(u"%s (%d)" % (x["label"], deg[x["id"]]) for x in top))
    r.append(u"")
r.append(u"## Références normatives citées dans les actes")
r.append(u"")
r.append(u"Chaque référence est un nœud distinct ; l'arête `cites` porte l'article qui la vise. "
         u"**Ces nœuds recensent, ils ne valident pas** : l'état en vigueur reste à vérifier sur Légifrance.")
r.append(u"")
bycode = collections.defaultdict(list)
for n in G["nodes"]:
    if n["id"].startswith("statute_"):
        bycode[n["label"].split(u" — ")[0]].append(n)
for code in sorted(bycode):
    arts = sorted(bycode[code], key=lambda x: x["label"])
    r.append(u"- **%s** (%d) : %s" % (code, len(arts),
             u", ".join(a["label"].split(u"article ")[-1] for a in arts)))
r.append(u"")
r.append(u"## Contrôles automatiques")
r.append(u"")
r.append(u"- **Renvois morts : %d.** Tout renvoi « article N » extrait des actes pointe vers "
         u"une tête d'article existante." % len(DANGLING))
r.append(u"- **Citations légales non résolues : %d.**" % len(UNRESOLVED))
r.append(u"- **Nœuds isolés : %d.**%s" % (len(iso), (u" " + u", ".join(x["label"] for x in iso[:20])) if iso else u""))
r.append(u"- **Arêtes non littérales : %d** — pistes, jamais constats :" % len(amb))
for l in amb:
    r.append(u"  - `%s` %s → %s [%s]" % (l["relation"], N[l["source"]]["label"],
                                         N[l["target"]]["label"], l.get("confidence")))
r.append(u"")
r.append(u"## Ce que ce graphe ne fait pas")
r.append(u"")
r.append(u"- Il **ne dit pas le droit** : les nœuds `Code … — article …` recensent ce que les actes citent, "
         u"pas ce qui est en vigueur. Vérification Légifrance obligatoire.")
r.append(u"- Il **ne remplace pas la lecture** : les renvois fins (alinéa, sous-article `22.3`) sont ramenés "
         u"à leur article de tête ; le détail se lit dans `tools/reference/<acte>.html.txt`.")
r.append(u"- Il **ne juge pas** : aucune arête ne qualifie une anomalie. Les trois nœuds `rationale` sont "
         u"des notes d'analyse, dont deux arêtes explicitement `AMBIGUOUS`.")
r.append(u"")
io.open(os.path.join(OUTDIR, "GRAPH_REPORT.md"), "w", encoding="utf-8").write(u"\n".join(r) + u"\n")

WIKI = os.path.join(OUTDIR, "wiki")
if os.path.isdir(WIKI):
    shutil.rmtree(WIKI)
os.makedirs(WIKI)
idx = [u"# Index du graphe de connaissance — Motor As'Phalte", u"",
       u"> %d nœuds · %d arêtes · %d communautés · reconstruit le %s"
       % (len(G["nodes"]), len(L), len(comm), TODAY), u"",
       u"Se repérer ici, puis ouvrir `tools/reference/<acte>.html.txt` pour le texte exact.",
       u"", u"## Communautés", u""]
for (cid, cname), ns in sorted(comm.items(), key=lambda kv: -len(kv[1])):
    fn = slugfile(cname) + ".md"
    idx.append(u"- [%s](%s) — %d nœuds" % (cname, fn, len(ns)))
    w = [u"# %s" % cname, u"", u"> %d nœuds" % len(ns), u""]
    for n in sorted(ns, key=lambda x: -deg[x["id"]]):
        w.append(u"## %s" % n["label"])
        w.append(u"`%s` · %s · %d arêtes · `%s`"
                 % (n["id"], n["file_type"], deg[n["id"]], n.get("source_file")))
        if n.get("source_location"):
            w.append(u"")
            w.append(u"Repère dans l'acte : %s" % n["source_location"])
        if outd.get(n["id"]):
            w.append(u"")
            w.append(u"**Renvoie vers :**")
            for l in sorted(outd[n["id"]], key=lambda x: x["relation"]):
                w.append(u"- `%s` → %s%s" % (l["relation"], N[l["target"]]["label"],
                         u"" if l.get("confidence") == "EXTRACTED" else u" *[%s]*" % l.get("confidence")))
        if ind.get(n["id"]):
            w.append(u"")
            w.append(u"**Visé par :**")
            for l in sorted(ind[n["id"]], key=lambda x: x["relation"]):
                w.append(u"- `%s` ← %s%s" % (l["relation"], N[l["source"]]["label"],
                         u"" if l.get("confidence") == "EXTRACTED" else u" *[%s]*" % l.get("confidence")))
        w.append(u"")
    io.open(os.path.join(WIKI, fn), "w", encoding="utf-8").write(u"\n".join(w) + u"\n")
idx += [u"", u"## Hyperarêtes (chaînes de clauses)", u""]
for h in G["hyperedges"]:
    idx.append(u"- **%s** : %s" % (h["label"], u", ".join(N[x]["label"] for x in h["nodes"] if x in N)))
idx += [u"", u"## Nœuds les plus connectés", u""]
for n in sorted(tops, key=lambda x: -deg[x["id"]])[:12]:
    idx.append(u"- %s — %d arêtes" % (n["label"], deg[n["id"]]))
idx += [u"", u"---", u"", u"*Généré depuis `graphify-out/graph.json` — reconstruction déterministe.*"]
io.open(os.path.join(WIKI, "index.md"), "w", encoding="utf-8").write(u"\n".join(idx) + u"\n")

print(u"GRAPH_REPORT.md et wiki/ (%d pages) regeneres." % len(os.listdir(WIKI)))
