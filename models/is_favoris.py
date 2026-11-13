# -*- coding: utf-8 -*-

import random

from odoo import SUPERUSER_ID, api, fields, models
from odoo.tools.misc import format_date

# Taille des cases en pixels, écart entre cases et marge de la page (mêmes valeurs que page.js)
TAILLES = {"petite": 80, "moyenne": 100, "grande": 130}
ECART = 12
MARGE = 24

# Noms des types de vue (mêmes valeurs que favoris_service.js)
NOMS_VUES = {
    "list": "Liste",
    "kanban": "Kanban",
    "pivot": "Tableau croisé dynamique",
    "graph": "Graphique",
    "calendar": "Calendrier",
    "form": "Formulaire",
    "activity": "Activités",
    "gantt": "Gantt",
    "map": "Carte",
    "hierarchy": "Hiérarchie",
}

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
    image_seule = fields.Boolean(
        "Image seule", help="L'image occupe toute la case, sans le nom (visible dans l'infobulle)"
    )

    action_id = fields.Many2one("ir.actions.act_window", string="Action", ondelete="cascade")
    view_id = fields.Many2one("ir.ui.view", string="Vue", ondelete="set null")
    view_type = fields.Char("Type de vue (technique)")
    nom_type_vue = fields.Char("Type de vue", compute="_compute_nom_type_vue", store=True)
    res_id = fields.Integer("Enregistrement")
    menu_id = fields.Many2one("ir.ui.menu", string="Menu", ondelete="set null")
    chemin_menu = fields.Char("Chemin du menu", compute="_compute_chemin_menu")
    date_mise_a_jour = fields.Datetime(
        "Mis à jour le", help="Dernière mise à jour de la vue mémorisée (étoile)"
    )
    description_filtre = fields.Char(
        "Recherche affichée", help="Étiquettes de la recherche au moment de la création du favori"
    )
    domain = fields.Text("Filtre")
    context = fields.Text("Contexte")
    sort = fields.Text("Tri")


    @api.onchange("image")
    def _onchange_image(self):
        "Image seule cochée par défaut à l'ajout d'une image, décochée si l'image est retirée"
        if not self.image:
            self.image_seule = False
        elif not self._origin.image:
            self.image_seule = True

    @api.depends("view_type")
    def _compute_nom_type_vue(self):
        for obj in self:
            obj.nom_type_vue = NOMS_VUES.get(obj.view_type, obj.view_type or "")

    @api.depends("menu_id", "action_id")
    def _compute_chemin_menu(self):
        for obj in self:
            menu = obj.menu_id.sudo()
            chemin = menu.complete_name if menu else (obj.action_id.sudo().name or "")
            obj.chemin_menu = (chemin or "").replace("/", " / ")

    @api.model_create_multi
    def create(self, vals_list):
        images = []
        for vals in vals_list:
            if "color" not in vals:
                vals["color"] = random.randint(1, 11)
            images.append(vals.pop("image", False))
        favoris = super().create(vals_list)
        for favori, image in zip(favoris, images):
            if image:
                favori._ecrire_image(image)
        favoris.mapped("user_id")._is_favoris_maj_groupe()
        return favoris

    def write(self, vals):
        users = self.mapped("user_id")
        if "image" in vals:
            vals = dict(vals)
            image = vals.pop("image")
            self._ecrire_image(image)
        res = super().write(vals)
        if "user_id" in vals:
            (users | self.mapped("user_id"))._is_favoris_maj_groupe()
        return res

    def unlink(self):
        users = self.mapped("user_id")
        res = super().unlink()
        users._is_favoris_maj_groupe()
        return res

    def _ecrire_image(self, image):
        """Image enregistrée en superutilisateur : pour un utilisateur sans droit
        d'écriture sur les vues, Odoo enregistre un SVG en text/plain (protection
        contre le JavaScript dans les SVG) et le navigateur ne l'affiche pas.
        Image visible seulement par le propriétaire du favori (règle d'accès)."""
        self.check_access("write")
        super(IsFavoris, self.with_user(SUPERUSER_ID)).write({"image": image})

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
            "description_filtre": vals.get("description_filtre") or False,
            "date_mise_a_jour": fields.Datetime.now(),
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
            "description_filtre": f.description_filtre or "",
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
                "image_seule": bool(f.image) and f.image_seule,
                "view_type": f.view_type or (f.sudo().view_id.type if f.view_id else False),
                "chemin_menu": f.chemin_menu,
                "description_filtre": f.description_filtre or "",
                "date_creation": format_date(self.env, f.create_date),
                "date_mise_a_jour": format_date(self.env, f.date_mise_a_jour or f.create_date),
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
        # Vue lue en superutilisateur : pas de droit de lecture sur ir.ui.view pour les utilisateurs
        view = self.sudo().view_id
        if self.action_id:
            view_type = self.view_type or (view.type if view else False)
            res = {
                "action_id": self.action_id.id,
                "view_type": view_type,
                "res_id": self.res_id if view_type == "form" else False,
                "menu_id": self.menu_id.id,
            }
            if self.domain or self.context or self.sort:
                res["filtre"] = {
                    "id": self.id,
                    "name": self.description_filtre or self.name,
                    "domain": self.domain or "[]",
                    "context": self.context or "{}",
                    "sort": self.sort or "[]",
                }
            return res
        if view:
            # Anciens favoris sans action : ouverture de la vue seule
            return {"action": {
                "type": "ir.actions.act_window",
                "name": self.name,
                "res_model": view.model,
                "views": [(view.id, view.type)],
                "target": "current",
            }}
        return {}
