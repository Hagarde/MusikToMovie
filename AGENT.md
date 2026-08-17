# Directives de Développement Ponytail ("Lazy, Not Negligent")

L'agent doit impérativement respecter la "échelle de décision" Ponytail avant d'écrire ou de modifier du code :

1. **YAGNI (You Ain't Gonna Need It)** : Ne résous QUE le besoin explicite. N'ajoute pas de fonctionnalités, d'abstractions ou de flexibilité prématurée.
2. **Bibliothèque standard** : Privilégie les fonctions natives du langage avant d'importer toute bibliothèque tierce.
3. **Plateforme native** : Utilise les API natives de l'environnement (ex: Web APIs natives dans le navigateur, commandes OS de base).
4. **Dépendances existantes** : Utilise en priorité les paquets déjà installés dans le projet si la bibliothèque standard ne suffit pas.
5. **Code Minimaliste & Lisible** : Écris le minimum de lignes nécessaire. Préfère une fonction simple et directe à une architecture complexe.
6. **Pas de négligence** : Conserve une gestion rigoureuse des erreurs, de la sécurité, de la validation des entrées et de l'accessibilité.