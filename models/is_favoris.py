# -*- coding: utf-8 -*-

import random

from odoo import api, fields, models

# Taille des cases en pixels, écart entre cases et marge de la page (mêmes valeurs que page.js)
TAILLES = {"petite": 80, "moyenne": 100, "grande": 130}
ECART = 12
MARGE = 24

# Clés du contexte de l'action inutiles dans un favori
CLES_CONTEXTE_IGNOREES = ("active_menu_id", "active_view_id", "view_type")

ICONES = [
    ("fa-star", "Étoile"),
    ("fa-heart", "Cœur"),
    ("fa-bookmark", "Marque-page"),
    ("fa-flag", "Drapeau"),
    ("fa-bell", "Cloche"),
    ("fa-list", "Liste"),
    ("fa-th-large", "Kanban"),
    ("fa-table", "Tableau"),
    ("fa-bar-chart", "Graphique en barres"),
    ("fa-line-chart", "Courbe"),
    ("fa-pie-chart", "Camembert"),
    ("fa-calendar", "Calendrier"),
    ("fa-clock-o", "Horloge"),
    ("fa-tasks", "Tâches"),
    ("fa-check-square-o", "Case cochée"),
    ("fa-file-text-o", "Document"),
    ("fa-folder-open-o", "Dossier"),
    ("fa-archive", "Archive"),
    ("fa-envelope-o", "Courrier"),
    ("fa-phone", "Téléphone"),
    ("fa-user", "Utilisateur"),
    ("fa-users", "Utilisateurs"),
    ("fa-building-o", "Société"),
    ("fa-truck", "Camion"),
    ("fa-cubes", "Stock"),
    ("fa-shopping-cart", "Panier"),
    ("fa-credit-card", "Carte bancaire"),
    ("fa-eur", "Euro"),
    ("fa-money", "Argent"),
    ("fa-calculator", "Calculatrice"),
    ("fa-cogs", "Engrenages"),
    ("fa-wrench", "Clé"),
    ("fa-industry", "Usine"),
    ("fa-globe", "Globe"),
    ("fa-search", "Loupe"),
    ("fa-exclamation-triangle", "Alerte"),
]


class IsFavoris(models.Model):
    _name = "is.favoris"
    _description = "Favoris"
    _order = "user_id, ligne, colonne, id"

    name = fields.Char("Nom", required=True)
    user_id = fields.Many2one(
        "res.users", string="Utilisateur", default=lambda self: self.env.user,
        required=True, index=True, ondelete="cascade",
    )
    ligne = fields.Integer("Ligne", default=0)
    colonne = fields.Integer("Colonne", default=0)
    color = fields.Integer("Couleur")
    icone = fields.Selection(ICONES, string="Icône", help="Par défaut : icône du type de vue")
    image = fields.Binary("Image", help="Remplace l'icône et la couleur")
    mise_en_avant = fields.Boolean("Mise en avant", help="Bordure de couleur autour du favori")

    action_id = fields.Many2one("ir.actions.act_window", string="Action", ondelete="cascade")
    view_id = fields.Many2one("ir.ui.view", string="Vue", ondelete="set null")
    view_type = fields.Char("Type de vue")
    res_id = fields.Integer("Enregistrement")
    menu_id = fields.Many2one("ir.ui.menu", string="Menu", ondelete="set null")
    chemin_menu = fields.Char("Chemin du menu", compute="_compute_chemin_menu")
    domain = fields.Text("Filtre")
    context = fields.Text("Contexte")
    sort = fields.Text("Tri")

    url = fields.Char("URL externe")
    open_in_new_tab = fields.Boolean("Ouvrir dans un nouvel onglet", default=False)

    @api.depends("menu_id", "action_id")
    def _compute_chemin_menu(self):
        for obj in self:
            menu = obj.menu_id.sudo()
            obj.chemin_menu = menu.complete_name if menu else (obj.action_id.sudo().name or "")

    @api.model_create_multi
    def create(self, vals_list):
        for vals in vals_list:
            if "color" not in vals:
                vals["color"] = random.randint(1, 11)
        return super().create(vals_list)

    # ------------------------------------------------------------------
    # Position
    # ------------------------------------------------------------------

    @api.model
    def _nb_colonnes(self, user, largeur):
        "Nombre de cases par ligne sur un écran de cette largeur (mêmes valeurs que page.js)"
        if not largeur:
            return 0
        taille = TAILLES.get(user.is_favoris_taille, TAILLES["moyenne"])
        return max(1, (largeur - 2 * MARGE + ECART) // (taille + ECART))

    @api.model
    def _position_fin(self, user, largeur):
        "Case après le dernier favori de la dernière ligne, ou nouvelle ligne si elle est pleine"
        nb_colonnes = self._nb_colonnes(user, largeur)
        favoris = self.search([("user_id", "=", user.id)])
        if not favoris:
            return 0, 0
        ligne = max(favoris.mapped("ligne"))
        colonne = max(favoris.filtered(lambda f: f.ligne == ligne).mapped("colonne")) + 1
        if nb_colonnes and colonne >= nb_colonnes:
            return ligne + 1, 0
        return ligne, colonne

    @api.model
    def enregistrer_positions(self, positions):
        "positions : liste de [id, ligne, colonne]"
        for favori_id, ligne, colonne in positions:
            favori = self.browse(favori_id).exists()
            if favori and (favori.ligne, favori.colonne) != (ligne, colonne):
                favori.write({"ligne": ligne, "colonne": colonne})
        return True

    # ------------------------------------------------------------------
    # Création et mise à jour depuis l'étoile
    # ------------------------------------------------------------------

    @api.model
    def _valeurs_vue(self, vals):
        "Valeurs mémorisées à partir de l'état de la vue envoyé par l'étoile"
        context = dict(vals.get("context") or {})
        for cle in CLES_CONTEXTE_IGNOREES:
            context.pop(cle, None)
        return {
            "view_type": vals.get("view_type"),
            "res_id": vals.get("res_id") or 0,
            "domain": vals.get("domain") or "[]",
            "context": repr(context),
            "sort": vals.get("sort") or "[]",
        }

    @api.model
    def _menu_action(self, action):
        menu = self.env["ir.ui.menu"].search(
            [("action", "=", "ir.actions.act_window,%s" % action.id)], limit=1
        )
        return menu

    @api.model
    def creer_depuis_vue(self, vals):
        "Crée un favori depuis l'étoile ; nom automatique (nom du menu ou de l'enregistrement)"
        action = self.env["ir.actions.act_window"].sudo().browse(vals.get("action_id")).exists()
        if not action:
            return False
        menu = self._menu_action(action)
        name = menu.name or action.name
        res_id = vals.get("res_id")
        if vals.get("view_type") == "form" and res_id and action.res_model:
            record = self.env[action.res_model].browse(res_id).exists()
            if record:
                name = record.display_name
        ligne, colonne = self._position_fin(self.env.user, vals.get("largeur"))
        favori = self.create(dict(
            self._valeurs_vue(vals),
            name=name,
            action_id=action.id,
            menu_id=menu.id,
            ligne=ligne,
            colonne=colonne,
        ))
        return {"id": favori.id, "name": favori.name}

    def mettre_a_jour_depuis_vue(self, vals):
        self.ensure_one()
        self.write(self._valeurs_vue(vals))
        return True

    # ------------------------------------------------------------------
    # Lecture pour l'étoile et la page
    # ------------------------------------------------------------------

    @api.model
    def get_etoile_data(self):
        return [{
            "id": f.id,
            "name": f.name,
            "action_id": f.action_id.id,
            "view_type": f.view_type,
            "res_id": f.res_id,
        } for f in self.search([("user_id", "=", self.env.uid)])]

    @api.model
    def get_page_data(self):
        favoris = self.search([("user_id", "=", self.env.uid)])
        return {
            "taille": self.env.user.is_favoris_taille or "moyenne",
            "favoris": [{
                "id": f.id,
                "name": f.name,
                "ligne": f.ligne,
                "colonne": f.colonne,
                "color": f.color,
                "icone": f.icone,
                "image": bool(f.image),
                "mise_en_avant": f.mise_en_avant,
                "view_type": f.view_type or (f.view_id.type if f.view_id else False),
                "chemin_menu": f.chemin_menu,
                "write_date": str(f.write_date),
            } for f in favoris],
        }

    @api.model
    def set_taille(self, taille):
        if taille in ("petite", "moyenne", "grande"):
            self.env.user.sudo().is_favoris_taille = taille
        return True

    # ------------------------------------------------------------------
    # Ouverture
    # ------------------------------------------------------------------

    def get_ouverture(self):
        "Données pour ouvrir le favori côté client"
        self.ensure_one()
        if self.url:
            return {"url": self.url, "new_tab": self.open_in_new_tab}
        if self.action_id:
            view_type = self.view_type or (self.view_id.type if self.view_id else False)
            res = {
                "action_id": self.action_id.id,
                "view_type": view_type,
                "res_id": self.res_id if view_type == "form" else False,
            }
            if self.domain or self.context or self.sort:
                res["filtre"] = {
                    "id": self.id,
                    "name": self.name,
                    "domain": self.domain or "[]",
                    "context": self.context or "{}",
                    "sort": self.sort or "[]",
                }
            return res
        if self.view_id:
            # Anciens favoris sans action : ouverture de la vue seule
            return {"action": {
                "type": "ir.actions.act_window",
                "name": self.name,
                "res_model": self.view_id.model,
                "views": [(self.view_id.id, self.view_id.type)],
                "target": "current",
            }}
        return {}
