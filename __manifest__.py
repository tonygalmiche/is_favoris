# -*- coding: utf-8 -*-

{
    "name": "InfoSaône - Gestion des favoris pour Odoo 16",
    "version": "16.0.1.0.0",
    "author": "InfoSaône / Tony Galmiche",
    "category": "InfoSaône",
    "description": """
InfoSaône - Gestion des favoris pour Odoo 16

- Étoile à côté du titre de chaque page pour l'ajouter aux favoris.
- Page d'accueil des favoris (grille de raccourcis déplaçables).
- Mémorise le menu, le type de vue, les filtres, les regroupements, le tri
  et les réglages des vues pivot et graphique.
""",
    "maintainer": "InfoSaône",
    "website": "http://www.infosaone.com",
    "depends": [
        "base",
        "web",
    ],
    "data": [
        "security/is_favoris_security.xml",
        "security/ir.model.access.csv",
        "views/is_favoris_views.xml",
    ],
    "assets": {
        "web.assets_backend": [
            "is_favoris/static/src/favoris_service.js",
            "is_favoris/static/src/search_model_patch.js",
            "is_favoris/static/src/form_controller_patch.js",
            "is_favoris/static/src/etoile/etoile.js",
            "is_favoris/static/src/etoile/etoile.xml",
            "is_favoris/static/src/etoile/etoile.scss",
            "is_favoris/static/src/page/page.js",
            "is_favoris/static/src/page/page.xml",
            "is_favoris/static/src/page/page.scss",
        ],
    },
    "post_init_hook": "post_init_hook",
    "installable": True,
    "application": True,
    "license": "AGPL-3",
}
