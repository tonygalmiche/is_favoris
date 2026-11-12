# InfoSaône - Gestion des favoris pour Odoo 18

Page d'accueil personnelle de favoris : des raccourcis vers des vues Odoo, avec leur recherche (filtres, regroupements, tri), disposés librement sur une grille.

## Ajouter une page aux favoris : l'étoile

Une étoile est affichée à côté du titre de chaque page (liste, kanban, pivot, graphique, calendrier, formulaire…), juste avant la roue dentée ⚙.

- **Étoile grise** : la page n'a pas encore de favori. Un clic l'ajoute directement, sans nom à saisir :
  - nom automatique : nom du menu d'origine ;
  - sur un formulaire : nom de l'enregistrement affiché.
- **Étoile jaune** : la page a déjà un favori, c'est-à-dire :
  - même menu et même type de vue (une liste et un pivot du même menu sont deux favoris différents) ;
  - sur un formulaire : même enregistrement (l'étoile suit la navigation suivant / précédent).
- **Clic sur l'étoile jaune** : un petit menu propose, pour chaque favori de la page :
  - **Mettre à jour avec la vue affichée** : remplace la recherche mémorisée par celle affichée ;
  - **Retirer des favoris** ;
  - et, en bas, **Ajouter un nouveau favori** (plusieurs favoris possibles pour une même page, avec des recherches différentes).
- Dans ce menu, chaque favori affiche sa recherche mémorisée ; une coche ✓ indique celui qui correspond à la recherche affichée.
- Si la page a été ouverte depuis un favori, le menu n'affiche que ce favori.
- Pas d'étoile dans les fenêtres (dialogues), ni sur les pages sans titre (Discussion…).

## Ce qui est mémorisé

Une « photo » de la vue au moment du clic, même si la recherche n'a pas été enregistrée :

- menu et action d'origine, type de vue ;
- enregistrement affiché (formulaire) ;
- filtres : prédéfinis, personnalisés, texte saisi dans la recherche ;
- regroupements, dans leur ordre ;
- tri, y compris celui obtenu par un clic sur une colonne ;
- pivot : lignes, colonnes, mesures ; graphique : type, mesure ;
- texte des étiquettes de la recherche, ex. « En retard · Créateur : tatu · Regroupé par État > Secteur ».

Les filtres de dates relatives (« En retard »…) restent relatifs : ils sont recalculés à chaque ouverture. Une période choisie explicitement (« Novembre ») reste fixe.

Aucun favori standard d'Odoo (`ir.filters`) n'est créé : le menu ⭐ de la recherche n'est pas encombré.

## Ouvrir un favori

- Un clic sur un favori ouvre la vue dans l'application et le menu d'origine (barre du haut de l'application, pas « Favoris »).
- La recherche mémorisée est restituée dans une seule étiquette ⭐ de la barre de recherche, avec le texte de la recherche d'origine.
- Un clic sur le ✕ de l'étiquette retire la recherche et rend celle par défaut du menu ; on peut aussi ajouter d'autres filtres à côté.

## Page des favoris

- Application « Favoris », en premier dans la liste des applications, sans sous-menu.
- Action d'accueil des utilisateurs internes : la page s'ouvre à la connexion.
- Boutons ▦ / ☰ en haut à droite : page des favoris ou liste des favoris.

### Grille

- Cases de taille fixe ; cases vides et lignes vides possibles, comme sur un smartphone.
- Position mémorisée : ligne et case dans la ligne.
- Ligne plus longue que la fenêtre : elle se replie sur plusieurs lignes et décale les suivantes vers le bas, sans chevauchement ; ascenseur vertical si besoin.
- Fenêtre élargie : chaque ligne retrouve sa disposition d'origine (fonctionne avec deux écrans de tailles différentes).
- Taille des cases : Petites, Moyennes, Grandes (préférence par utilisateur).

### Déplacement à la souris

- Toute la surface de l'écran est découpée en cases : un favori peut être déposé n'importe où.
- Pendant le déplacement, les cases apparaissent en pointillés ; rien ne bouge au survol.
- Sur une case vide : le favori s'y place.
- Sur une case occupée : insertion ; les favoris suivants de la ligne se décalent d'une case vers la droite jusqu'au premier trou.
- Jamais deux favoris sur la même case.

### Nouveau favori

- Placé après le dernier favori de la dernière ligne.
- Nouvelle ligne si la dernière ligne est pleine sur l'écran utilisé.

### Carte d'un favori

- Couleur en dégradé (aléatoire à la création) et icône : icône du type de vue par défaut, ou icône choisie.
- Ou image : elle remplace la couleur et l'icône.
  - « Image seule » : l'image occupe toute la case, sans le nom ; cochée d'office à l'ajout d'une image.
  - Exemples d'icônes SVG dans `static/img/icones/` (affaires, ACR, activités, suivi du temps, frais, factures, clients, partenaires, tables, indicateurs).
- Infobulle au survol :
  - nom ;
  - chemin du menu d'origine ;
  - type de vue ;
  - recherche mémorisée ;
  - date de création et de dernière mise à jour.
- Au survol : crayon (modifier la fiche du favori) et corbeille (supprimer, avec confirmation).

### Fiche d'un favori

- Nom, couleur, icône, image, image seule (couleur et icône masquées s'il y a une image).
- Origine : chemin du menu, type de vue, enregistrement.
- Mémorisé : recherche affichée, dates de création et de mise à jour.
- Mode développeur : domaine, contexte et tri enregistrés.

## Droits

- Tous les utilisateurs internes peuvent créer des favoris.
- Chacun ne voit que ses propres favoris (règle d'accès par utilisateur).

## Technique

- Modèle `is.favoris` : domaine, contexte et tri stockés au format d'un `ir.filters`, sans en créer.
- Capture : `searchModel.getIrFilterValues()`, la même fonction que les favoris standard ; texte de la recherche à partir des facettes affichées.
- Ouverture : action d'origine avec la clé de contexte `is_favoris_filtre` ; patch du `SearchModel` qui ajoute le favori comme favori par défaut, en mémoire seulement.
- Menu d'origine : `menu.setCurrentMenu()` à l'ouverture de l'action.
- Étoile : composant ajouté au `ControlPanel` (`etoile/`) ; patch du `FormController` pour suivre l'enregistrement affiché ; service `is_favoris` qui charge une fois la liste des favoris de l'utilisateur.
- Page : action client `is_favoris.page` (`page/`).
- Préférence de taille : `res.users.is_favoris_taille`.
- Action d'accueil : remplie à l'installation, à la migration et à la création d'un utilisateur interne, seulement si elle est vide.

## Migration depuis la version 0.1 (vue Bureau, module is_bureau)

Script `migrations/18.0.1.0.0/post-migrate.py`, lancé par le `-u is_favoris` :

- favoris repris avec leur nom, couleur et image ;
- positions : ordre d'origine sur le bureau, rangé par lignes de 8 ;
- type de vue et menu d'origine retrouvés ;
- action d'accueil des utilisateurs internes qui n'en ont pas.

Les anciens favoris n'ont pas de recherche mémorisée (l'ancienne version ne l'enregistrait pas) : ils s'ouvrent avec la recherche par défaut du menu ; « Mettre à jour » dans le menu de l'étoile permet d'en ajouter une.

is_bureau n'est plus utilisé : à désinstaller après la mise à jour.

## Auteur

InfoSaône / Tony Galmiche

## Licence

AGPL-3
