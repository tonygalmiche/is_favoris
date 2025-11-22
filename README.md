# InfoSaône - Gestion des favoris pour Odoo 18

Ce module permet aux utilisateurs de gérer leurs favoris dans Odoo 18 et de les afficher notamment sur une vue "Bureau".

## Fonctionnalités

*   **Gestion des favoris :** Permet de sauvegarder des vues spécifiques comme favoris.
*   **Intégration Bureau :** Les favoris peuvent être affichés et organisés sur la vue "Bureau" (fournie par le module `is_bureau`).
*   **Organisation :**
    *   Nom personnalisé
    *   Couleur (attribuée aléatoirement à la création si non définie)
    *   Image personnalisable
    *   Séquence (ordre d'affichage)
*   **Accès rapide :** Un clic sur un favori ouvre la vue correspondante.
*   **Gestion automatique des droits :**
    *   L'utilisateur est automatiquement ajouté au groupe de sécurité "A des favoris" (`group_has_favorites`) lorsqu'il crée son premier favori.
    *   Il est retiré de ce groupe lorsqu'il supprime son dernier favori.
    *   Le menu "Favoris" n'est visible que pour les utilisateurs ayant au moins un favori.

## Détails Techniques

### Dépendances
*   `base`
*   `web`
*   `is_bureau` (Nécessaire pour la vue de type "Bureau")

### Modèle `is.favoris`
Ce modèle hérite de `is.bureau.mixin` pour le positionnement sur le bureau.
Champs principaux :
*   `name` : Nom du favori.
*   `view_id` : Référence à la vue cible (`ir.ui.view`).
*   `user_id` : Propriétaire du favori.
*   `color` : Couleur d'affichage.
*   `image` : Icône ou image du favori.

### Assets Web
Le module ajoute des composants JS/XML pour l'intégration de l'ajout aux favoris dans l'interface Odoo (`add_to_favorites_item.js`).

## Utilisation

1.  Depuis n'importe quelle vue supportée, utilisez l'action "Ajouter aux favoris" (via le menu de recherche ou d'action, selon l'intégration JS).
2.  Accédez au menu principal "Favoris" pour voir vos favoris sous forme de liste, Kanban ou Bureau.
3.  Sur la vue Bureau, vous pouvez déplacer vos icônes de favoris librement.

## Auteur

InfoSaône / Tony Galmiche

## Licence

AGPL-3
