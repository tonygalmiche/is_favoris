# -*- coding: utf-8 -*-

from . import models


def post_init_hook(env):
    "Page des favoris en action d'accueil des utilisateurs internes qui n'en ont pas"
    env["res.users"]._is_favoris_set_action_accueil()
