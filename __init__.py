# -*- coding: utf-8 -*-

from . import models


def post_init_hook(env):
    "Groupe et action d'accueil des utilisateurs qui ont déjà des favoris (réinstallation)"
    env["is.favoris"].search([]).mapped("user_id")._is_favoris_maj_groupe()
