/* =============================================================================
   FICHIER GÉNÉRÉ — NE PAS ÉDITER
   -----------------------------------------------------------------------------
   Miroir de document-theme.css destiné au moteur de pagination lorsque les
   documents sont ouverts en file://. Toute modification doit être faite dans
   document-theme.css, puis :

       node tools/build-styles.mjs

   Source   : document-theme.css
   Empreinte: sha256:ba810aaedfa0
   ============================================================================= */

window.MA_DOCUMENT_CSS = `/* =============================================================================
   MOTOR AS'PHALTE — Feuille de style documentaire unique
   -----------------------------------------------------------------------------
   Cette feuille est la SEULE source de vérité typographique du dossier juridique.
   Elle est conçue « impression d'abord » : les règles non scopées décrivent la
   composition A4 ; « @media screen » ne contient que l'habillage de consultation
   (fond d'atelier, barre d'outils, mode sombre, vue continue) ; « @media print »
   ne contient que les corrections finales d'impression.

   Rappel technique : le moteur de pagination (Paged.js) supprime purement et
   simplement tout bloc @media autre que « print » et « all ». Le mode sombre,
   les media queries responsives et la barre d'outils ne peuvent donc jamais
   contaminer le PDF.

   Toute modification de ce fichier doit être suivie de :
       node tools/build-styles.mjs
   qui régénère le miroir « document-styles.js » utilisé par le moteur de
   pagination lorsque les documents sont ouverts en file:// (double-clic).
   ============================================================================= */

/* -----------------------------------------------------------------------------
   1. Jetons de conception
   -------------------------------------------------------------------------- */

:root {
  /* Encres — pensées pour rester lisibles en noir et blanc */
  --ink: #14181d;
  --ink-soft: #333b45;
  --ink-muted: #5d6771;
  --ink-faint: #7b848e;
  --accent: #1b2a41;

  /* Filets */
  --rule-strong: #14181d;
  --rule: #a9b0b8;
  --rule-hair: #d3d7dc;
  --tint: #f2f4f6;

  /* Piles typographiques robustes, sans dépendance à une ressource distante */
  --font-text: Cambria, Georgia, "Liberation Serif", "Times New Roman", Times, serif;
  --font-meta: "Segoe UI", "Helvetica Neue", Helvetica, Arial, "Liberation Sans", sans-serif;

  /* Géométrie de page */
  --page-w: 210mm;
  --page-h: 297mm;
  --margin-top: 24mm;
  --margin-bottom: 20mm;
  --margin-side: 28mm;
  --content-w: 154mm;   /* 210 − 2 × 28 */
  --content-h: 253mm;   /* 297 − 24 − 20 */

  /* Échelle typographique — mesurée pour ±43 lignes par page */
  --text-size: 11pt;
  --text-leading: 1.5;
  --small-size: 9.6pt;
  --table-size: 9.3pt;
  --meta-size: 7.6pt;

  /* Rythme vertical */
  --space-para: 0.62em;
  --space-block: 1.6em;
}

/* -----------------------------------------------------------------------------
   2. Boîte de page A4
   -------------------------------------------------------------------------- */

/* NOTE — les valeurs de « @page » doivent rester des longueurs littérales :
   le moteur de pagination lit ces déclarations au moment de l'analyse de la
   feuille, avant toute résolution de variables CSS.

   Les cartouches (@top-left, @bottom-right, …) ne sont pas déclarés ici : leur
   contenu dépend du document et il est produit par document-theme.js à partir
   des attributs data-doc-* du <body>. La déclaration d'un même cartouche dans
   deux feuilles n'étant pas fusionnable, style et contenu sont réunis dans la
   feuille d'exécution (voir buildPageRules). Le repli sans JavaScript passe par
   les blocs « .doc-runner » (§13 et §15). */

@page {
  size: A4 portrait;
  margin: 24mm 28mm 20mm;
}

/* Page de garde : aucun cartouche, marges resserrées en tête. */
@page cover {
  margin: 34mm 28mm 26mm;
}

/* -----------------------------------------------------------------------------
   3. Bases
   -------------------------------------------------------------------------- */

* {
  box-sizing: border-box;
}

html {
  font-family: var(--font-text);
  font-size: var(--text-size);
  color: var(--ink);
  background: #ffffff;
  text-rendering: optimizeLegibility;
  font-kerning: normal;
  font-variant-numeric: lining-nums;
  -webkit-font-smoothing: antialiased;
}

body {
  margin: 0;
  padding: 0;
  font-size: 1rem;
  line-height: var(--text-leading);
  hyphens: auto;
  -webkit-hyphens: auto;
  hyphenate-limit-chars: 6 3 3;
  -webkit-hyphenate-limit-before: 3;
  -webkit-hyphenate-limit-after: 3;
  orphans: 2;
  widows: 2;
  overflow-wrap: break-word;
}

/* Le contenu juridique est justifié : mesure de 154 mm, césure contrôlée. */
p,
li,
blockquote p,
dd {
  text-align: justify;
  text-justify: inter-word;
}

p {
  margin: 0 0 var(--space-para);
  orphans: 2;
  widows: 2;
}

p:last-child {
  margin-bottom: 0;
}

strong {
  font-weight: 700;
}

em {
  font-style: italic;
}

sup {
  font-size: 0.7em;
  line-height: 0;
  vertical-align: super;
}

a {
  color: inherit;
  text-decoration: none;
  border-bottom: 1px solid var(--rule);
}

/* Les segments protégés contre une césure ou un retour à la ligne fautif
   (montants, pourcentages, références légales, numéros d'articles) sont
   balisés par document-theme.js sans altérer un seul caractère du texte. */
.nowrap {
  white-space: nowrap;
  hyphens: none;
  -webkit-hyphens: none;
}

/* Feuille composée par le moteur de pagination : sa surface est blanche en
   toute circonstance, y compris lorsque les règles d'écran sont écartées. */
.pagedjs_page {
  background: #ffffff;
}

/* -----------------------------------------------------------------------------
   4. Hiérarchie des titres
   -------------------------------------------------------------------------- */

h1,
h2,
h3,
h4,
h5,
h6 {
  font-family: var(--font-text);
  font-weight: 700;
  color: var(--ink);
  hyphens: none;
  -webkit-hyphens: none;
  text-align: left;
  text-wrap: balance;
  break-after: avoid;
  page-break-after: avoid;
  break-inside: avoid;
  page-break-inside: avoid;
}

/* Repli sans JavaScript : les titres ne portent alors aucune classe.
   Les sélecteurs d'élément qui suivent sont systématiquement dominés par les
   classes posées à la composition (spécificité supérieure). */
h1 {
  margin: 0 0 0.5em;
  font-size: 1.45rem;
  line-height: 1.24;
  text-align: center;
}

h2 {
  margin: 1.75em 0 0.55em;
  padding-bottom: 0.32em;
  border-bottom: 0.5pt solid var(--rule);
  font-size: 1.02rem;
  line-height: 1.3;
  letter-spacing: 0.045em;
  text-transform: uppercase;
}

h3 {
  margin: 1.5em 0 0.45em;
  font-size: 1rem;
  line-height: 1.32;
}

/* Titre de document (hors page de garde) */
.doc-opening__title {
  margin: 0 0 0.35em;
  font-size: 1.45rem;
  line-height: 1.24;
  letter-spacing: 0.005em;
  text-align: center;
  text-transform: none;
}

/* Titre de TITRE / partie */
.part-heading {
  margin: 2.15em 0 0;
  padding-bottom: 0.5em;
  border-bottom: 0.6pt solid var(--rule-strong);
  font-size: 1.02rem;
  line-height: 1.3;
  letter-spacing: 0.075em;
  text-align: center;
  text-transform: uppercase;
}

.doc-part:first-child > .part-heading,
.part-heading:first-child {
  margin-top: 0;
}

/* Titre d'article */
.article-heading {
  margin: 1.5em 0 0.45em;
  font-size: 1rem;
  line-height: 1.32;
  letter-spacing: 0.005em;
}

.doc-part > .doc-article:first-of-type > .article-heading {
  margin-top: 1.15em;
}

/* Actes courts (annexes) : les intitulés de section tiennent lieu de TITRES.
   Ils reçoivent un filet et une graisse légèrement plus affirmés, sans changer
   d'échelle typographique — l'homogénéité du dossier prime. */
html[data-doc-structure="flat"] .article-heading {
  margin: 1.75em 0 0.55em;
  padding-bottom: 0.32em;
  border-bottom: 0.5pt solid var(--rule);
  letter-spacing: 0.045em;
  text-transform: uppercase;
}

html[data-doc-structure="flat"] .doc-article:first-of-type > .article-heading {
  margin-top: 0;
}

/* Sous-titres éventuels */
h4,
h5,
h6 {
  margin: 1.1em 0 0.35em;
  font-size: 1rem;
}

h5,
h6 {
  font-weight: 600;
  font-style: italic;
}

/* -----------------------------------------------------------------------------
   5. Blocs structurels
   -------------------------------------------------------------------------- */

.doc-part {
  break-before: auto;
}

.doc-article {
  margin: 0;
}

/* Bloc suffisamment court pour tenir intégralement sur une page :
   classé par mesure réelle avant pagination (voir document-theme.js). */
.keep-together {
  break-inside: avoid;
  page-break-inside: avoid;
}

/* Un titre ne reste jamais seul : il est solidaire du premier bloc suivant. */
.article-heading + *,
.part-heading + * {
  break-before: avoid;
  page-break-before: avoid;
}

/* -----------------------------------------------------------------------------
   6. Page de garde
   -----------------------------------------------------------------------------
   Composition en trois zones : bandeau d'identité en tête, bloc de titre
   optiquement centré, mentions éditoriales en pied. Tous les éléments de titre
   proviennent du document source ; seuls le nom de la société et la mention de
   confidentialité sont ajoutés.
   -------------------------------------------------------------------------- */

.doc-cover {
  page: cover;
  break-after: page;
  page-break-after: always;
  display: flex;
  flex-direction: column;
  /* Hauteur utile de la page de garde : 297 − 34 − 26 = 237 mm.
     Une réserve de 4 mm évite qu'un arrondi de rendu ne provoque
     une seconde page de garde vide. */
  min-height: 233mm;
  text-align: center;
}

.doc-cover__head {
  flex: 0 0 auto;
  padding-bottom: 4.5mm;
  border-bottom: 0.6pt solid var(--rule);
}

.doc-cover__entity {
  margin: 0;
  font-family: var(--font-meta);
  font-size: 8.4pt;
  font-weight: 600;
  letter-spacing: 0.34em;
  text-indent: 0.34em;
  text-transform: uppercase;
  text-align: center;
  color: var(--ink-muted);
}

.doc-cover__main {
  flex: 1 1 auto;
  display: flex;
  flex-direction: column;
  justify-content: center;
  /* Léger décalage vers le haut : centrage optique plutôt que géométrique. */
  padding-bottom: 20mm;
}

.doc-cover__rule {
  width: 24mm;
  margin: 0 auto 11mm;
  border: 0;
  border-top: 1.1pt solid var(--accent);
}

.doc-cover h1 {
  margin: 0;
  font-size: 1.95rem;
  font-weight: 700;
  line-height: 1.28;
  letter-spacing: 0.012em;
  text-align: center;
  text-transform: none;
}

/* Mention de nature du document déjà présente dans la source (ex. « STATUTS ») */
.doc-cover .cover-doctype {
  margin: 11mm 0 0;
  padding: 3mm 0 0;
  border: 0;
  border-top: 0.6pt solid var(--rule);
  font-size: 1.3rem;
  letter-spacing: 0.32em;
  text-indent: 0.32em;
  line-height: 1.3;
  text-align: center;
  text-transform: uppercase;
}

.doc-cover__identity {
  margin: 7mm 0 0;
  font-size: 0.96rem;
  line-height: 1.66;
  text-align: center;
  color: var(--ink-soft);
}

.doc-cover__reference {
  margin: 9mm 0 0;
  font-size: 0.9rem;
  line-height: 1.55;
  text-align: center;
  color: var(--ink-muted);
}

.doc-cover__foot {
  flex: 0 0 auto;
}

.doc-cover__foot-rule {
  width: 100%;
  margin: 0 0 4mm;
  border: 0;
  border-top: 0.6pt solid var(--rule);
}

.doc-cover__mentions {
  display: flex;
  justify-content: space-between;
  gap: 8mm;
  margin: 0;
  font-family: var(--font-meta);
  font-size: 7.6pt;
  letter-spacing: 0.16em;
  text-align: left;
  text-transform: uppercase;
  color: var(--ink-muted);
}

.doc-cover__mentions span:only-child {
  margin: 0 auto;
}

/* -----------------------------------------------------------------------------
   7. Ouverture des actes courts (annexes)
   -------------------------------------------------------------------------- */

.doc-opening {
  margin: 0 0 var(--space-block);
  padding-bottom: 5mm;
  border-bottom: 0.6pt solid var(--rule-strong);
  break-after: avoid;
  page-break-after: avoid;
  break-inside: avoid;
  page-break-inside: avoid;
}

.doc-opening__reference {
  margin: 0.55em 0 0;
  font-size: 0.9rem;
  line-height: 1.5;
  text-align: center;
  color: var(--ink-muted);
}

.doc-opening__reference em {
  font-style: italic;
}

/* Second acte contenu dans un même fichier (ex. Annexe 2 bis) */
.doc-opening--continuation {
  margin-top: 0;
  break-before: page;
  page-break-before: always;
}

/* -----------------------------------------------------------------------------
   8. Table des matières
   -------------------------------------------------------------------------- */

.doc-toc {
  break-before: page;
  page-break-before: always;
  break-after: page;
  page-break-after: always;
}

.doc-toc__title {
  margin: 0 0 8mm;
  padding-bottom: 0.5em;
  border-bottom: 0.6pt solid var(--rule-strong);
  font-size: 1.02rem;
  letter-spacing: 0.075em;
  text-align: center;
  text-transform: uppercase;
}

.doc-toc__list {
  margin: 0;
  padding: 0;
  list-style: none;
}

.doc-toc__item {
  break-inside: avoid;
  page-break-inside: avoid;
}

.doc-toc__item--part {
  margin-top: 1.15em;
}

.doc-toc__item--part:first-child {
  margin-top: 0;
}

.doc-toc__link {
  display: flex;
  align-items: baseline;
  gap: 0.4em;
  border: 0;
  color: inherit;
  text-decoration: none;
}

.doc-toc__item--part > .doc-toc__link {
  font-size: 0.94rem;
  font-weight: 700;
  letter-spacing: 0.05em;
  text-transform: uppercase;
}

.doc-toc__item--article > .doc-toc__link {
  padding-left: 7mm;
  font-size: 0.94rem;
  line-height: 1.75;
  color: var(--ink-soft);
}

.doc-toc__label {
  flex: 0 1 auto;
  hyphens: none;
  -webkit-hyphens: none;
}

.doc-toc__leader {
  flex: 1 1 auto;
  min-width: 6mm;
  align-self: center;
  margin: 0 0.2em;
  border-bottom: 0.5pt dotted var(--rule);
}

.doc-toc__link::after {
  flex: 0 0 auto;
  font-family: var(--font-meta);
  font-size: 0.82em;
  font-variant-numeric: tabular-nums;
  color: var(--ink-muted);
  content: target-counter(attr(href url), page);
}

/* -----------------------------------------------------------------------------
   9. Listes
   -------------------------------------------------------------------------- */

ul,
ol {
  margin: 0 0 var(--space-para);
  padding-left: 6.5mm;
}

li {
  margin-bottom: 0.28em;
  padding-left: 1mm;
  break-inside: avoid;
  page-break-inside: avoid;
}

li:last-child {
  margin-bottom: 0;
}

li > ul,
li > ol {
  margin-top: 0.28em;
  margin-bottom: 0.28em;
}

ul {
  list-style-type: none;
}

ul > li {
  position: relative;
}

ul > li::before {
  position: absolute;
  left: -4.2mm;
  content: "—";
  color: var(--ink-muted);
}

ul ul > li::before {
  content: "·";
}

ol {
  padding-left: 7.5mm;
}

ol > li::marker {
  font-variant-numeric: tabular-nums;
  color: var(--ink-soft);
}

/* Une liste très longue peut se répartir sur deux pages : seuls les éléments
   restent insécables. */
.long-list > li {
  break-inside: avoid;
  page-break-inside: avoid;
}

/* -----------------------------------------------------------------------------
   10. Encadrés, avertissements, notes
   -------------------------------------------------------------------------- */

blockquote {
  margin: 1.05em 0;
  padding: 3.4mm 4.6mm 3.4mm 5mm;
  border: 0.5pt solid var(--rule);
  border-left: 1.6pt solid var(--accent);
  background: var(--tint);
  font-size: var(--small-size);
  line-height: 1.5;
  color: var(--ink-soft);
  break-inside: avoid;
  page-break-inside: avoid;
}

blockquote p {
  margin-bottom: 0.5em;
}

blockquote p:last-child {
  margin-bottom: 0;
}

/* Un encadré trop haut pour une page doit pouvoir se diviser proprement
   plutôt que de forcer un blanc de plusieurs centimètres. */
blockquote.is-divisible {
  break-inside: auto;
  page-break-inside: auto;
}

hr {
  height: 0;
  margin: 1.6em 0;
  border: 0;
  border-top: 0.5pt solid var(--rule);
}

/* Mention finale de projet de travail */
.doc-notice {
  /* Aucun filet ici : il ferait doublon avec la bordure basse du tableau de
     signatures qui précède. L'écart et l'italique grisé suffisent à détacher
     la mention. */
  margin-top: 2.4em;
  font-size: var(--small-size);
  line-height: 1.5;
  color: var(--ink-muted);
  text-align: left;
  break-before: avoid;
  page-break-before: avoid;
  break-inside: avoid;
  page-break-inside: avoid;
}

.doc-notice p {
  margin: 0;
  text-align: left;
}

/* -----------------------------------------------------------------------------
   11. Tableaux juridiques
   -------------------------------------------------------------------------- */

table,
.legal-table {
  width: 100%;
  margin: 1.05em 0;
  border-collapse: collapse;
  border-top: 1pt solid var(--rule-strong);
  border-bottom: 1pt solid var(--rule-strong);
  font-size: var(--table-size);
  line-height: 1.42;
  font-variant-numeric: lining-nums tabular-nums;
  hyphens: none;
  -webkit-hyphens: none;
  /* Largeur des colonnes déduite du contenu : une colonne « N° » ne doit pas
     occuper le quart de la page. Le débordement est empêché par la césure
     forcée des cellules (voir .legal-table td). */
  table-layout: auto;
}

table caption,
.legal-table caption {
  margin-bottom: 0.6em;
  font-family: var(--font-meta);
  font-size: var(--meta-size);
  letter-spacing: 0.1em;
  text-transform: uppercase;
  text-align: left;
  color: var(--ink-muted);
}

table thead,
.legal-table thead {
  display: table-header-group;
}

table tbody,
.legal-table tbody {
  display: table-row-group;
}

table th,
.legal-table th {
  padding: 2.1mm 2.6mm;
  border-bottom: 0.6pt solid var(--rule-strong);
  font-family: var(--font-meta);
  font-size: 7.9pt;
  font-weight: 600;
  letter-spacing: 0.07em;
  line-height: 1.3;
  text-transform: uppercase;
  text-align: left;
  vertical-align: bottom;
  color: var(--ink-soft);
}

table td,
.legal-table td {
  padding: 2.1mm 2.6mm;
  border-top: 0.4pt solid var(--rule-hair);
  text-align: left;
  vertical-align: top;
  overflow-wrap: break-word;
}

table tbody tr:first-child > td,
.legal-table tbody tr:first-child > td {
  border-top: 0;
}

table tr,
.legal-table tr {
  break-inside: avoid;
  page-break-inside: avoid;
}

/* Colonnes numériques : alignement à droite et chiffres tabulaires. */
.legal-table td.is-numeric,
.legal-table th.is-numeric {
  text-align: right;
  font-variant-numeric: lining-nums tabular-nums;
  white-space: nowrap;
}

/* Colonne de repère (numéro d'ordre, rang) : réduite à son contenu. */
.legal-table td.is-narrow,
.legal-table th.is-narrow {
  width: 1%;
  white-space: nowrap;
}

/* Ligne de total */
.legal-table tr.is-total > td {
  border-top: 0.6pt solid var(--rule-strong);
  font-weight: 700;
}

table ul,
.legal-table ul {
  margin: 0;
  padding-left: 4mm;
}

table ul > li::before,
.legal-table ul > li::before {
  left: -3.4mm;
}

table a,
.legal-table a {
  border-bottom: 0;
}

/* Un tableau qui tient sur une page n'est jamais coupé. */
.legal-table--whole {
  break-inside: avoid;
  page-break-inside: avoid;
}

/* Tableau large : léger débord contrôlé dans les marges, jamais hors page. */
.legal-table--wide {
  width: calc(100% + 16mm);
  margin-left: -8mm;
  margin-right: -8mm;
  font-size: 8.6pt;
}

.legal-table--wide th,
.legal-table--wide td {
  padding: 1.9mm 2mm;
}

/* -----------------------------------------------------------------------------
   12. Signatures
   -------------------------------------------------------------------------- */

/* La page de signatures n'est isolée que lorsque le document est assez long
   pour que cela ne produise pas une page presque vide : document-theme.js
   ajoute « --own-page » après mesure (§18 et §38). */
.doc-signatures--own-page {
  break-before: page;
  page-break-before: always;
}

.doc-signatures > .part-heading,
.doc-signatures > .article-heading {
  margin-top: 0;
}

.doc-signatures__intro {
  margin-bottom: 1.35em;
  text-align: left;
}

.signature-table {
  width: 100%;
  /* Une gouttière basse, pour que le texte qui suit le tableau ne vienne pas
     se coller au filet de fermeture. */
  margin: 0 0 1.15em;
  border-collapse: collapse;
  border-top: 1pt solid var(--rule-strong);
  border-bottom: 1pt solid var(--rule-strong);
  font-size: var(--small-size);
  line-height: 1.45;
  hyphens: none;
  -webkit-hyphens: none;
  table-layout: fixed;
}

/* Proportions : identité à gauche, réserve de paraphe à droite. */
.signature-table th:first-child {
  width: 24%;
}

.signature-table th.signature-slot {
  width: 38%;
}

.signature-table thead {
  display: table-header-group;
}

.signature-table th {
  padding: 2.2mm 3mm;
  border-bottom: 0.6pt solid var(--rule-strong);
  font-family: var(--font-meta);
  font-size: 7.9pt;
  font-weight: 600;
  letter-spacing: 0.07em;
  text-transform: uppercase;
  text-align: left;
  vertical-align: bottom;
  color: var(--ink-soft);
}

.signature-table td {
  /* Hauteur réelle réservée à la mention manuscrite ET au paraphe :
     une mention de trois lignes écrite à la main plus une signature
     demandent au moins trois centimètres et demi. */
  height: 34mm;
  padding: 3.2mm 3mm 9mm;
  border-top: 0.4pt solid var(--rule-hair);
  text-align: left;
  vertical-align: top;
}

.signature-table tbody tr:first-child > td {
  border-top: 0;
}

.signature-table tr {
  break-inside: avoid;
  page-break-inside: avoid;
}

/* Colonne d'accueil du paraphe : filet d'appui discret. */
.signature-table td.signature-slot {
  position: relative;
  color: var(--ink-muted);
  font-size: 8.6pt;
  font-style: italic;
  line-height: 1.4;
}

.signature-table td.signature-slot::after {
  position: absolute;
  right: 3mm;
  bottom: 4mm;
  left: 3mm;
  border-bottom: 0.5pt dotted var(--rule);
  content: "";
}

/* -----------------------------------------------------------------------------
   13. Cartouches de repli (sans moteur de pagination)
   -----------------------------------------------------------------------------
   Chromium répète les éléments « position: fixed » sur chaque page imprimée.
   Ces deux blocs ne servent QUE lorsque la pagination Paged.js n'a pas eu lieu
   (JavaScript désactivé, moteur indisponible) : document-theme.js les retire du
   DOM avant de paginer. Ils sont invisibles à l'écran.
   -------------------------------------------------------------------------- */

.doc-runner {
  display: none;
}

/* -----------------------------------------------------------------------------
   14. Habillage écran (jamais imprimé, jamais paginé)
   -------------------------------------------------------------------------- */

@media screen {
  html {
    background: #e8eaed;
  }

  body {
    padding: 0;
  }

  /* Sans JavaScript, le corps n'est pas encapsulé : la boîte de lecture est
     appliquée directement au <body>. document-theme.js pose toujours
     l'attribut data-doc-structure, son absence signale ce cas. */
  html:not([data-doc-structure]) body {
    width: var(--page-w);
    max-width: 100%;
    margin: 58px auto 24px;
    padding: var(--margin-top) var(--margin-side) var(--margin-bottom);
    background: #ffffff;
    box-shadow: 0 1px 3px rgb(20 24 29 / 14%), 0 10px 30px rgb(20 24 29 / 10%);
  }

  /* Vue continue (avant ou sans pagination) : la typographie reste identique
     à celle du PDF, seule la boîte change. */
  .doc-shell {
    width: var(--page-w);
    max-width: 100%;
    /* Réserve en tête : la barre d'outils flottante ne doit jamais recouvrir
       le haut de la feuille. */
    margin: 58px auto 24px;
    padding: var(--margin-top) var(--margin-side) var(--margin-bottom);
    background: #ffffff;
    box-shadow: 0 1px 3px rgb(20 24 29 / 14%), 0 10px 30px rgb(20 24 29 / 10%);
  }

  html[data-paged="ready"] .doc-shell {
    width: auto;
    margin: 0;
    padding: 0;
    background: transparent;
    box-shadow: none;
  }

  /* Rendu paginé : une pile de feuilles A4. */
  .pagedjs_pages {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 18px;
    width: 100%;
    padding: 58px 0 48px;
  }

  .pagedjs_page {
    flex: none;
    box-shadow: 0 1px 3px rgb(20 24 29 / 14%), 0 10px 30px rgb(20 24 29 / 10%);
  }

  /* Barre d'outils de consultation */
  .doc-toolbar {
    position: fixed;
    top: 14px;
    right: 14px;
    z-index: 1000;
    display: flex;
    gap: 6px;
    padding: 5px;
    border: 1px solid #c8ccd2;
    border-radius: 999px;
    background: #ffffff;
    box-shadow: 0 2px 10px rgb(20 24 29 / 18%);
  }

  .doc-toolbar button {
    min-height: 32px;
    padding: 0 13px;
    border: 0;
    border-radius: 999px;
    background: transparent;
    color: #1f262e;
    font: 600 12.5px/1 var(--font-meta);
    letter-spacing: 0.01em;
    cursor: pointer;
  }

  .doc-toolbar button:hover {
    background: #eef0f3;
  }

  .doc-toolbar button[aria-pressed="true"] {
    background: var(--accent);
    color: #ffffff;
  }

  .doc-toolbar button:focus-visible {
    outline: 2px solid var(--accent);
    outline-offset: 2px;
  }

  /* Voile d'attente pendant la composition paginée */
  .doc-composing {
    position: fixed;
    inset: 0;
    z-index: 900;
    display: flex;
    align-items: center;
    justify-content: center;
    background: rgb(232 234 237 / 92%);
    font: 500 13px/1.4 var(--font-meta);
    letter-spacing: 0.08em;
    text-transform: uppercase;
    color: #4a525c;
  }

  /* -------------------------------------------------------------------------
     Mode sombre — strictement réservé à la lecture continue à l'écran.
     -------------------------------------------------------------------------
     Deux garde-fous rendent toute contamination du PDF impossible :
       · ces règles vivent dans « @media screen », que l'impression ignore et
         que le moteur de pagination supprime purement et simplement ;
       · elles sont en outre neutralisées dès que l'aperçu A4 est actif
         (:not([data-paged="ready"])), de sorte que l'aperçu affiché à l'écran
         soit rigoureusement identique au document imprimé.
     Seuls le plan de travail et la barre d'outils restent sombres.
     ---------------------------------------------------------------------- */

  html[data-theme="dark"] {
    background: #12161b;
    color-scheme: dark;
  }

  html[data-theme="dark"] .doc-toolbar {
    border-color: #3a434f;
    background: #1a1f26;
  }

  html[data-theme="dark"] .doc-toolbar button {
    color: #e6ebf1;
  }

  html[data-theme="dark"] .doc-toolbar button:hover {
    background: #2a323c;
  }

  html[data-theme="dark"] .doc-composing {
    background: rgb(18 22 27 / 92%);
    color: #b6bfca;
  }

  html[data-theme="dark"]:not([data-paged="ready"]) body {
    color: #dfe4ea;
  }

  html[data-theme="dark"]:not([data-paged="ready"]) .doc-shell {
    background: #1a1f26;
    box-shadow: 0 1px 3px rgb(0 0 0 / 45%), 0 10px 30px rgb(0 0 0 / 35%);
  }

  html[data-theme="dark"]:not([data-paged="ready"]) h1,
  html[data-theme="dark"]:not([data-paged="ready"]) h2,
  html[data-theme="dark"]:not([data-paged="ready"]) h3,
  html[data-theme="dark"]:not([data-paged="ready"]) h4,
  html[data-theme="dark"]:not([data-paged="ready"]) h5,
  html[data-theme="dark"]:not([data-paged="ready"]) h6 {
    color: #f2f5f8;
  }

  html[data-theme="dark"]:not([data-paged="ready"]) .part-heading,
  html[data-theme="dark"]:not([data-paged="ready"]) .doc-toc__title,
  html[data-theme="dark"]:not([data-paged="ready"]) .doc-opening {
    border-color: #8892a0;
  }

  html[data-theme="dark"]:not([data-paged="ready"]) .doc-cover__entity,
  html[data-theme="dark"]:not([data-paged="ready"]) .doc-opening__reference,
  html[data-theme="dark"]:not([data-paged="ready"]) .doc-cover__identity,
  html[data-theme="dark"]:not([data-paged="ready"]) .doc-cover__reference,
  html[data-theme="dark"]:not([data-paged="ready"]) .doc-cover__mentions,
  html[data-theme="dark"]:not([data-paged="ready"]) .doc-notice,
  html[data-theme="dark"]:not([data-paged="ready"]) .doc-toc__link::after {
    color: #a9b3bf;
  }

  html[data-theme="dark"]:not([data-paged="ready"]) blockquote {
    border-color: #4b5665;
    border-left-color: #9fb4d0;
    background: #232a33;
    color: #cfd6de;
  }

  html[data-theme="dark"]:not([data-paged="ready"]) .legal-table,
  html[data-theme="dark"]:not([data-paged="ready"]) .signature-table {
    border-color: #8892a0;
  }

  html[data-theme="dark"]:not([data-paged="ready"]) .legal-table th,
  html[data-theme="dark"]:not([data-paged="ready"]) .signature-table th {
    border-bottom-color: #8892a0;
    color: #cfd6de;
  }

  html[data-theme="dark"]:not([data-paged="ready"]) .legal-table td,
  html[data-theme="dark"]:not([data-paged="ready"]) .signature-table td {
    border-top-color: #3a434f;
  }

  html[data-theme="dark"]:not([data-paged="ready"]) .legal-table tr.is-total > td {
    border-top-color: #8892a0;
  }

  html[data-theme="dark"]:not([data-paged="ready"]) hr,
  html[data-theme="dark"]:not([data-paged="ready"]) .doc-notice,
  html[data-theme="dark"]:not([data-paged="ready"]) .doc-cover__foot-rule {
    border-color: #4b5665;
  }

  html[data-theme="dark"]:not([data-paged="ready"]) .doc-cover__rule {
    border-color: #9fb4d0;
  }

  html[data-theme="dark"]:not([data-paged="ready"]) ul > li::before,
  html[data-theme="dark"]:not([data-paged="ready"]) ol > li::marker {
    color: #9aa4b0;
  }
}

/* Consultation sur écran étroit : la boîte s'adapte, jamais la composition. */
@media screen and (max-width: 780px) {
  html:not([data-doc-structure]) body,
  .doc-shell {
    width: auto;
    margin: 0;
    padding: 16px 18px 28px;
    box-shadow: none;
  }

  .doc-toolbar {
    top: 8px;
    right: 8px;
  }
}

/* -----------------------------------------------------------------------------
   15. Impression — corrections propres au papier
   -----------------------------------------------------------------------------
   Ce bloc reste volontairement minimal. Tout ce qui relève de l'écran (mode
   sombre, plan de travail, ombres, barre d'outils) vit dans « @media screen »,
   que l'impression ignore et que le moteur de pagination supprime : il n'y a
   donc rien à « défaire » ici.

   Attention : le moteur de pagination réinjecte ces règles dans la feuille
   active de l'aperçu A4. Les déclarations qui ne doivent pas altérer l'aperçu
   à l'écran sont donc explicitement écartées par :not([data-paged="ready"]).
   -------------------------------------------------------------------------- */

@media print {
  /* Garde-fou : si l'impression a lieu sans pagination, aucune couleur d'écran
     ne doit subsister. En aperçu A4 les pages sont déjà blanches par nature. */
  html:not([data-paged="ready"]),
  html:not([data-paged="ready"]) body {
    background: #ffffff !important;
    color: var(--ink) !important;
  }

  html {
    color-scheme: light !important;
  }

  /* Éléments strictement réservés au navigateur */
  .doc-toolbar,
  .doc-composing {
    display: none !important;
  }

  /* Le conteneur de flux ne porte plus ni marge ni gouttière : la géométrie
     vient exclusivement de @page. */
  .doc-shell {
    width: auto !important;
    max-width: none !important;
    margin: 0 !important;
    padding: 0 !important;
    background: transparent !important;
    box-shadow: none !important;
  }

  html:not([data-paged="ready"]) .pagedjs_page {
    box-shadow: none !important;
  }

  /* Les aplats des encadrés d'avertissement doivent être imprimés. */
  blockquote {
    background: var(--tint);
    color: var(--ink-soft);
    -webkit-print-color-adjust: exact;
    print-color-adjust: exact;
  }

  a {
    border-bottom: 0;
    color: inherit;
  }

  /* Cartouches de repli : Chromium répète les éléments « position: fixed » sur
     chaque page imprimée. Ils ne servent que lorsque la pagination n'a pas eu
     lieu ; document-theme.js les retire du DOM avant de paginer, de sorte
     qu'ils ne font jamais double emploi avec les cartouches @page. */
  .doc-runner {
    position: fixed;
    right: 0;
    left: 0;
    display: flex;
    justify-content: space-between;
    gap: 10mm;
    font-family: var(--font-meta);
    font-size: var(--meta-size);
    letter-spacing: 0.05em;
    color: var(--ink-muted);
  }

  .doc-runner--header {
    top: -14mm;
  }

  .doc-runner--footer {
    bottom: -12mm;
    color: var(--ink-faint);
  }

  .doc-runner__left {
    font-weight: 500;
    letter-spacing: 0.11em;
    text-transform: uppercase;
  }

  .doc-runner--footer .doc-runner__left {
    font-weight: 400;
    letter-spacing: 0.05em;
    text-transform: none;
  }
}
`;
window.MA_DOCUMENT_CSS_DIGEST = "ba810aaedfa0";
