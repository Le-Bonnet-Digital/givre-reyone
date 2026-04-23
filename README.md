# Givre Reyone

## Source de vérité opérationnelle

La vérité opérationnelle du site est la **dernière version publiée/buildée validée**.
Cette version peut résulter de changements faits :

- dans le Builder (contenu et structure),
- dans le code local (migrations versionnées, règles de convergence, styles globaux).

Le point clé est d'éviter de partir d'un état obsolète.

## Règle d'or

Avant toute modification (Builder ou local), toujours récupérer l'état le plus récent publié/buildé, puis travailler à partir de cet état.

## Workflow en 6 étapes

1. **Sync** : récupérer la dernière version publiée/buildée.
2. **Choisir le canal** :
   - Builder pour édition métier rapide,
   - code local pour changements structurels versionnés.
3. **Modifier** : appliquer le changement.
4. **Converger** : vérifier que Builder et public affichent le même résultat.
5. **Valider** : build + vérifications fonctionnelles.
6. **Publier/Déployer** : figer un nouvel état de vérité.

## Erreurs fréquentes (anti-patterns)

- Modifier en local sans partir de la dernière version publiée.
- Réutiliser un ID de migration existant pour un nouveau changement structurel.
- Supposer que le public et le builder convergent automatiquement sans save/publish/deploy.
- Appliquer des transformations structurelles non versionnées.

## Où lire la procédure complète

Voir `docs/content-workflow.md`.
