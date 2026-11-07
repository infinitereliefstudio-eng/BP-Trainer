# Installer BP Trainer en APK

L'appli est une PWA (hors ligne, plein écran, paysage) publiée sur GitHub Pages. PWABuilder l'emballe en APK Android (Trusted Web Activity) : l'APK charge l'appli publiée, donc les mises à jour arrivent sans réinstaller.

## Ce que Tristan fait, depuis son téléphone

1. **Activer GitHub Pages sur BP-Trainer** : dépôt BP-Trainer › Settings › Pages › Source : **GitHub Actions**. Le prochain envoi publie l'appli à `https://infinitereliefstudio-eng.github.io/BP-Trainer/`.
2. **Créer le dépôt `infinitereliefstudio-eng.github.io`** (public, vide), puis autoriser Claude à y écrire. Claude y pousse le contenu de `hosting/root-site/`.
3. **PWABuilder** : sur https://www.pwabuilder.com, coller `https://infinitereliefstudio-eng.github.io/BP-Trainer/`, puis *Package For Stores* › **Android** › *Generate Package*. Garder le zip : il contient la clé de signature (`signing.keystore` et ses mots de passe), indispensable pour toute nouvelle version.
4. **Envoyer à Claude le fichier `assetlinks.json`** du zip (ou son contenu collé). Claude le publie à la racine du domaine, dans `.well-known/`.
5. **Installer l'APK** : ouvrir le zip avec l'appli Fichiers, toucher le fichier `.apk`, autoriser l'installation depuis cette source.

Sans l'étape 4, l'appli s'ouvre avec une barre d'adresse Chrome en haut ; avec, elle est en plein écran.

## Quand repasser par PWABuilder

Seulement si le nom, l'icône, l'orientation ou l'adresse changent. Toujours réutiliser la même clé de signature (zip de l'étape 3), sinon Android refuse la mise à jour.

## Côté code

- `public/manifest.webmanifest` : nom, icônes, `display: fullscreen`, `orientation: landscape`.
- `public/sw.js` : page en réseau d'abord (mises à jour), cache sinon (hors ligne).
- `src/offline.ts` : enregistre le service worker, sauf dans la page de test claude.ai.
- `tools/icons/make_icons.py` : redessine les icônes de `public/icons/`.
- `hosting/root-site/` : contenu du dépôt `infinitereliefstudio-eng.github.io`.
