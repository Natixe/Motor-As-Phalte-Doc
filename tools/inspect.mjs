/* =============================================================================
   Contrôle de composition du dossier juridique Motor As'Phalte
   -----------------------------------------------------------------------------
   Pour chaque document : composition paginée réelle dans Chromium, puis examen
   page par page. Le script signale ce qu'une relecture typographique cherche :

     · texte débordant de la zone imprimable ;
     · page anormalement vide ;
     · titre isolé en bas de page ;
     · fragment d'une ou deux lignes seul en haut ou en bas de page ;
     · tableau interrompu ;
     · cartouche ou pagination manquants.

   Il produit aussi, dans .inspect/, le texte rendu de chaque document afin de
   vérifier que le contenu juridique n'a pas bougé (tools/check-integrity.py).

   Usage :
       node tools/inspect.mjs
       node tools/inspect.mjs "PACT ASSOCIER.html"
   ============================================================================= */

import { spawn } from "node:child_process";
import { mkdir, readdir, writeFile, rm } from "node:fs/promises";
import { existsSync } from "node:fs";
import { fileURLToPath, pathToFileURL } from "node:url";
import { dirname, join, basename } from "node:path";
import { tmpdir } from "node:os";

const projectRoot = join(dirname(fileURLToPath(import.meta.url)), "..");
const reportDir = join(projectRoot, ".inspect");

const CHROME_CANDIDATES = [
  process.env.CHROME_PATH,
  "C:/Program Files/Google/Chrome/Application/chrome.exe",
  "C:/Program Files (x86)/Google/Chrome/Application/chrome.exe",
  "C:/Program Files/Microsoft/Edge/Application/msedge.exe",
  "/usr/bin/google-chrome",
  "/usr/bin/chromium",
  "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"
].filter(Boolean);

const chromePath = CHROME_CANDIDATES.find((p) => existsSync(p));
if (!chromePath) {
  process.stderr.write("Aucun navigateur Chromium trouvé (CHROME_PATH).\n");
  process.exit(1);
}

const PORT = 9822 + (process.pid % 400);
const READY_TIMEOUT_MS = 180000;
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

class Devtools {
  constructor(socket) {
    this.socket = socket;
    this.id = 0;
    this.pending = new Map();
    socket.addEventListener("message", (event) => {
      const message = JSON.parse(event.data);
      if (message.id && this.pending.has(message.id)) {
        const { resolve, reject } = this.pending.get(message.id);
        this.pending.delete(message.id);
        if (message.error) reject(new Error(JSON.stringify(message.error)));
        else resolve(message.result);
      }
    });
  }

  static async connect(url) {
    const socket = new WebSocket(url);
    await new Promise((resolve, reject) => {
      socket.addEventListener("open", resolve, { once: true });
      socket.addEventListener("error", reject, { once: true });
    });
    return new Devtools(socket);
  }

  send(method, params = {}) {
    this.id += 1;
    const id = this.id;
    return new Promise((resolve, reject) => {
      this.pending.set(id, { resolve, reject });
      this.socket.send(JSON.stringify({ id, method, params }));
    });
  }

  async evaluate(expression, awaitPromise = false) {
    const result = await this.send("Runtime.evaluate", {
      expression,
      returnByValue: true,
      awaitPromise
    });
    if (result.exceptionDetails) {
      throw new Error(
        result.exceptionDetails.exception?.description || result.exceptionDetails.text
      );
    }
    return result.result.value;
  }

  close() {
    try {
      this.socket.close();
    } catch (error) {
      /* rien à faire */
    }
  }
}

/* Programme exécuté dans la page : analyse page par page. ------------------
   Note sur la détection des débordements : le moteur de pagination place le
   contenu excédentaire dans une seconde colonne repoussée très loin à droite,
   qu'il rapatrie ensuite sur la page suivante. Un élément n'est donc considéré
   comme débordant que si sa PREMIÈRE boîte est hors de la zone imprimable, ou
   s'il s'agit d'une boîte unique qui dépasse la marge. */
const AUDIT = String.raw`(() => {
  const EDITORIAL = '[data-editorial], .doc-toolbar, .doc-composing';
  const pages = Array.from(document.querySelectorAll('.pagedjs_page'));
  const report = [];

  const lineHeightOf = (node) => {
    const value = parseFloat(getComputedStyle(node).lineHeight);
    return Number.isFinite(value) && value > 0 ? value : 16;
  };

  const label = (node) => {
    if (!node) return '—';
    const t = node.textContent.replace(/\s+/g, ' ').trim();
    return node.tagName.toLowerCase() + ' « ' + t.slice(0, 58) + (t.length > 58 ? '…' : '') + ' »';
  };

  const marginText = (page, selector) => {
    const node = page.querySelector(selector + ' > .pagedjs_margin-content');
    if (!node) return '';
    const generated = getComputedStyle(node, '::after').content;
    if (generated && generated !== 'none' && generated !== 'normal') {
      return generated.replace(/^"|"$/g, '').replace(/\\\\"/g, '"').trim();
    }
    return node.textContent.replace(/\s+/g, ' ').trim();
  };

  pages.forEach((page, index) => {
    const box = page.querySelector('.pagedjs_page_content');
    if (!box) return;
    const area = box.getBoundingClientRect();
    const wrapper = box.firstElementChild;
    const issues = [];
    const notes = [];

    const inColumn = (node) => {
      const rects = node.getClientRects();
      if (!rects.length) return false;
      return rects[0].left <= area.right + 2;
    };

    /* -- débordement horizontal réel --------------------------------------
       Les tableaux larges débordent volontairement de 8 mm dans les marges
       latérales (28 mm) : c'est une gouttière assumée, pas un débordement.
       La limite absolue reste le bord de la feuille moins 10 mm. */
    const BLEED = 32; // 8 mm + tolérance de rendu
    const sheet = page.querySelector('.pagedjs_pagebox').getBoundingClientRect();
    const hardLeft = sheet.left + 37;
    const hardRight = sheet.right - 37;

    let overflow = 0;
    let sample = '';
    box.querySelectorAll('*').forEach((node) => {
      if (node === wrapper) return;
      const rects = node.getClientRects();
      if (!rects.length) return;
      const first = rects[0];
      if (!first.width && !first.height) return;
      const slack = node.closest('.legal-table--wide') ? BLEED : 2;
      const outside =
        first.left > area.right + 2 ||
        (rects.length === 1 &&
          (first.right > area.right + slack || first.left < area.left - slack)) ||
        first.right > hardRight || first.left < hardLeft;
      if (outside) {
        overflow += 1;
        if (!sample) sample = node.tagName.toLowerCase() + (node.className ? '.' + node.className : '');
      }
    });
    if (overflow) issues.push('debordement:' + overflow + ' (' + sample + ')');

    /* -- occupation verticale --------------------------------------------- */
    let lowest = area.top;
    box.querySelectorAll('p, li, td, th, h1, h2, h3, h4, hr, blockquote').forEach((node) => {
      if (!inColumn(node)) return;
      const rect = node.getBoundingClientRect();
      if (rect.height <= 0) return;
      if (rect.bottom > lowest && rect.bottom <= area.bottom + 4) lowest = rect.bottom;
    });
    const fill = area.height ? Math.max(0, lowest - area.top) / area.height : 0;

    const isCover = !!box.querySelector('.doc-cover');
    const isToc = !!box.querySelector('.doc-toc');
    const isLast = index === pages.length - 1;

    /* Une page peu remplie n'est un défaut que si rien ne l'explique.
       Deux justifications légitimes :
         · la page suivante ouvre un bloc à début de page imposé
           (garde, sommaire, page de signatures, second acte) ;
         · elle ouvre un bloc déclaré insécable — article court, tableau
           entier — plus haut que la place restée libre ici. */
    const nextPage = pages[index + 1];
    let justified = false;
    let reason = '';

    if (nextPage) {
      const nbox = nextPage.querySelector('.pagedjs_page_content');
      if (nbox) {
        const forced = nbox.querySelector(
          '.doc-cover, .doc-toc, .doc-signatures--own-page, .doc-opening--continuation'
        );
        if (forced && !forced.hasAttribute('data-split-from')) {
          justified = true;
          reason = 'debut de page impose';
        } else {
          const block = nbox.querySelector('.keep-together, .legal-table--whole, .doc-signatures');
          if (block && !block.hasAttribute('data-split-from')) {
            /* La hauteur à comparer inclut la marge haute du bloc, qui aurait
               été rendue sur la page précédente. */
            const lead = block.firstElementChild || block;
            const margin = parseFloat(getComputedStyle(lead).marginTop) || 0;
            const needed = block.getBoundingClientRect().height + margin;
            const remaining = area.height - Math.max(0, lowest - area.top);
            if (needed > remaining - 6) {
              justified = true;
              reason = 'bloc insecable reporte';
            }
          }
        }
      }
    }

    if (!isCover && !isToc && !isLast && fill < 0.7) {
      const message = 'page peu remplie: ' + Math.round(fill * 100) + '%';
      if (justified) notes.push(message + ' (' + reason + ')');
      else issues.push(message);
    }

    /* -- premier et dernier bloc de texte ---------------------------------- */
    const flow = Array.from(
      box.querySelectorAll('p, li, td, h1, h2, h3, h4, table, blockquote')
    ).filter((node) => node.textContent.trim() && !node.closest(EDITORIAL) && inColumn(node));

    const first = flow[0] || null;
    const last = flow[flow.length - 1] || null;

    /* -- titre isolé en fin de page ---------------------------------------- */
    const blockFlow = flow.filter((node) => !node.closest('table') || node.tagName === 'TABLE');
    const lastBlock = blockFlow[blockFlow.length - 1] || null;
    if (lastBlock && /^H[1-6]$/.test(lastBlock.tagName)) {
      issues.push('titre isole en bas de page: ' + label(lastBlock));
    }

    /* -- fragment d'une seule ligne ---------------------------------------- */
    const fragmentCheck = (node, where) => {
      if (!node || !/^(P|LI|BLOCKQUOTE)$/.test(node.tagName)) return;
      const split = node.hasAttribute('data-split-from') || node.hasAttribute('data-split-to');
      if (!split) return;
      const lines = Math.round(node.getBoundingClientRect().height / lineHeightOf(node));
      if (lines <= 1) issues.push((where === 'top' ? 'ligne orpheline' : 'ligne veuve') + ': ' + label(node));
    };
    fragmentCheck(first, 'top');
    fragmentCheck(lastBlock, 'bottom');

    /* -- tableau coupé ------------------------------------------------------ */
    Array.from(box.querySelectorAll('table')).forEach((table) => {
      if (!table.hasAttribute('data-split-from') && !table.hasAttribute('data-split-to')) return;
      const rows = table.querySelectorAll('tbody tr').length;
      if (rows <= 1) issues.push('tableau coupe: ' + rows + ' ligne(s) sur cette page');
      if (table.hasAttribute('data-split-from') && !table.querySelector('thead')) {
        issues.push('tableau coupe sans repetition de l en-tete');
      }
    });

    /* -- cartouches --------------------------------------------------------- */
    const footerRight = marginText(page, '.pagedjs_margin-bottom-right');
    const headerLeft = marginText(page, '.pagedjs_margin-top-left');
    if (!isCover) {
      /* getComputedStyle ne résout pas les compteurs : la présence de la
         déclaration counter(page)/counter(pages) vaut preuve d'application,
         le rendu effectif étant vérifié sur le PDF. */
      const numbered =
        /^Page \d+ \/ \d+$/.test(footerRight) ||
        (/counter\(page\)/.test(footerRight) && /counter\(pages\)/.test(footerRight));
      if (!numbered) issues.push('pagination absente ou incorrecte: "' + footerRight + '"');
      if (!headerLeft) issues.push('en-tete absent');
    } else if (footerRight || headerLeft) {
      issues.push('cartouche present sur la page de garde');
    }

    report.push({
      page: index + 1,
      fill: Math.round(fill * 100),
      first: label(first),
      last: label(lastBlock),
      issues,
      notes
    });
  });

  /* Texte rendu, hors métadonnées éditoriales, pour le contrôle d'intégrité. */
  const clone = document.createElement('div');
  pages.forEach((page) => {
    const box = page.querySelector('.pagedjs_page_content');
    if (box) clone.appendChild(box.cloneNode(true));
  });
  clone.querySelectorAll(EDITORIAL).forEach((node) => node.remove());

  return { pages: pages.length, report, html: clone.innerHTML };
})()`;

const profileDir = join(tmpdir(), `ma-inspect-${process.pid}`);
const chrome = spawn(
  chromePath,
  [
    "--headless=new",
    "--disable-gpu",
    "--no-first-run",
    "--no-default-browser-check",
    "--disable-extensions",
    "--hide-scrollbars",
    "--window-size=1440,1200",
    "--force-color-profile=srgb",
    "--font-render-hinting=none",
    `--user-data-dir=${profileDir}`,
    `--remote-debugging-port=${PORT}`,
    "--remote-allow-origins=*",
    "about:blank"
  ],
  { stdio: ["ignore", "ignore", "pipe"] }
);
chrome.stderr.on("data", () => {});

async function browserEndpoint() {
  for (let attempt = 0; attempt < 60; attempt += 1) {
    try {
      const json = await fetch(`http://127.0.0.1:${PORT}/json/version`).then((r) => r.json());
      if (json.webSocketDebuggerUrl) return json.webSocketDebuggerUrl;
    } catch (error) {
      /* pas encore prêt */
    }
    await sleep(250);
  }
  throw new Error("Chromium n'a pas ouvert son port de débogage.");
}

async function inspectDocument(browser, file) {
  const target = await browser.send("Target.createTarget", { url: "about:blank" });
  const list = await fetch(`http://127.0.0.1:${PORT}/json/list`).then((r) => r.json());
  const page = await Devtools.connect(
    list.find((item) => item.id === target.targetId).webSocketDebuggerUrl
  );

  try {
    await page.send("Page.enable");
    await page.send("Runtime.enable");

    const loaded = new Promise((resolve) => {
      const handler = (event) => {
        if (JSON.parse(event.data).method === "Page.loadEventFired") {
          page.socket.removeEventListener("message", handler);
          resolve();
        }
      };
      page.socket.addEventListener("message", handler);
    });
    await page.send("Page.navigate", { url: pathToFileURL(join(projectRoot, file)).href });
    await loaded;

    const started = Date.now();
    while (Date.now() - started < READY_TIMEOUT_MS) {
      if (await page.evaluate("typeof window.MA_COMPOSE === 'function'")) break;
      await sleep(150);
    }
    const paged = await page.evaluate("window.MA_COMPOSE()", true);
    if (!paged) throw new Error(`Mise en pages impossible : ${file}`);
    await sleep(400);

    const result = await page.evaluate(AUDIT);
    const stem = basename(file).replace(/\.html$/i, "");
    await writeFile(join(reportDir, `${stem}.rendered.html`), result.html, "utf8");
    return { file, ...result };
  } finally {
    page.close();
    await browser.send("Target.closeTarget", { targetId: target.targetId });
  }
}

let exitCode = 0;

try {
  await mkdir(reportDir, { recursive: true });
  const requested = process.argv.slice(2);
  const files = requested.length
    ? requested
    : (await readdir(projectRoot))
        .filter((n) => n.toLowerCase().endsWith(".html"))
        .sort();

  const browser = await Devtools.connect(await browserEndpoint());
  const lines = [];

  for (const file of files) {
    const result = await inspectDocument(browser, file);
    const flagged = result.report.filter((p) => p.issues.length);
    const noted = result.report.filter((p) => !p.issues.length && p.notes.length);
    lines.push(
      `\n=== ${file}\n    ${result.pages} pages — ${flagged.length} defaut(s) — ${noted.length} remarque(s)`
    );
    flagged.forEach((p) => {
      lines.push(
        `  ! p.${String(p.page).padStart(3)} [${String(p.fill).padStart(3)}%] ` +
          p.issues.concat(p.notes).join(" | ")
      );
      lines.push(`         debut: ${p.first}`);
      lines.push(`         fin  : ${p.last}`);
    });
    noted.forEach((p) => {
      lines.push(
        `  . p.${String(p.page).padStart(3)} [${String(p.fill).padStart(3)}%] ` + p.notes.join(" | ")
      );
    });
    if (flagged.length) exitCode = 1;
  }

  const text = lines.join("\n") + "\n";
  await writeFile(join(reportDir, "rapport.txt"), text, "utf8");
  process.stdout.write(text);
  browser.close();
} catch (error) {
  process.stderr.write(`${error.stack || error}\n`);
  exitCode = 1;
} finally {
  chrome.kill();
  await sleep(300);
  await rm(profileDir, { recursive: true, force: true }).catch(() => {});
}

process.exit(exitCode);
