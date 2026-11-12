/** @odoo-module **/

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
            user_id: false,
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

    async _deleteIrFilters(searchItem) {
        if (searchItem.isFavorisId) {
            // Favori is_favoris : rien en base côté ir.filters
            return;
        }
        return super._deleteIrFilters(searchItem);
    },
});
