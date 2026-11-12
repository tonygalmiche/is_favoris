# -*- coding: utf-8 -*-
"""Reprise des favoris de l'ancienne version (vue Bureau de is_bureau).

- Position : ordre d'origine sur le bureau (haut en bas, gauche à droite),
  rangé par lignes de NB_COLONNES favoris.
- Type de vue : repris de la vue mémorisée.
- Menu : premier menu qui ouvre l'action.
- Page des favoris en action d'accueil des utilisateurs internes sans action d'accueil.
"""

import logging

from odoo import SUPERUSER_ID, api

_logger = logging.getLogger(__name__)

NB_COLONNES = 8


def _colonnes(cr):
    cr.execute("""
        SELECT column_name FROM information_schema.columns
        WHERE table_name = 'is_favoris'
    """)
    return {row[0] for row in cr.fetchall()}


def migrate(cr, version):
    if not version:
        return
    env = api.Environment(cr, SUPERUSER_ID, {})
    colonnes = _colonnes(cr)

    # Ordre d'origine : position sur le bureau, puis séquence
    ordre = []
    if "position_y" in colonnes:
        ordre.append("COALESCE(position_y, 0)")
    if "position_x" in colonnes:
        ordre.append("COALESCE(position_x, 0)")
    if "sequence" in colonnes:
        ordre.append("COALESCE(sequence, 0)")
    ordre.append("id")
    cr.execute("SELECT id, user_id FROM is_favoris ORDER BY user_id, %s" % ", ".join(ordre))
    rangs = {}
    for favori_id, user_id in cr.fetchall():
        rang = rangs.get(user_id, 0)
        rangs[user_id] = rang + 1
        cr.execute(
            "UPDATE is_favoris SET ligne = %s, colonne = %s WHERE id = %s",
            (rang // NB_COLONNES, rang % NB_COLONNES, favori_id),
        )

    Favoris = env["is.favoris"].with_context(active_test=False)
    for favori in Favoris.search([]):
        vals = {}
        if not favori.view_type and favori.view_id:
            vals["view_type"] = favori.view_id.type
        if not favori.menu_id and favori.action_id:
            menu = env["ir.ui.menu"].with_context(**{"ir.ui.menu.full_list": True}).search(
                [("action", "=", "ir.actions.act_window,%s" % favori.action_id.id)], limit=1
            )
            if menu:
                vals["menu_id"] = menu.id
        if vals:
            favori.write(vals)

    env["res.users"]._is_favoris_set_action_accueil()
    _logger.info("is_favoris : %s favoris repris", sum(rangs.values()))
