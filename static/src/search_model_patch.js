import { user } from "@web/core/user";
import { patch } from "@web/core/utils/patch";
import { SearchModel } from "@web/search/search_model";

/**
 * Ouverture d'un favori : le filtre mémorisé arrive dans le contexte de l'action
 * (clé is_favoris_filtre). Il est ajouté comme favori par défaut, en mémoire
 * seulement (aucun ir.filters créé) : une facette « nom du favori », retirable.
 */
patch(SearchModel.prototype, {
    _createGroupOfFavorites(irFilters) {
        const filtre = this.globalContext.is_favoris_filtre;
        delete this.globalContext.is_favoris_filtre;
        if (!filtre) {
            return super._createGroupOfFavorites(irFilters);
        }
        const autres = irFilters.map((f) => ({ ...f, is_default: false }));
        const irFilter = {
            id: false,
            is_favoris_id: filtre.id,
            name: filtre.name,
            domain: filtre.domain,
            context: filtre.context,
            sort: filtre.sort,
            // Odoo 20 : user_ids (un seul utilisateur = favori personnel)
            user_ids: [user.userId],
            is_default: true,
        };
        return super._createGroupOfFavorites([...autres, irFilter]);
    },

    _irFilterToFavorite(irFilter) {
        const favorite = super._irFilterToFavorite(irFilter);
        if (irFilter.is_favoris_id) {
            favorite.isFavorisId = irFilter.is_favoris_id;
        }
        return favorite;
    },

    /**
     * Odoo 20 : au changement de vue ou au retour par le fil d'Ariane, les favoris
     * sont recalés sur les ir.filters ; celui de is_favoris (sans ir.filters) serait
     * retiré. Il est mis de côté le temps du recalage.
     */
    _reconciliateFavorites() {
        const items = Object.values(this.searchItems).filter((item) => item.isFavorisId);
        for (const item of items) {
            item.type = "is_favoris";
        }
        try {
            return super._reconciliateFavorites();
        } finally {
            for (const item of items) {
                item.type = "favorite";
            }
        }
    },
});
