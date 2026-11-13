# -*- coding: utf-8 -*-
"""Menu Favoris réservé aux utilisateurs qui ont des favoris.

- Ancienne version (vue Bureau) : groupe « Utilisateur avec favoris » déjà présent
  (même id), membres conservés et recalculés.
- Version 18.0.1.0.0 : la page des favoris était l'action d'accueil de tous les
  utilisateurs internes ; retirée pour ceux qui n'ont pas de favori.
- Utilisateurs avec favoris : groupe, et page des favoris en action d'accueil si vide.
"""

from odoo import SUPERUSER_ID, api


def migrate(cr, version):
    if not version:
        return
    env = api.Environment(cr, SUPERUSER_ID, {})
    action = env.ref("is_favoris.action_is_favoris_page", raise_if_not_found=False)
    groupe = env.ref("is_favoris.group_has_favorites", raise_if_not_found=False)
    Users = env["res.users"].with_context(active_test=False)
    avec_favoris = env["is.favoris"].search([]).mapped("user_id")
    if action:
        Users.search([
            ("action_id", "=", action.id),
            ("id", "not in", avec_favoris.ids),
        ]).write({"action_id": False})
        avec_favoris.filtered(lambda u: not u.share and not u.action_id).write(
            {"action_id": action.id}
        )
    if groupe:
        sans_favoris = groupe.with_context(active_test=False).users - avec_favoris
        if sans_favoris:
            groupe.write({"users": [(3, u.id) for u in sans_favoris]})
    avec_favoris._is_favoris_maj_groupe()
