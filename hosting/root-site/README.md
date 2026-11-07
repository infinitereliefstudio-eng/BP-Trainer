# Racine du domaine infinitereliefstudio-eng.github.io

Ces fichiers vont dans le dépôt **infinitereliefstudio-eng.github.io** (un site GitHub Pages « utilisateur », servi à la racine du domaine).

- `.well-known/assetlinks.json` : la preuve qu'Android demande pour ouvrir l'APK sans barre d'adresse. Le contenu vient du zip Android de PWABuilder (fichier `assetlinks.json`), à copier tel quel. Il doit être servi à `https://infinitereliefstudio-eng.github.io/.well-known/assetlinks.json`.
- `.nojekyll` : sans lui, GitHub Pages ignore les dossiers qui commencent par un point, dont `.well-known`.
- `index.html` : redirige la racine vers l'appli, `https://infinitereliefstudio-eng.github.io/BP-Trainer/`.

L'appli elle-même reste publiée par le dépôt BP-Trainer (GitHub Actions).
