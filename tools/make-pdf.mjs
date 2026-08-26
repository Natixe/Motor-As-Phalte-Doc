/* =============================================================================
   Export PDF du dossier juridique Motor As'Phalte
   -----------------------------------------------------------------------------
   Le moteur retenu est Chromium, piloté par le protocole DevTools. Le script
   n'utilise AUCUNE dépendance npm : ni Puppeteer, ni Playwright. Il se contente
   du navigateur déjà installé sur la machine et du client WebSocket intégré à
   Node (≥ 22).

   Déroulement, pour chaque document :
     1. ouverture du fichier en file:// ;
     2. attente du signal window.MA_DOCUMENT_READY posé par document-theme.js
        une fois la mise en pages terminée ;
     3. impression via Page.printToPDF, marges nulles — la géométrie A4 et les
        cartouches proviennent intégralement de la feuille de style.

   Usage :
       node tools/make-pdf.mjs                 # tous les documents -> pdf/
       node tools/make-pdf.mjs "PACT ASSOCIER.html"
   ============================================================================= */

import { spawn } from "node:child_process";
import { mkdir, readdir, writeFile, rm } from "node:fs/promises";
import { existsSync } from "node:fs";
import { fileURLToPath, pathToFileURL } from "node:url";
import { dirname, join, basename } from "node:path";
import { tmpdir } from "node:os";

const projectRoot = join(dirname(fileURLToPath(import.meta.url)), "..");
const outputDir = join(projectRoot, "pdf");

const CHROME_CANDIDATES = [
  process.env.CHROME_PATH,
  "C:/Program Files/Google/Chrome/Application/chrome.exe",
  "C:/Program Files (x86)/Google/Chrome/Application/chrome.exe",
  "C:/Program Files/Microsoft/Edge/Application/msedge.exe",
  "C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe",
  "/usr/bin/google-chrome",
  "/usr/bin/chromium",
  "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"
].filter(Boolean);

const chromePath = CHROME_CANDIDATES.find((p) => existsSync(p));
if (!chromePath) {
  process.stderr.write(
    "Aucun navigateur Chromium trouvé. Définissez CHROME_PATH puis relancez.\n"
  );
  process.exit(1);
}

const READY_TIMEOUT_MS = 120000;
const PORT = 9422 + (process.pid % 400);

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

/* --------------------------------------------------------------------------
   Client minimal du protocole DevTools
   ----------------------------------------------------------------------- */

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
        result.exceptionDetails.exception?.description ||
          result.exceptionDetails.text
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

/* --------------------------------------------------------------------------
   Lancement du navigateur
   ----------------------------------------------------------------------- */

const profileDir = join(tmpdir(), `ma-pdf-profile-${process.pid}`);

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
      const response = await fetch(`http://127.0.0.1:${PORT}/json/version`);
      const json = await response.json();
      if (json.webSocketDebuggerUrl) return json.webSocketDebuggerUrl;
    } catch (error) {
      /* le navigateur n'écoute pas encore */
    }
    await sleep(250);
  }
  throw new Error("Chromium n'a pas ouvert son port de débogage.");
}

/* --------------------------------------------------------------------------
   Rendu d'un document
   ----------------------------------------------------------------------- */

async function renderDocument(browser, file) {
  const target = await browser.send("Target.createTarget", { url: "about:blank" });
  const list = await fetch(`http://127.0.0.1:${PORT}/json/list`).then((r) => r.json());
  const entry = list.find((item) => item.id === target.targetId);
  const page = await Devtools.connect(entry.webSocketDebuggerUrl);

  try {
    await page.send("Page.enable");
    await page.send("Runtime.enable");

    const url = pathToFileURL(join(projectRoot, file)).href;
    const loaded = new Promise((resolve) => {
      const handler = (event) => {
        const message = JSON.parse(event.data);
        if (message.method === "Page.loadEventFired") {
          page.socket.removeEventListener("message", handler);
          resolve();
        }
      };
      page.socket.addEventListener("message", handler);
    });

    await page.send("Page.navigate", { url });
    await loaded;

    /* Le script de composition expose MA_COMPOSE : on force la mise en pages
       plutôt que de dépendre de l'heuristique d'affichage. */
    const started = Date.now();
    let available = false;
    while (Date.now() - started < READY_TIMEOUT_MS) {
      available = await page.evaluate("typeof window.MA_COMPOSE === 'function'");
      if (available) break;
      await sleep(150);
    }
    if (!available) throw new Error(`Moteur de composition absent : ${file}`);

    const paged = await page.evaluate("window.MA_COMPOSE()", true);
    if (!paged) throw new Error(`Mise en pages impossible : ${file}`);

    /* Laisse le moteur stabiliser la dernière page. */
    await sleep(400);

    const stats = await page.evaluate(`(() => {
      /* Contrôle de débordement identique à celui de tools/inspect.mjs : le
         moteur range le contenu excédentaire dans une colonne repoussée hors
         champ, et les tableaux larges débordent volontairement de 8 mm dans
         les marges latérales. */
      let overflow = 0;
      document.querySelectorAll('.pagedjs_page').forEach((page) => {
        const box = page.querySelector('.pagedjs_page_content');
        if (!box) return;
        const area = box.getBoundingClientRect();
        const sheet = page.querySelector('.pagedjs_pagebox').getBoundingClientRect();
        const wrapper = box.firstElementChild;
        box.querySelectorAll('*').forEach((node) => {
          if (node === wrapper) return;
          const rects = node.getClientRects();
          if (!rects.length) return;
          const first = rects[0];
          if (!first.width && !first.height) return;
          const slack = node.closest('.legal-table--wide') ? 32 : 2;
          if (
            first.left > area.right + 2 ||
            (rects.length === 1 &&
              (first.right > area.right + slack || first.left < area.left - slack)) ||
            first.right > sheet.right - 37 ||
            first.left < sheet.left + 37
          ) {
            overflow += 1;
          }
        });
      });
      return {
        paged: window.MA_DOCUMENT_PAGED === true,
        pages: document.querySelectorAll('.pagedjs_page').length,
        overflow
      };
    })()`);

    const pdf = await page.send("Page.printToPDF", {
      printBackground: true,
      preferCSSPageSize: true,
      marginTop: 0,
      marginBottom: 0,
      marginLeft: 0,
      marginRight: 0,
      displayHeaderFooter: false,
      transferMode: "ReturnAsBase64"
    });

    const name = basename(file).replace(/\.html$/i, ".pdf");
    await writeFile(join(outputDir, name), Buffer.from(pdf.data, "base64"));

    return { file, name, ...stats };
  } finally {
    page.close();
    await browser.send("Target.closeTarget", { targetId: target.targetId });
  }
}

/* --------------------------------------------------------------------------
   Programme principal
   ----------------------------------------------------------------------- */

let exitCode = 0;

try {
  await mkdir(outputDir, { recursive: true });

  const requested = process.argv.slice(2);
  const files = requested.length
    ? requested
    : (await readdir(projectRoot))
        .filter((name) => name.toLowerCase().endsWith(".html"))
        .sort();

  const browser = await Devtools.connect(await browserEndpoint());

  for (const file of files) {
    const result = await renderDocument(browser, file);
    const mode = result.paged ? `${result.pages} pages` : "rendu continu (repli CSS)";
    const overflow = result.overflow ? ` — ${result.overflow} débordement(s)` : "";
    process.stdout.write(`${result.name.padEnd(72)} ${mode}${overflow}\n`);
    if (!result.paged || result.overflow) exitCode = 1;
  }

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
