# -*- coding: utf-8 -*-
"""Menu Favoris réservé aux utilisateurs qui ont des favoris.

La version 16.0.1.0.0 mettait la page des favoris en action d'accueil de tous
les utilisateurs internes à l'installation :
- action d'accueil retirée pour ceux qui n'ont pas de favori ;
- groupe « Utilisateur avec favoris » (et action d'accueil si vide) pour les autres.
"""

from odoo import SUPERUSER_ID, api


def migrate(cr, version):
    if not version:
        return
    env = api.Environment(cr, SUPERUSER_ID, {})
    action = env.ref("is_favoris.action_is_favoris_page", raise_if_not_found=False)
    avec_favoris = env["is.favoris"].search([]).mapped("user_id")
    if action:
        sans_favoris = env["res.users"].with_context(active_test=False).search([
            ("action_id", "=", action.id),
            ("id", "not in", avec_favoris.ids),
        ])
        sans_favoris.write({"action_id": False})
    avec_favoris._is_favoris_maj_groupe()
