# -*- coding: utf-8 -*-

from odoo import api, fields, models


class ResUsers(models.Model):
    _inherit = "res.users"

    is_favoris_taille = fields.Selection(
        [("petite", "Petite"), ("moyenne", "Moyenne"), ("grande", "Grande")],
        string="Taille des favoris",
        default="moyenne",
    )

    @api.model_create_multi
    def create(self, vals_list):
        users = super().create(vals_list)
        if users:
            users._is_favoris_set_action_accueil()
        return users

    @api.model
    def _is_favoris_set_action_accueil(self):
        "Met la page des favoris en action d'accueil des utilisateurs internes sans action d'accueil"
        action = self.env.ref("is_favoris.action_is_favoris_page", raise_if_not_found=False)
        if not action:
            return
        users = self or self.with_context(active_test=False).search([])
        users = users.sudo().filtered(lambda u: not u.share and not u.action_id)
        if users:
            users.write({"action_id": action.id})
