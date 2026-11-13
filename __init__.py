# -*- coding: utf-8 -*-

from odoo import SUPERUSER_ID, api

from . import models


def post_init_hook(cr, registry):
    "Page des favoris en action d'accueil des utilisateurs internes qui n'en ont pas"
    env = api.Environment(cr, SUPERUSER_ID, {})
    env["res.users"]._is_favoris_set_action_accueil()
