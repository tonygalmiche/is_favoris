# InfoSaône - Gestion des favoris pour Odoo 18

Page d'accueil personnelle de raccourcis vers des vues Odoo, avec leurs filtres.

## Fonctionnement

- **Étoile** à côté du titre de chaque page, avant la roue dentée :
  - grise : un clic ajoute la page aux favoris (nom automatique : nom du menu, ou de l'enregistrement sur un formulaire) ;
  - jaune : la page a déjà un favori (même menu et même type de vue, même enregistrement sur un formulaire) ; un clic ouvre un menu : mettre à jour avec la vue affichée, retirer, ajouter un nouveau favori.
- **Mémorisé** : menu, type de vue, enregistrement (formulaire), filtres, regroupements, tri (y compris clic sur une colonne), réglages des vues pivot et graphique.
- **Page des favoris** (menu « Favoris », action d'accueil des utilisateurs internes) :
  - cases de taille fixe, cases vides possibles ; position mémorisée en ligne + case ;
  - ligne trop longue pour la fenêtre : elle se replie et décale les lignes suivantes ;
  - déplacement à la souris : case vide, insertion sur une case occupée, nouvelle ligne ;
  - carte : couleur, icône (type de vue par défaut) ou image, mise en avant (bordure) ;
  - infobulle : nom et chemin complet du menu d'origine ;
  - modification (crayon) et suppression (corbeille) au survol ;
  - taille de toutes les cases : petites, moyennes, grandes (préférence par utilisateur).
- Nouveau favori : tout à la fin (après le dernier favori de la dernière ligne, nouvelle ligne si elle est pleine à l'écran).
- Chacun ne voit que ses favoris.

## Technique

- Modèle `is.favoris` : domaine, contexte et tri stockés comme un `ir.filters`, sans en créer (menu ⭐ standard non encombré).
- Capture : `searchModel.getIrFilterValues()` (même fonction que les favoris standard).
- Ouverture : action d'origine avec la clé de contexte `is_favoris_filtre` ; patch du `SearchModel` qui ajoute le favori comme favori par défaut, en mémoire (facette retirable).
- Étoile : composant ajouté au `ControlPanel` ; patch du `FormController` pour suivre l'enregistrement affiché.
- Préférence de taille : `res.users.is_favoris_taille`.
- Action d'accueil : remplie à l'installation, à la migration et à la création d'un utilisateur, seulement si elle est vide.

## Migration depuis la version 0.1 (vue Bureau, is_bureau)

Script `migrations/18.0.1.0.0/post-migrate.py`, lancé par le `-u is_favoris` :

- positions : ordre d'origine sur le bureau, rangé par lignes de 8 ;
- type de vue et menu d'origine retrouvés ;
- action d'accueil des utilisateurs internes qui n'en ont pas.

is_bureau n'est plus utilisé : à désinstaller ensuite.

## Auteur

InfoSaône / Tony Galmiche

## Licence

AGPL-3
