/** @odoo-module **/

import { useSubEnv } from "@odoo/owl";
import { patch } from "@web/core/utils/patch";
import { FormController } from "@web/views/form/form_controller";

/**
 * Donne à l'étoile (dans le panneau de contrôle) accès au modèle du formulaire,
 * pour connaître l'enregistrement affiché (navigation suivant / précédent comprise).
 */
patch(FormController.prototype, {
    setup() {
        super.setup(...arguments);
        useSubEnv({ isFavorisFormModel: this.model });
    },
});
