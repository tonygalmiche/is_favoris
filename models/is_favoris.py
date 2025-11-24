# -*- coding: utf-8 -*-

import random
import logging
from odoo import models, fields, api

_logger = logging.getLogger(__name__)


class IsFavoris(models.Model):
    _name = 'is.favoris'
    _inherit = ['is.bureau.mixin']
    _description = 'Favoris'
    _order = 'sequence, name'

    name = fields.Char('Nom', required=True)
    sequence = fields.Integer('Séquence', default=10)
    color = fields.Integer('Couleur')
    image = fields.Binary('Image')
    view_id = fields.Many2one('ir.ui.view', string='Vue')
    action_id = fields.Many2one('ir.actions.act_window', string='Action')
    url = fields.Char('URL externe')
    open_in_new_tab = fields.Boolean('Ouvrir dans un nouvel onglet', default=False)
    user_id = fields.Many2one('res.users', string='Utilisateur', default=lambda self: self.env.user, required=True, index=True)

    @api.model_create_multi
    def create(self, vals_list):
        for vals in vals_list:
            if 'color' not in vals:
                vals['color'] = random.randint(0, 11)
        records = super().create(vals_list)
        group = self.env.ref('is_favoris.group_has_favorites', raise_if_not_found=False)
        if group:
            for record in records:
                if record.user_id and group not in record.user_id.groups_id:
                    record.user_id.sudo().write({'groups_id': [(4, group.id)]})
        return records

    def unlink(self):
        users = self.mapped('user_id')
        res = super().unlink()
        group = self.env.ref('is_favoris.group_has_favorites', raise_if_not_found=False)
        if group:
            for user in users:
                # Vérifie si l'utilisateur a encore des favoris
                if not self.search_count([('user_id', '=', user.id)]):
                    if group in user.groups_id:
                        user.sudo().write({'groups_id': [(3, group.id)]})
        return res

    @api.model
    def create_from_view(self, name, view_id, action_id=False):
        "Crée un favori depuis la vue JS"
        
        return self.sudo().create({
            'name': name,
            'view_id': view_id,
            'action_id': action_id,
            'user_id': self.env.user.id,
        })

    def action_open_view(self):
        self.ensure_one()
        
        # Si une URL externe est définie, ouvrir l'URL
        if self.url:
            return {
                'type': 'ir.actions.act_url',
                'url': self.url,
                'target': 'new' if self.open_in_new_tab else 'self',
            }
        
        if self.action_id:
            action = self.action_id.sudo().read()[0]
            _logger.info("Action read: %s", action)
            if self.view_id:
                views = [(self.view_id.id, self.view_id.type)]
                for view in action.get('views', []):
                    if view[1] != self.view_id.type:
                        views.append(view)
                action['views'] = views
            _logger.info("Action views after modification: %s", action.get('views'))
            return action

        # Sinon, ouvrir la vue si elle est définie
        if not self.view_id:
            return
        
        return {
            'type': 'ir.actions.act_window',
            'name': self.name,
            'res_model': self.view_id.model,
            'views': [(self.view_id.id, self.view_id.type)],
            'target': 'current',
        }
