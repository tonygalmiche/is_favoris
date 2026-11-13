# -*- coding: utf-8 -*-

from odoo import SUPERUSER_ID, api

from . import models


def post_init_hook(cr, registry):
    "Groupe et action d'accueil des utilisateurs qui ont déjà des favoris (réinstallation)"
    env = api.Environment(cr, SUPERUSER_ID, {})
    env["is.favoris"].search([]).mapped("user_id")._is_favoris_maj_groupe()
