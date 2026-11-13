# -*- coding: utf-8 -*-

from odoo import fields, models


class ResUsers(models.Model):
    _inherit = "res.users"

    is_favoris_taille = fields.Selection(
        [("petite", "Petite"), ("moyenne", "Moyenne"), ("grande", "Grande")],
        string="Taille des favoris",
        default="moyenne",
    )

    def _is_favoris_maj_groupe(self):
        """Selon que l'utilisateur a des favoris ou non :
        - groupe « Utilisateur avec favoris » (menu Favoris visible) ajouté ou retiré ;
        - page des favoris en action d'accueil si elle est vide, retirée s'il n'a plus de favori.
        """
        groupe = self.env.ref("is_favoris.group_has_favorites", raise_if_not_found=False)
        action = self.env.ref("is_favoris.action_is_favoris_page", raise_if_not_found=False)
        if not groupe:
            return
        Favoris = self.env["is.favoris"].sudo()
        for user in self.sudo():
            a_des_favoris = bool(Favoris.search_count([("user_id", "=", user.id)]))
            vals = {}
            if a_des_favoris and groupe not in user.groups_id:
                vals["groups_id"] = [(4, groupe.id)]
                if action and not user.share and not user.action_id:
                    vals["action_id"] = action.id
            elif not a_des_favoris and groupe in user.groups_id:
                vals["groups_id"] = [(3, groupe.id)]
                if action and user.action_id == action:
                    vals["action_id"] = False
            if vals:
                user.write(vals)
