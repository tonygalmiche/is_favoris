/** @odoo-module **/

import { Component, useState } from "@odoo/owl";
import { registry } from "@web/core/registry";
import { useService } from "@web/core/utils/hooks";
import { AccordionItem } from "@web/core/dropdown/accordion_item";

const favoriteMenuRegistry = registry.category("favoriteMenu");

export class AddToFavoritesItem extends Component {
    static template = "is_favoris.AddToFavoritesItem";
    static components = { AccordionItem };

    setup() {
        this.orm = useService("orm");
        this.notification = useService("notification");
        this.state = useState({
            name: this.env.config.getDisplayName() || "",
        });
    }

    async onAddFavorite() {
        const name = this.state.name;
        if (!name) {
            this.notification.add("Veuillez saisir un nom", { type: "danger" });
            return;
        }

        // Trouver l'ID de la vue courante
        const viewType = this.env.config.viewType;
        const views = this.env.config.views || [];
        const actionId = this.env.config.actionId;
        let viewId = false;
        
        // views est souvent [[id, type], ...]
        const currentView = views.find(v => v[1] === viewType);
        if (currentView) {
            viewId = currentView[0];
        }

        // Si l'ID n'est pas explicite dans l'action, on récupère l'ID de la vue par défaut
        if (!viewId) {
            try {
                const resModel = this.env.searchModel.resModel;
                // On demande au serveur quelle vue est utilisée pour ce modèle et ce type
                const result = await this.orm.call(resModel, "get_views", [], {
                    views: [[false, viewType]],
                });
                if (result.views && result.views[viewType]) {
                    viewId = result.views[viewType].id;
                }
            } catch (error) {
                console.error("Erreur lors de la récupération de la vue par défaut", error);
            }
        }
        // Mais souvent viewId est un entier.
        
        if (!viewId) {
             // Fallback: essayer de récupérer via viewDescription si disponible
             // Mais ici on n'a pas accès facile à viewDescription complet
             this.notification.add("Impossible de récupérer l'ID de la vue", { type: "danger" });
             return;
        }

        try {
            await this.orm.call("is.favoris", "create_from_view", [name, viewId, actionId]);
            this.notification.add("Il faut rafraîchir votre navigateur pour voir le menu « Favoris » apparaître.", { title: "Vue ajoutée aux favoris", type: "success" });
            // Reset name
            this.state.name = "";
        } catch (e) {
            this.notification.add("Erreur lors de l'ajout aux favoris", { type: "danger" });
            console.error(e);
        }
    }
}

favoriteMenuRegistry.add("add-to-favorites-item", {
    Component: AddToFavoritesItem,
    groupNumber: 4,
}, { sequence: 10 });
