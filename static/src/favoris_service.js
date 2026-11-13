import { proxy } from "@odoo/owl";
import { registry } from "@web/core/registry";

export const TAILLES = { petite: 80, moyenne: 100, grande: 130 };
export const ECART = 12;

// Odoo 20 : icônes Material Symbols (data-icon), mêmes icônes que les boutons de changement de vue
const ICONES_VUES = {
    list: "reorder",
    kanban: "oi_view-kanban",
    pivot: "oi_view-pivot",
    graph: "bar_chart",
    calendar: "calendar_today",
    form: "description",
    activity: "schedule",
    gantt: "task",
    map: "location_on",
    hierarchy: "account_tree",
};

// Icônes au choix (champ icone) : clés Font Awesome conservées (données reprises de
// la 16 et de la 18), affichées avec l'icône Material équivalente
const ICONES = {
    "fa-star": "star",
    "fa-heart": "favorite",
    "fa-bookmark": "bookmark",
    "fa-flag": "flag",
    "fa-bell": "notifications",
    "fa-list": "view_list",
    "fa-th-large": "grid_view",
    "fa-table": "table_chart",
    "fa-bar-chart": "bar_chart",
    "fa-line-chart": "show_chart",
    "fa-pie-chart": "pie_chart",
    "fa-calendar": "calendar_today",
    "fa-clock-o": "schedule",
    "fa-tasks": "task",
    "fa-check-square-o": "check_box",
    "fa-file-text-o": "description",
    "fa-folder-open-o": "folder_open",
    "fa-archive": "archive",
    "fa-envelope-o": "mail",
    "fa-phone": "phone",
    "fa-user": "person",
    "fa-users": "group",
    "fa-building-o": "business",
    "fa-truck": "local_shipping",
    "fa-cubes": "inventory_2",
    "fa-shopping-cart": "shopping_cart",
    "fa-credit-card": "credit_card",
    "fa-eur": "euro",
    "fa-money": "payments",
    "fa-calculator": "calculate",
    "fa-cogs": "settings",
    "fa-wrench": "build",
    "fa-industry": "factory",
    "fa-globe": "language",
    "fa-search": "search",
    "fa-exclamation-triangle": "warning",
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
    return ICONES_VUES[viewType] || "star";
}

export function iconeChoisie(icone) {
    return ICONES[icone] || false;
}

/**
 * Liste des favoris de l'utilisateur, chargée une seule fois,
 * pour savoir si l'étoile de la page affichée est jaune.
 */
export const isFavorisService = {
    dependencies: ["orm", "menu"],
    start(env, { orm, menu }) {
        // Owl 3 : proxy() au lieu de reactive() ; lu pendant le rendu, il redessine l'étoile
        const state = proxy({ loaded: false, favoris: [] });
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
