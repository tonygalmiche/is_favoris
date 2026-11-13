/** @odoo-module **/

import { Component, onMounted, onWillStart, useState } from "@odoo/owl";
import { Dropdown } from "@web/core/dropdown/dropdown";
import { DropdownItem } from "@web/core/dropdown/dropdown_item";
import { useBus, useService } from "@web/core/utils/hooks";
import { ControlPanel } from "@web/search/control_panel/control_panel";
import { actionSansId } from "../favoris_service";

/**
 * Étoile à côté du titre de la page (avant la roue dentée) :
 * - grise : un clic ajoute la page aux favoris ;
 * - jaune : la page (menu + type de vue, + enregistrement sur un formulaire)
 *   a déjà un favori ; un clic ouvre un petit menu.
 */
export class IsFavorisEtoile extends Component {
    static template = "is_favoris.Etoile";
    static components = { Dropdown, DropdownItem };
    static props = {};

    setup() {
        this.orm = useService("orm");
        this.notification = useService("notification");
        this.favorisService = useService("is_favoris");
        this.favoris = useState(this.favorisService.state);
        this.formModel = this.env.isFavorisFormModel
            ? useState(this.env.isFavorisFormModel)
            : null;
        this.actionService = useService("action");
        this.menu = useService("menu");
        // Action renvoyée par un bouton (sans id, ou modifiée en Python) : connue seulement
        // quand la vue est affichée (pile des actions mise à jour après le montage de la vue)
        this.sansId = useState({ action: null });
        const chercherAction = () => {
            const controller = this.actionService.currentController;
            // Seulement pour la vue de cette étoile : la vue recopie la config du contrôleur
            // (env.config est un autre objet), mais garde ses fonctions, propres au contrôleur
            const getDisplayName = this.env.config?.getDisplayName;
            const memeVue = Boolean(getDisplayName) && controller?.config?.getDisplayName === getDisplayName;
            if (memeVue && !this.sansId.action) {
                const info = actionSansId(controller.action);
                if (info) {
                    this.sansId.action = info;
                    this.favorisService.ensureLoaded();
                }
            }
        };
        onMounted(chercherAction);
        useBus(this.env.bus, "ACTION_MANAGER:UI-UPDATED", chercherAction);
        onWillStart(() => (this.visible ? this.favorisService.ensureLoaded() : null));
    }

    get actionId() {
        const actionId = this.env.config?.actionId;
        return typeof actionId === "number" ? actionId : false;
    }

    /** Action de la page : renvoyée par un bouton (actionCle), sinon enregistrée (actionId) */
    get cible() {
        const cle = this.sansId.action?.cle;
        return cle ? { actionId: false, actionCle: cle } : { actionId: this.actionId, actionCle: false };
    }

    get viewType() {
        return this.env.config?.viewType;
    }

    get resId() {
        return this.viewType === "form" ? this.formModel?.root?.resId || false : false;
    }

    get visible() {
        const cible = this.cible;
        if (this.env.inDialog || !(cible.actionId || cible.actionCle) || !this.viewType || !this.env.searchModel) {
            return false;
        }
        return this.viewType !== "form" || Boolean(this.resId);
    }

    get existants() {
        // Lecture via this.favoris (useState) : l'étoile se redessine quand la liste change
        if (!this.favoris.loaded) {
            return [];
        }
        return this.favorisService.find(this.favoris.favoris, this.cible, this.viewType, this.resId);
    }

    /** Favori ouvert depuis la page des favoris (étiquette ⭐ active dans la recherche) */
    get favoriActifId() {
        const searchModel = this.env.searchModel;
        for (const { searchItemId } of searchModel?.query || []) {
            const id = searchModel.searchItems[searchItemId]?.isFavorisId;
            if (id) {
                return id;
            }
        }
        return false;
    }

    /** Favoris à afficher dans le menu : le favori actif seul s'il y en a un, sinon tous */
    get favorisMenu() {
        const liste = this.existants;
        const actif = liste.find((f) => f.id === this.favoriActifId);
        return actif ? [actif] : liste;
    }

    /** Photo de la vue affichée, comme un favori standard d'Odoo */
    valeursVue() {
        const sansId = this.sansId.action;
        const vals = {
            action_id: sansId ? false : this.actionId,
            view_type: this.viewType,
            res_id: this.resId,
            largeur: window.innerWidth,
        };
        if (sansId) {
            const breadcrumbs = this.env.config?.breadcrumbs || [];
            vals.action_data = sansId.data;
            vals.action_cle = sansId.cle;
            vals.menu_id = this.menu.getCurrentApp()?.id || false;
            // Page précédente du fil d'Ariane (ex. le client), pour le nom du favori
            vals.titre_parent = breadcrumbs.length > 1 ? breadcrumbs[breadcrumbs.length - 2]?.name || "" : "";
        }
        if (this.viewType !== "form") {
            const irFilter = this.env.searchModel.getIrFilterValues({});
            vals.domain = irFilter.domain;
            vals.context = irFilter.context;
            vals.sort = irFilter.sort;
            vals.description_filtre = this.descriptionFiltre();
        }
        return vals;
    }

    /** Texte des étiquettes affichées dans la recherche, ex. « En cours · Client : Dupont · Regroupé par Étape > Commercial » */
    descriptionFiltre() {
        return this.env.searchModel.facets
            .map((facet) => {
                const valeurs = facet.values.join(` ${facet.separator} `);
                if (facet.type === "field") {
                    return `${facet.title} : ${valeurs}`;
                }
                if (facet.type === "groupBy") {
                    return `Regroupé par ${valeurs}`;
                }
                return valeurs;
            })
            .join(" · ");
    }

    async ajouter() {
        const res = await this.orm.call("is.favoris", "creer_depuis_vue", [this.valeursVue()]);
        await this.favorisService.reload();
        if (res) {
            this.notification.add(`« ${res.name} » ajouté aux favoris`, { type: "success" });
        }
    }

    async mettreAJour(favori) {
        await this.orm.call("is.favoris", "mettre_a_jour_depuis_vue", [
            [favori.id],
            this.valeursVue(),
        ]);
        await this.favorisService.reload();
        this.notification.add(`« ${favori.name} » mis à jour`, { type: "success" });
    }

    async retirer(favori) {
        await this.orm.unlink("is.favoris", [favori.id]);
        await this.favorisService.reload();
        this.notification.add(`« ${favori.name} » retiré des favoris`, { type: "info" });
    }
}

ControlPanel.components = { ...ControlPanel.components, IsFavorisEtoile };
