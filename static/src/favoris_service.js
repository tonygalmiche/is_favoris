/** @odoo-module **/

import { reactive } from "@odoo/owl";
import { registry } from "@web/core/registry";

export const TAILLES = { petite: 80, moyenne: 100, grande: 130 };
export const ECART = 12;

const ICONES_VUES = {
    list: "fa-list",
    kanban: "fa-th-large",
    pivot: "fa-table",
    graph: "fa-bar-chart",
    calendar: "fa-calendar",
    form: "fa-file-text-o",
    activity: "fa-clock-o",
    gantt: "fa-tasks",
    map: "fa-map-marker",
    hierarchy: "fa-sitemap",
};

const NOMS_VUES = {
    list: "Liste",
    kanban: "Kanban",
    pivot: "Tableau croisé dynamique",
    graph: "Graphique",
    calendar: "Calendrier",
    form: "Formulaire",
    activity: "Activités",
    gantt: "Gantt",
    map: "Carte",
    hierarchy: "Hiérarchie",
};

export function nomVue(viewType) {
    return NOMS_VUES[viewType] || viewType || "";
}

export function iconeVue(viewType) {
    return ICONES_VUES[viewType] || "fa-star";
}

/**
 * Liste des favoris de l'utilisateur, chargée une seule fois,
 * pour savoir si l'étoile de la page affichée est jaune.
 */
export const isFavorisService = {
    dependencies: ["orm", "menu"],
    start(env, { orm, menu }) {
        const state = reactive({ loaded: false, favoris: [] });
        let loading = null;

        async function load() {
            const avant = state.loaded ? state.favoris.length : null;
            state.favoris = await orm.call("is.favoris", "get_etoile_data", []);
            state.loaded = true;
            // Premier favori ajouté ou dernier retiré : le menu Favoris apparaît ou disparaît
            if (avant !== null && !avant !== !state.favoris.length) {
                await menu.reload();
            }
        }

        return {
            state,
            ensureLoaded() {
                if (!state.loaded && !loading) {
                    loading = load().finally(() => (loading = null));
                }
                return loading;
            },
            reload() {
                loading = load().finally(() => (loading = null));
                return loading;
            },
            find(favoris, actionId, viewType, resId) {
                return favoris.filter(
                    (f) =>
                        f.action_id === actionId &&
                        f.view_type === viewType &&
                        (viewType !== "form" || f.res_id === resId)
                );
            },
        };
    },
};

registry.category("services").add("is_favoris", isFavorisService);
