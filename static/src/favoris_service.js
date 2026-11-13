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
 * Action à mémoriser telle quelle (renvoyée par un bouton) : action d'origine et clé
 * qui l'identifie (modèle, domaine, nom), ou null pour une action enregistrée
 * ouverte telle quelle (menu), mémorisée par son id.
 * - Sans id : action construite en Python.
 * - Avec un id mais modifiée en Python (ex. bouton Factures de la fiche client :
 *   action standard avec le domaine du client) : domaine en liste ou contexte en
 *   dict ; chargée depuis la base, l'action a un domaine et un contexte en texte.
 */
export function actionSansId(action) {
    if (!action || !action._originalAction) {
        return null;
    }
    let origine;
    try {
        origine = JSON.parse(action._originalAction);
    } catch {
        return null;
    }
    if (origine?.type !== "ir.actions.act_window" || !origine.res_model) {
        return null;
    }
    const modifiee =
        typeof origine.id !== "number" ||
        Array.isArray(origine.domain) ||
        Boolean(origine.context && typeof origine.context === "object");
    if (!modifiee) {
        return null;
    }
    return {
        data: action._originalAction,
        cle: JSON.stringify([origine.res_model, origine.domain || [], origine.name || ""]),
    };
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
            /** actionId : action enregistrée ; sinon actionCle : action sans id (bouton) */
            find(favoris, { actionId, actionCle }, viewType, resId) {
                return favoris.filter(
                    (f) =>
                        (actionId ? f.action_id === actionId : !f.action_id && f.action_cle === actionCle) &&
                        f.view_type === viewType &&
                        (viewType !== "form" || f.res_id === resId)
                );
            },
        };
    },
};

registry.category("services").add("is_favoris", isFavorisService);
