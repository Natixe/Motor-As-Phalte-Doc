/* =============================================================================
   Génère document-styles.js à partir de document-theme.css.
   -----------------------------------------------------------------------------
   Pourquoi ce miroir : lorsqu'un document est ouvert par double-clic (file://),
   Chromium interdit au moteur de pagination de lire une feuille de style liée
   — ni XMLHttpRequest, ni accès au CSSOM. Le moteur a pourtant besoin du texte
   CSS pour interpréter @page, les cartouches et les règles de coupure.

   document-theme.css reste la seule source maintenue à la main ; ce script en
   produit une copie exploitable par le moteur. À exécuter après toute
   modification de la feuille :

       node tools/build-styles.mjs
   ============================================================================= */

import { readFile, writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { createHash } from "node:crypto";

const projectRoot = join(dirname(fileURLToPath(import.meta.url)), "..");
const source = join(projectRoot, "document-theme.css");
const target = join(projectRoot, "document-styles.js");

const css = await readFile(source, "utf8");
const digest = createHash("sha256").update(css).digest("hex").slice(0, 12);

const escaped = css
  .replace(/\\/g, "\\\\")
  .replace(/`/g, "\\`")
  .replace(/\$\{/g, "\\${");

const output = `/* =============================================================================
   FICHIER GÉNÉRÉ — NE PAS ÉDITER
   -----------------------------------------------------------------------------
   Miroir de document-theme.css destiné au moteur de pagination lorsque les
   documents sont ouverts en file://. Toute modification doit être faite dans
   document-theme.css, puis :

       node tools/build-styles.mjs

   Source   : document-theme.css
   Empreinte: sha256:${digest}
   ============================================================================= */

window.MA_DOCUMENT_CSS = \`${escaped}\`;
window.MA_DOCUMENT_CSS_DIGEST = "${digest}";
`;

await writeFile(target, output, "utf8");
process.stdout.write(
  `document-styles.js régénéré (${css.length} octets de CSS, sha256:${digest})\n`
);
