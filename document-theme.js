/* =============================================================================
   MOTOR AS'PHALTE — Moteur de composition documentaire
   -----------------------------------------------------------------------------
   Ce script ne modifie JAMAIS le texte juridique. Il ne fait que :
     · regrouper les éléments existants dans des conteneurs sémantiques
       (page de garde, TITRES, articles, page de signatures) ;
     · ajouter des métadonnées éditoriales explicitement autorisées
       (en-tête, pied de page, pagination, table des matières) ;
     · classer les blocs selon leur hauteur réelle mesurée avant pagination,
       afin de placer « break-inside: avoid » au bon niveau et nulle part ailleurs ;
     · protéger contre une césure fautive certains segments (montants,
       pourcentages, références légales) en les enveloppant caractère pour
       caractère dans un <span class="nowrap"> ;
     · piloter le moteur de pagination Paged.js.

   Sans JavaScript, le document reste intégralement lisible et imprimable :
   document-theme.css contient une configuration @page complète et des cartouches
   de repli que Chromium répète sur chaque page.
   ============================================================================= */

/* Le polyfill de pagination ne doit pas démarrer seul : la composition doit
   d'abord être préparée. Cette affectation doit précéder son chargement. */
window.PagedConfig = window.PagedConfig || {};
window.PagedConfig.auto = false;

(() => {
  "use strict";

  const root = document.documentElement;
  const THEME_KEY = "motor-asphalte-document-theme";
  const VIEW_KEY = "motor-asphalte-document-view";

  /* Largeur d'écran en dessous de laquelle l'aperçu A4 n'est pas proposé
     par défaut (lecture confortable sur mobile). */
  const PAGED_MIN_WIDTH = 900;

  /* Un bloc dont la hauteur ne dépasse pas cette fraction de la hauteur utile
     d'une page est déclaré insécable. Le seuil EST le blanc maximal que la
     règle peut produire : au-delà, il vaut mieux une coupure maîtrisée entre
     deux paragraphes qu'une page à moitié vide (§37 et §38).
     Un tableau fait exception : il doit rester d'un seul tenant dès lors qu'il
     peut tenir sur une page (§11). */
  const KEEP_TOGETHER_RATIO = 0.45;
  const PART_KEEP_RATIO = 0.4;
  const TABLE_WHOLE_RATIO = 0.92;
  const SIGNATURE_KEEP_RATIO = 0.92;

  /* Hauteur utile d'une page courante : 297 − 24 (haut) − 20 (bas). */
  const CONTENT_HEIGHT_MM = 253;
  const CONTENT_WIDTH_MM = 154;

  /* Longueur minimale, en pages estimées (mesure en flux continu, donc
     minorée), pour qu'une page de signatures dédiée se justifie. */
  const SIGNATURE_PAGE_THRESHOLD = 3;

  const SIGNATURE_RE = /^\s*(?:TITRE\s+[IVXLCDM]+\s*[—–-]\s*)?SIGNATURES?\s*$/i;
  const NOTICE_RE = /^Le présent document constitue un projet de travail/;

  /* ---------------------------------------------------------------------------
     Utilitaires
     ------------------------------------------------------------------------ */

  const text = (node) => (node && node.textContent ? node.textContent.trim() : "");

  const slug = (value, fallback) => {
    const base = String(value)
      .normalize("NFD")
      .replace(/[̀-ͯ]/g, "")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 60);
    return base || fallback;
  };

  const uniqueId = (() => {
    const used = new Set();
    return (base) => {
      let id = base;
      let n = 2;
      while (!id || used.has(id) || document.getElementById(id)) {
        id = `${base}-${n}`;
        n += 1;
      }
      used.add(id);
      return id;
    };
  })();

  const el = (tag, className, attrs) => {
    const node = document.createElement(tag);
    if (className) node.className = className;
    if (attrs) Object.keys(attrs).forEach((k) => node.setAttribute(k, attrs[k]));
    return node;
  };

  const editorial = (node) => {
    node.setAttribute("data-editorial", "true");
    return node;
  };

  const escapeCss = (value) =>
    String(value).replace(/\\/g, "\\\\").replace(/"/g, '\\"');

  const millimetresToPixels = (value) => {
    const probe = el("div");
    probe.style.cssText = `position:absolute;visibility:hidden;height:${value}mm;width:0;`;
    document.body.appendChild(probe);
    const px = probe.getBoundingClientRect().height;
    probe.remove();
    return px;
  };

  /* ---------------------------------------------------------------------------
     1. Métadonnées éditoriales du document
     ------------------------------------------------------------------------ */

  const meta = (() => {
    const read = (name, fallback) => {
      const value = document.body.getAttribute(`data-doc-${name}`);
      return value === null || value === "" ? fallback : value;
    };
    const name = read("name", "");
    return {
      entity: read("entity", "MOTOR AS'PHALTE"),
      name,
      short: read("short", name),
      reference: read("reference", ""),
      confidential: read("confidential", ""),
      cover: read("cover", "") === "true",
      toc: read("toc", "") === "true",
      tocTitle: read("toc-title", "Sommaire")
    };
  })();

  const headerRight = [meta.name, meta.confidential].filter(Boolean).join(" — ");
  const footerLeft = [meta.short || meta.name, meta.reference].filter(Boolean).join(" — ");

  /* ---------------------------------------------------------------------------
     2. Protection typographique des segments insécables
     -----------------------------------------------------------------------------
     Aucun caractère n'est ajouté, supprimé ni remplacé : la sous-chaîne exacte
     est simplement déplacée dans un <span class="nowrap">.
     ------------------------------------------------------------------------ */

  const NOWRAP_PATTERNS = [
    /\b(?:[Aa]rt|[Aa]rticles?)\.?\s+(?:[LRD]\.\s?)?\d+(?:[.\-–]\d+)*(?:\s(?:bis|ter))?/g,
    /\b[LRD]\.\s?\d+(?:[.\-–]\d+)*/g,
    /\d[\d   ]*(?: | | )?(?:€|%|euros?)/g,
    /\b\d{1,2}\/\d{1,2}\/\d{2,4}\b/g,
    /\(\s?\d[\d   ]*\s?\)/g,
    /«[   ]\S+/g,
    /\S+[   ]»/g
  ];

  const NOWRAP_SKIP = new Set(["SCRIPT", "STYLE", "A", "CODE", "PRE", "TEXTAREA"]);

  function protectSegments(scope) {
    const walker = document.createTreeWalker(scope, NodeFilter.SHOW_TEXT, {
      acceptNode(node) {
        const parent = node.parentNode;
        if (!parent || NOWRAP_SKIP.has(parent.nodeName)) return NodeFilter.FILTER_REJECT;
        if (parent.classList && parent.classList.contains("nowrap")) {
          return NodeFilter.FILTER_REJECT;
        }
        return node.nodeValue && node.nodeValue.trim()
          ? NodeFilter.FILTER_ACCEPT
          : NodeFilter.FILTER_REJECT;
      }
    });

    const targets = [];
    let current = walker.nextNode();
    while (current) {
      targets.push(current);
      current = walker.nextNode();
    }

    targets.forEach((node) => {
      const value = node.nodeValue;
      const ranges = [];

      NOWRAP_PATTERNS.forEach((pattern) => {
        pattern.lastIndex = 0;
        let match = pattern.exec(value);
        while (match) {
          if (match[0].length > 1) ranges.push([match.index, match.index + match[0].length]);
          match = pattern.exec(value);
        }
      });

      if (!ranges.length) return;

      ranges.sort((a, b) => a[0] - b[0] || b[1] - a[1]);
      const merged = [];
      ranges.forEach((range) => {
        const last = merged[merged.length - 1];
        if (last && range[0] <= last[1]) last[1] = Math.max(last[1], range[1]);
        else merged.push(range.slice());
      });

      const fragment = document.createDocumentFragment();
      let cursor = 0;
      merged.forEach(([start, end]) => {
        if (start > cursor) {
          fragment.appendChild(document.createTextNode(value.slice(cursor, start)));
        }
        const span = el("span", "nowrap");
        span.appendChild(document.createTextNode(value.slice(start, end)));
        fragment.appendChild(span);
        cursor = end;
      });
      if (cursor < value.length) {
        fragment.appendChild(document.createTextNode(value.slice(cursor)));
      }
      node.parentNode.replaceChild(fragment, node);
    });
  }

  /* ---------------------------------------------------------------------------
     3. Restructuration sémantique
     -----------------------------------------------------------------------------
     La source est une suite plate de blocs. On la relit une seule fois pour la
     ranger dans une hiérarchie réelle : page de garde / ouverture, TITRES,
     articles, page de signatures.
     ------------------------------------------------------------------------ */

  const shell = el("main", "doc-shell");
  const blocks = Array.from(document.body.childNodes).filter(
    (node) =>
      node.nodeType === Node.ELEMENT_NODE ||
      (node.nodeType === Node.TEXT_NODE && node.nodeValue.trim())
  );

  /* Un document possédant des <h3> range ses TITRES en <h2> ; sinon, les <h2>
     sont déjà le niveau « article » (cas des actes courts en annexe). */
  const hasArticles = document.querySelector("h3") !== null;
  const partTag = hasArticles ? "H2" : null;
  const articleTag = hasArticles ? "H3" : "H2";
  root.setAttribute("data-doc-structure", hasArticles ? "parts" : "flat");

  while (document.body.firstChild) document.body.removeChild(document.body.firstChild);
  document.body.appendChild(shell);

  let currentPart = null;
  let currentArticle = null;

  const appendToFlow = (node) => {
    (currentArticle || currentPart || shell).appendChild(node);
  };

  const openPart = (heading) => {
    currentArticle = null;
    currentPart = el("section", "doc-part");
    heading.classList.add("part-heading");
    heading.id = uniqueId(slug(text(heading), "titre"));
    currentPart.appendChild(heading);
    shell.appendChild(currentPart);
  };

  const openArticle = (heading) => {
    currentArticle = el("section", "doc-article");
    heading.classList.add("article-heading");
    heading.id = uniqueId(slug(text(heading), "article"));
    currentArticle.appendChild(heading);
    (currentPart || shell).appendChild(currentArticle);
  };

  /* -- 3.1 En-tête de document : titre, identité, nature, référence -------- */

  function collectOpening(startIndex) {
    const parts = { title: blocks[startIndex], identity: null, doctype: null, reference: null };
    let i = startIndex + 1;

    while (i < blocks.length) {
      const next = blocks[i];
      if (next.nodeType !== Node.ELEMENT_NODE) break;

      /* Blocs déjà centrés dans la source (page de titre des Statuts). */
      if (next.nodeName === "P" && next.getAttribute("style")) {
        if (!parts.identity) parts.identity = next;
        else if (!parts.reference) parts.reference = next;
        else break;
        i += 1;
        continue;
      }
      if (next.nodeName === "H2" && next.getAttribute("style") && !parts.doctype) {
        parts.doctype = next;
        i += 1;
        continue;
      }
      /* Ligne de référence en italique des annexes. */
      if (
        next.nodeName === "P" &&
        !parts.identity &&
        !parts.reference &&
        next.children.length === 1 &&
        next.firstElementChild &&
        next.firstElementChild.tagName === "EM" &&
        text(next) === text(next.firstElementChild)
      ) {
        parts.reference = next;
        i += 1;
        continue;
      }
      break;
    }

    return { parts, next: i };
  }

  const buildCover = (parts) => {
    /* Le conteneur n'est pas marqué « éditorial » : il accueille des éléments
       du document source (titre, identité, nature de l'acte, référence). Seuls
       les blocs réellement ajoutés le sont, afin que le contrôle d'intégrité
       compare bien la totalité du texte juridique. */
    const cover = el("section", "doc-cover");

    /* Bandeau d'identité en tête de page, à la manière d'un papier à en-tête. */
    const head = editorial(el("div", "doc-cover__head"));
    const entity = el("p", "doc-cover__entity");
    entity.textContent = meta.entity;
    head.appendChild(entity);
    cover.appendChild(head);

    const main = el("div", "doc-cover__main");
    main.appendChild(editorial(el("hr", "doc-cover__rule")));
    if (parts.title) main.appendChild(parts.title);
    if (parts.identity) {
      parts.identity.removeAttribute("style");
      parts.identity.classList.add("doc-cover__identity");
      main.appendChild(parts.identity);
    }
    if (parts.doctype) {
      parts.doctype.removeAttribute("style");
      parts.doctype.classList.add("cover-doctype");
      main.appendChild(parts.doctype);
    }
    if (parts.reference) {
      parts.reference.removeAttribute("style");
      parts.reference.classList.add("doc-cover__reference");
      main.appendChild(parts.reference);
    }
    cover.appendChild(main);

    const foot = editorial(el("div", "doc-cover__foot"));
    foot.appendChild(el("hr", "doc-cover__foot-rule"));
    const mentions = el("p", "doc-cover__mentions");
    const left = el("span");
    left.textContent = meta.entity;
    mentions.appendChild(left);
    if (meta.confidential) {
      const right = el("span");
      right.textContent = meta.confidential;
      mentions.appendChild(right);
    }
    foot.appendChild(mentions);
    cover.appendChild(foot);

    return cover;
  };

  const buildOpening = (parts, isContinuation) => {
    const opening = el(
      "header",
      `doc-opening${isContinuation ? " doc-opening--continuation" : ""}`
    );

    /* Aucune ligne d'entité ici : le cartouche d'en-tête porte déjà
       « MOTOR AS'PHALTE » sur chaque page, y compris la première. */
    if (parts.title) {
      parts.title.classList.add("doc-opening__title");
      opening.appendChild(parts.title);
    }
    if (parts.identity) {
      parts.identity.removeAttribute("style");
      parts.identity.classList.add("doc-opening__reference");
      opening.appendChild(parts.identity);
    }
    if (parts.doctype) {
      parts.doctype.removeAttribute("style");
      parts.doctype.classList.add("cover-doctype");
      opening.appendChild(parts.doctype);
    }
    if (parts.reference) {
      parts.reference.removeAttribute("style");
      parts.reference.classList.add("doc-opening__reference");
      opening.appendChild(parts.reference);
    }
    return opening;
  };

  /* -- 3.2 Balayage principal ---------------------------------------------- */

  let openingCount = 0;
  let index = 0;

  while (index < blocks.length) {
    const node = blocks[index];

    if (node.nodeName === "H1") {
      const opening = collectOpening(index);
      const isFirst = openingCount === 0;

      /* Un second acte réuni dans le même fichier commence sur une page neuve :
         le filet décoratif qui le précédait n'a plus lieu d'être. */
      if (!isFirst) {
        const previous = shell.lastElementChild;
        const tail = previous && previous.lastElementChild;
        if (previous && previous.tagName === "HR") previous.remove();
        else if (tail && tail.tagName === "HR") tail.remove();
      }

      shell.appendChild(
        isFirst && meta.cover
          ? buildCover(opening.parts)
          : buildOpening(opening.parts, !isFirst)
      );

      currentPart = null;
      currentArticle = null;
      openingCount += 1;
      index = opening.next;
      continue;
    }

    if (partTag && node.nodeName === partTag) {
      openPart(node);
      index += 1;
      continue;
    }

    if (node.nodeName === articleTag) {
      openArticle(node);
      index += 1;
      continue;
    }

    appendToFlow(node);
    index += 1;
  }

  /* -- 3.3 Pages de signatures --------------------------------------------- */

  const signatureSections = [];
  Array.from(shell.querySelectorAll(".part-heading, .article-heading")).forEach((heading) => {
    if (!SIGNATURE_RE.test(text(heading))) return;
    const container = heading.parentNode;
    if (!container || !container.classList) return;
    container.classList.add("doc-signatures");
    signatureSections.push(container);
    const intro = heading.nextElementSibling;
    if (intro && intro.tagName === "P") intro.classList.add("doc-signatures__intro");
  });

  /* -- 3.4 Mention finale de projet de travail ----------------------------- */

  (() => {
    const paragraphs = Array.from(shell.querySelectorAll("p"));
    let target = null;
    for (let i = paragraphs.length - 1; i >= 0; i -= 1) {
      if (NOTICE_RE.test(text(paragraphs[i]))) {
        target = paragraphs[i];
        break;
      }
    }
    if (!target) return;
    const rule = target.previousElementSibling;
    const notice = el("aside", "doc-notice");
    target.parentNode.insertBefore(notice, target);
    notice.appendChild(target);
    if (rule && rule.tagName === "HR") rule.remove();
  })();

  /* -- 3.5 Tableaux --------------------------------------------------------- */

  const NUMERIC_RE =
    /^[\s  ]*[-—–]?[\s  ]*\d[\d   .,]*(?:%|€|euros?)?[\s  ]*$/;

  Array.from(shell.querySelectorAll("table")).forEach((table) => {
    const inSignatures = !!table.closest(".doc-signatures");
    table.classList.add(inSignatures ? "signature-table" : "legal-table");

    const headCells = Array.from(table.querySelectorAll("thead th"));
    const columns = headCells.length;

    if (inSignatures) {
      Array.from(table.querySelectorAll("tbody tr")).forEach((row) => {
        const cells = row.children;
        if (cells.length) cells[cells.length - 1].classList.add("signature-slot");
      });
      if (columns) headCells[columns - 1].classList.add("signature-slot");
      return;
    }

    if (columns >= 5) table.classList.add("legal-table--wide");
    if (!columns) return;

    const bodyRows = Array.from(table.querySelectorAll("tbody tr"));

    for (let c = 0; c < columns; c += 1) {
      let numeric = 0;
      let counted = 0;
      bodyRows.forEach((row) => {
        const cell = row.children[c];
        if (!cell || cell.hasAttribute("colspan")) return;
        const value = text(cell);
        if (!value || value === "—" || value === "-") return;
        counted += 1;
        if (NUMERIC_RE.test(value)) numeric += 1;
      });
      if (counted >= 2 && numeric === counted) {
        if (headCells[c]) headCells[c].classList.add("is-numeric");
        bodyRows.forEach((row) => {
          const cell = row.children[c];
          if (cell && !cell.hasAttribute("colspan")) cell.classList.add("is-numeric");
        });
      }

      /* Colonne de repère : son contenu le plus long tient en quelques
         caractères, elle ne doit donc pas se voir attribuer une part égale
         de la largeur du tableau. */
      let widest = text(headCells[c]).length;
      bodyRows.forEach((row) => {
        const cell = row.children[c];
        if (!cell || cell.hasAttribute("colspan")) return;
        widest = Math.max(widest, text(cell).length);
      });
      if (widest > 0 && widest <= 9) {
        if (headCells[c]) headCells[c].classList.add("is-narrow");
        bodyRows.forEach((row) => {
          const cell = row.children[c];
          if (cell && !cell.hasAttribute("colspan")) cell.classList.add("is-narrow");
        });
      }
    }

    bodyRows.forEach((row) => {
      const first = row.children[0];
      if (!first) return;
      const strong = first.querySelector("strong");
      if (strong && /^total/i.test(text(strong))) row.classList.add("is-total");
    });
  });

  /* -- 3.6 Listes longues --------------------------------------------------- */

  Array.from(shell.querySelectorAll("ul, ol")).forEach((list) => {
    if (list.children.length >= 8) list.classList.add("long-list");
  });

  /* -- 3.7 Protection typographique ----------------------------------------- */

  protectSegments(shell);

  /* ---------------------------------------------------------------------------
     4. Table des matières
     ------------------------------------------------------------------------ */

  (function buildToc() {
    if (!meta.toc) return;

    const entries = Array.from(
      shell.querySelectorAll(".part-heading, .article-heading")
    ).filter((heading) => !heading.closest(".doc-cover"));

    if (entries.length < 6) return;

    const nav = editorial(el("nav", "doc-toc", { "aria-label": meta.tocTitle }));
    const title = el("h2", "doc-toc__title");
    title.textContent = meta.tocTitle;
    nav.appendChild(title);

    const list = el("ol", "doc-toc__list");
    entries.forEach((heading) => {
      const isPart = heading.classList.contains("part-heading");
      const item = el("li", `doc-toc__item doc-toc__item--${isPart ? "part" : "article"}`);
      const link = el("a", "doc-toc__link", { href: `#${heading.id}` });
      const label = el("span", "doc-toc__label");
      label.textContent = text(heading);
      link.appendChild(label);
      link.appendChild(el("span", "doc-toc__leader"));
      item.appendChild(link);
      list.appendChild(item);
    });
    nav.appendChild(list);

    const cover = shell.querySelector(".doc-cover");
    if (cover && cover.nextSibling) shell.insertBefore(nav, cover.nextSibling);
    else if (cover) shell.appendChild(nav);
    else shell.insertBefore(nav, shell.firstChild);
  })();

  /* ---------------------------------------------------------------------------
     5. Cartouches de repli (impression sans pagination Paged.js)
     ------------------------------------------------------------------------ */

  const runners = (() => {
    const make = (kind, left, right) => {
      const node = editorial(
        el(kind === "header" ? "header" : "footer", `doc-runner doc-runner--${kind}`, {
          "aria-hidden": "true"
        })
      );
      const l = el("span", "doc-runner__left");
      l.textContent = left;
      const r = el("span", "doc-runner__right");
      r.textContent = right;
      node.appendChild(l);
      node.appendChild(r);
      document.body.appendChild(node);
      return node;
    };
    return [make("header", meta.entity, headerRight), make("footer", footerLeft, "")];
  })();

  /* ---------------------------------------------------------------------------
     6. Classement des blocs par hauteur réelle
     -----------------------------------------------------------------------------
     Mesure effectuée hors écran, à la largeur utile exacte d'une page et avec la
     typographie d'impression. « break-inside: avoid » n'est appliqué qu'aux blocs
     dont on a vérifié qu'ils tiennent sur une page : c'est la seule façon
     d'éviter à la fois les coupures maladroites et les grands blancs.
     ------------------------------------------------------------------------ */

  function classifyBlocks() {
    const pageHeight = millimetresToPixels(CONTENT_HEIGHT_MM);
    if (!pageHeight) return;

    const probe = el("div", "doc-shell");
    probe.style.cssText =
      `position:absolute;left:-20000px;top:0;width:${CONTENT_WIDTH_MM}mm;` +
      "margin:0;padding:0;border:0;background:#fff;box-shadow:none;visibility:hidden;";
    probe.setAttribute("aria-hidden", "true");

    Array.from(shell.cloneNode(true).childNodes).forEach((child) => probe.appendChild(child));
    document.body.appendChild(probe);

    const measure = (selector, apply) => {
      const originals = Array.from(shell.querySelectorAll(selector));
      const copies = Array.from(probe.querySelectorAll(selector));
      if (originals.length !== copies.length) return;
      originals.forEach((node, i) => {
        const height = copies[i].getBoundingClientRect().height;
        if (height > 0) apply(node, height, pageHeight);
      });
    };

    /* Page de signatures dédiée : réservée aux actes principaux — ceux qui
       possèdent une page de garde — et suffisamment longs. Sur un acte court
       en annexe, l'imposer ne ferait que vider la page précédente ; le bloc de
       signatures y reste simplement insécable, ce qui suffit à le protéger
       (§17 et §38). */
    const totalHeight = probe.getBoundingClientRect().height;
    if (meta.cover && totalHeight / pageHeight >= SIGNATURE_PAGE_THRESHOLD) {
      signatureSections.forEach((node) => node.classList.add("doc-signatures--own-page"));
    }

    measure(".doc-article", (node, height, page) => {
      if (height <= page * KEEP_TOGETHER_RATIO) node.classList.add("keep-together");
    });

    measure(".doc-part", (node, height, page) => {
      if (height <= page * PART_KEEP_RATIO) node.classList.add("keep-together");
    });

    measure(".doc-signatures", (node, height, page) => {
      if (height <= page * SIGNATURE_KEEP_RATIO) node.classList.add("keep-together");
    });

    measure("table", (node, height, page) => {
      if (height <= page * TABLE_WHOLE_RATIO) node.classList.add("legal-table--whole");
    });

    measure("blockquote", (node, height, page) => {
      if (height > page * 0.55) node.classList.add("is-divisible");
    });

    /* Paragraphes courts : neutralise les lignes veuves et orphelines, que le
       moteur de pagination ne traite pas nativement. */
    const sample = probe.querySelector("p");
    const lineHeight = sample ? parseFloat(getComputedStyle(sample).lineHeight) || 0 : 0;
    if (lineHeight) {
      measure("p", (node, height) => {
        if (height <= lineHeight * 4.5) node.classList.add("keep-together");
      });
    }

    probe.remove();
  }

  /* ---------------------------------------------------------------------------
     7. Feuille d'exécution : cartouches @page
     -----------------------------------------------------------------------------
     Le moteur ne sait pas fusionner deux déclarations d'un même cartouche
     provenant de deux feuilles : style et contenu sont donc réunis ici.
     ------------------------------------------------------------------------ */

  function buildPageRules() {
    const q = (value) => `"${escapeCss(value)}"`;
    const face =
      'font-family:"Segoe UI","Helvetica Neue",Helvetica,Arial,"Liberation Sans",sans-serif;' +
      "font-size:7.6pt;line-height:1.2;";

    return `
@page {
  @top-left {
    content: ${q(meta.entity)};
    ${face}
    font-weight: 500;
    letter-spacing: 0.11em;
    text-transform: uppercase;
    color: #5d6771;
    vertical-align: bottom;
    padding-bottom: 7mm;
  }
  @top-right {
    content: ${q(headerRight)};
    ${face}
    letter-spacing: 0.05em;
    color: #5d6771;
    vertical-align: bottom;
    padding-bottom: 7mm;
  }
  @bottom-left {
    content: ${q(footerLeft)};
    ${face}
    letter-spacing: 0.05em;
    color: #7b848e;
    vertical-align: top;
    padding-top: 6.5mm;
  }
  @bottom-right {
    content: "Page " counter(page) " / " counter(pages);
    ${face}
    letter-spacing: 0.05em;
    font-variant-numeric: tabular-nums;
    color: #7b848e;
    vertical-align: top;
    padding-top: 6.5mm;
  }
}

@page cover {
  @top-left { content: none; }
  @top-right { content: none; }
  @bottom-left { content: none; }
  @bottom-right { content: none; }
}
`;
  }

  /* Le moteur a besoin du TEXTE de la feuille. En file://, Chromium interdit
     à la fois XHR et l'accès au CSSOM d'une feuille liée : le miroir généré
     document-styles.js prend alors le relais. */
  function readStylesheetText() {
    if (typeof window.MA_DOCUMENT_CSS === "string" && window.MA_DOCUMENT_CSS) {
      return window.MA_DOCUMENT_CSS;
    }
    const link = document.querySelector('link[rel="stylesheet"][data-doc-style]');
    if (!link) return null;
    try {
      const sheet = Array.from(document.styleSheets).find((s) => s.href === link.href);
      if (sheet && sheet.cssRules) {
        return Array.from(sheet.cssRules).map((rule) => rule.cssText).join("\n");
      }
    } catch (error) {
      /* Accès refusé : on renonce à la pagination, le repli CSS suffit. */
    }
    return null;
  }

  /* ---------------------------------------------------------------------------
     8. Pagination
     ------------------------------------------------------------------------ */

  let pagedState = "idle"; // idle | running | ready | failed
  let pagedPromise = null;

  /* Signaux lus par la chaîne d'export (tools/make-pdf.mjs). */
  window.MA_DOCUMENT_READY = false;
  window.MA_DOCUMENT_PAGED = false;

  function paginate() {
    if (pagedState === "ready") return Promise.resolve(true);
    if (pagedPromise) return pagedPromise;

    const css = readStylesheetText();
    if (!css || !window.Paged || !window.Paged.Previewer) {
      pagedState = "failed";
      return Promise.resolve(false);
    }

    pagedState = "running";
    const veil = editorial(el("div", "doc-composing"));
    veil.textContent = "Composition du document…";
    document.body.appendChild(veil);

    pagedPromise = new Promise((resolve) => {
      window.requestAnimationFrame(() => resolve());
    })
      .then(() => {
        classifyBlocks();

        /* Les cartouches de repli feraient double emploi avec les cartouches
           @page : on les retire du DOM avant de paginer. */
        runners.forEach((node) => node.remove());

        /* Seul le corps du document est mis en pages ; la barre d'outils et le
           voile de composition restent hors de la zone paginée. */
        const content = document.createDocumentFragment();
        content.appendChild(shell);

        const previewer = new window.Paged.Previewer();
        return previewer.preview(
          content,
          [
            { "document-theme.css": css },
            { "document-runtime.css": buildPageRules() }
          ],
          undefined
        );
      })
      .then(() => {
        root.setAttribute("data-paged", "ready");
        pagedState = "ready";
        veil.remove();
        window.MA_DOCUMENT_PAGED = true;
        window.MA_DOCUMENT_READY = true;
        return true;
      })
      .catch((error) => {
        pagedState = "failed";
        pagedPromise = null;
        veil.remove();
        if (!shell.parentNode) document.body.insertBefore(shell, document.body.firstChild);
        runners.forEach((node) => document.body.appendChild(node));
        root.removeAttribute("data-paged");
        window.MA_DOCUMENT_PAGED = false;
        window.MA_DOCUMENT_READY = true;
        if (window.console) {
          window.console.warn("Pagination indisponible : rendu continu conservé.", error);
        }
        return false;
      });

    return pagedPromise;
  }

  /* Point d'entrée public utilisé par la chaîne d'export (tools/make-pdf.mjs) :
     force la mise en pages et résout à true lorsqu'elle a abouti. */
  window.MA_COMPOSE = () => paginate();

  /* ---------------------------------------------------------------------------
     9. Barre d'outils de consultation (écran uniquement)
     ------------------------------------------------------------------------ */

  const readStored = (key, allowed) => {
    try {
      const value = window.localStorage.getItem(key);
      return allowed.indexOf(value) >= 0 ? value : null;
    } catch (error) {
      return null;
    }
  };

  const store = (key, value) => {
    try {
      window.localStorage.setItem(key, value);
    } catch (error) {
      /* Le document reste utilisable sans stockage local. */
    }
  };

  function buildToolbar() {
    const bar = editorial(el("div", "doc-toolbar", { role: "group" }));
    const pagedButton = el("button", null, { type: "button" });
    const themeButton = el("button", null, { type: "button" });
    const printButton = el("button", null, { type: "button" });

    const refreshPaged = () => {
      const active = root.getAttribute("data-paged") === "ready";
      pagedButton.textContent = active ? "Vue continue" : "Aperçu A4";
      pagedButton.setAttribute("aria-pressed", String(active));
      pagedButton.setAttribute(
        "aria-label",
        active ? "Revenir à la lecture continue" : "Afficher l'aperçu paginé A4"
      );
      pagedButton.disabled = pagedState === "failed";
    };

    const refreshTheme = () => {
      const dark = root.getAttribute("data-theme") === "dark";
      themeButton.textContent = dark ? "Clair" : "Sombre";
      themeButton.setAttribute("aria-pressed", String(dark));
      themeButton.setAttribute(
        "aria-label",
        dark ? "Activer le mode clair" : "Activer le mode sombre"
      );
    };

    pagedButton.addEventListener("click", () => {
      if (root.getAttribute("data-paged") === "ready") {
        store(VIEW_KEY, "flow");
        window.location.reload();
        return;
      }
      store(VIEW_KEY, "paged");
      pagedButton.disabled = true;
      paginate().then(refreshPaged);
    });

    themeButton.addEventListener("click", () => {
      const next = root.getAttribute("data-theme") === "dark" ? "light" : "dark";
      root.setAttribute("data-theme", next);
      store(THEME_KEY, next);
      refreshTheme();
    });

    printButton.textContent = "Imprimer / PDF";
    printButton.setAttribute("aria-label", "Composer puis imprimer le document");
    printButton.addEventListener("click", () => {
      printButton.disabled = true;
      paginate().then(() => {
        printButton.disabled = false;
        refreshPaged();
        window.setTimeout(() => window.print(), 80);
      });
    });

    bar.appendChild(pagedButton);
    bar.appendChild(themeButton);
    bar.appendChild(printButton);
    document.body.appendChild(bar);

    refreshPaged();
    refreshTheme();
    return refreshPaged;
  }

  /* ---------------------------------------------------------------------------
     10. Démarrage
     ------------------------------------------------------------------------ */

  const savedTheme = readStored(THEME_KEY, ["light", "dark"]);
  const prefersDark =
    typeof window.matchMedia === "function" &&
    window.matchMedia("(prefers-color-scheme: dark)").matches;
  root.setAttribute("data-theme", savedTheme || (prefersDark ? "dark" : "light"));

  const savedView = readStored(VIEW_KEY, ["flow", "paged"]);
  const wantsPaged =
    savedView === "paged" || (savedView === null && window.innerWidth >= PAGED_MIN_WIDTH);

  const start = () => {
    const refreshPaged = buildToolbar();
    if (wantsPaged) {
      paginate().then(refreshPaged);
    } else {
      window.MA_DOCUMENT_READY = true;
    }
  };

  /* Ce script est chargé en « defer », donc avant le moteur de pagination :
     on attend la fin de tous les scripts différés pour que window.Paged existe. */
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", start, { once: true });
  } else {
    window.setTimeout(start, 0);
  }
})();
