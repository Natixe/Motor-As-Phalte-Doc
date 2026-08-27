# Dossier juridique Motor As'Phalte — chaîne de composition HTML → PDF

Ce dépôt contient sept actes destinés à être imprimés et signés. Le HTML n'y est
pas une page web : c'est le moteur de composition d'un document A4.

## Fichiers

| Fichier | Rôle |
| --- | --- |
| `PACTE D'ASSOCIÉS.html` … `ANNEXE 6 …html` | Les sept actes. Le texte juridique y est intouchable. |
| `document-theme.css` | **Seule feuille de style maintenue à la main.** Géométrie A4, typographie, tableaux, signatures, règles de coupure, habillage écran, corrections d'impression. |
| `document-styles.js` | **Fichier généré.** Miroir de la feuille ci-dessus, lu par le moteur de pagination. Ne pas éditer. |
| `document-theme.js` | Composition : structuration sémantique, page de garde, sommaire, cartouches, classement des blocs, pilotage de la pagination, barre d'outils de consultation. |
| `vendor/paged.polyfill.min.js` | Moteur de pagination CSS (Paged.js, MIT — voir `vendor/LICENSE-pagedjs.md`). |
| `tools/` | Régénération du miroir CSS, export PDF, contrôle de composition, contrôle d'intégrité. |
| `pdf/` | PDF produits. |

## Commandes

Après toute modification de `document-theme.css` :

```bash
node tools/build-styles.mjs
```

Export des PDF (utilise le Chromium déjà installé ; aucune dépendance npm) :

```bash
node tools/make-pdf.mjs
```

Contrôle de composition, page par page (débordements, pages vides, titres
isolés, lignes veuves ou orphelines, tableaux coupés, cartouches manquants) :

```bash
node tools/inspect.mjs
```

Contrôle d'intégrité du texte juridique, à la source et après mise en pages :

```bash
python tools/check-integrity.py
```

## Pourquoi un miroir CSS généré

Ouvert par double-clic (`file://`), Chromium interdit au moteur de pagination de
lire une feuille de style liée : ni `XMLHttpRequest`, ni accès au CSSOM. Or le
moteur a besoin du **texte** CSS pour interpréter `@page`, les cartouches et les
règles de coupure. `document-styles.js` fournit ce texte sans dupliquer la
source : `document-theme.css` reste le seul fichier à modifier.

## Comment obtenir un PDF

1. **Depuis le navigateur.** Ouvrir le fichier, cliquer « Imprimer / PDF » dans
   la barre d'outils : la mise en pages est calculée, puis l'impression est
   lancée sur le document déjà paginé. Dans la boîte d'impression, choisir
   « Marges : aucune » et cocher « Graphiques d'arrière-plan ».
2. **En ligne de commande.** `node tools/make-pdf.mjs` fait la même chose sans
   intervention.

Le bouton « Aperçu A4 » bascule entre lecture continue et aperçu paginé ; sur un
écran large, l'aperçu paginé est actif par défaut.

## Garanties de rendu

- **Le mode sombre ne peut pas atteindre le PDF.** Toutes ses règles vivent dans
  `@media screen`, que l'impression ignore et que le moteur de pagination
  supprime ; elles sont en outre neutralisées dès que l'aperçu A4 est actif.
- **Sans JavaScript**, le document reste lisible et imprimable : `@page` est
  déclaré dans la feuille, la typographie et les tableaux sont stylés au niveau
  des éléments, et des cartouches de repli en `position: fixed` sont répétés par
  Chromium sur chaque page. Seules la pagination automatique et la table des
  matières exigent le moteur.
- **Les coupures de page sont pilotées par mesure réelle**, pas par estimation :
  avant pagination, chaque article, tableau, encadré et paragraphe est mesuré
  hors écran à la largeur utile exacte d'une page (154 mm), et `break-inside:
  avoid` n'est posé que sur les blocs dont on a vérifié qu'ils tiennent. C'est
  ce qui évite à la fois les coupures maladroites et les pages à moitié vides.

## Contrainte permanente

Le contenu juridique est immuable. `tools/reference/` conserve l'empreinte
textuelle des sept actes ; `tools/check-integrity.py` la compare à la fois au
texte des fichiers et au texte réellement mis en pages. Toute intervention
ultérieure doit laisser ce contrôle au vert.
