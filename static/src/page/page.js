/** @odoo-module **/

import { Component, onWillStart, useState } from "@odoo/owl";
import { ConfirmationDialog } from "@web/core/confirmation_dialog/confirmation_dialog";
import { registry } from "@web/core/registry";
import { useService } from "@web/core/utils/hooks";
import { FormViewDialog } from "@web/views/view_dialogs/form_view_dialog";
import { ECART, TAILLES, iconeVue } from "../favoris_service";

/**
 * Page des favoris : grille de cases de taille fixe.
 * - Position mémorisée : ligne + case dans la ligne (cases vides possibles).
 * - Une ligne trop longue pour la fenêtre se replie et décale les lignes suivantes.
 * - Déplacement à la souris : case vide, insertion sur une case occupée
 *   (décalage vers la droite jusqu'au premier trou), ou nouvelle ligne.
 */
export class IsFavorisPage extends Component {
    static template = "is_favoris.Page";
    static props = ["*"];

    setup() {
        this.orm = useService("orm");
        this.action = useService("action");
        this.dialog = useService("dialog");
        this.favorisService = useService("is_favoris");
        this.state = useState({
            taille: "moyenne",
            favoris: [],
            dragId: null,
            survol: null,
        });
        this.tailles = [
            { key: "petite", label: "Petites" },
            { key: "moyenne", label: "Moyennes" },
            { key: "grande", label: "Grandes" },
        ];
        onWillStart(() => this.charger());
    }

    async charger() {
        const data = await this.orm.call("is.favoris", "get_page_data", []);
        this.state.taille = data.taille;
        this.state.favoris = data.favoris;
    }

    // ------------------------------------------------------------------
    // Affichage
    // ------------------------------------------------------------------

    get style() {
        return `--is-favoris-taille: ${TAILLES[this.state.taille] || TAILLES.moyenne}px; --is-favoris-ecart: ${ECART}px;`;
    }

    /** Lignes à afficher : liste de cases (favori ou vide), dans l'ordre mémorisé */
    get lignes() {
        const parLigne = new Map();
        for (const favori of this.state.favoris) {
            if (!parLigne.has(favori.ligne)) {
                parLigne.set(favori.ligne, []);
            }
            parLigne.get(favori.ligne).push(favori);
        }
        const lignes = [];
        for (const numero of [...parLigne.keys()].sort((a, b) => a - b)) {
            const favoris = parLigne.get(numero);
            const nbCases = Math.max(...favoris.map((f) => f.colonne)) + 1;
            const cases = [];
            for (let colonne = 0; colonne < nbCases; colonne++) {
                cases.push({
                    key: `${numero}-${colonne}`,
                    ligne: numero,
                    colonne,
                    favori: favoris.find((f) => f.colonne === colonne) || null,
                });
            }
            if (this.state.dragId) {
                // Case de plus en fin de ligne pendant un déplacement
                cases.push({ key: `${numero}-${nbCases}`, ligne: numero, colonne: nbCases, favori: null });
            }
            lignes.push({ numero, cases });
        }
        return lignes;
    }

    icone(favori) {
        return favori.icone || iconeVue(favori.view_type);
    }

    imageUrl(favori) {
        return `/web/image/is.favoris/${favori.id}/image?unique=${encodeURIComponent(favori.write_date)}`;
    }

    classesCarte(favori) {
        const couleur = favori.image ? 0 : favori.color || 0;
        const classes = ["o_is_favoris_carte", `o_is_favoris_couleur_${couleur}`];
        if (favori.mise_en_avant) {
            classes.push("o_is_favoris_mis_en_avant");
        }
        if (this.state.dragId === favori.id) {
            classes.push("o_is_favoris_deplace");
        }
        return classes.join(" ");
    }

    /** Infobulle : nom et chemin complet du menu d'origine */
    infobulle(favori) {
        return JSON.stringify({ name: favori.name, chemin: favori.chemin_menu || "" });
    }

    // ------------------------------------------------------------------
    // Ouverture, modification, suppression, taille
    // ------------------------------------------------------------------

    async ouvrir(favori) {
        const res = await this.orm.call("is.favoris", "get_ouverture", [[favori.id]]);
        if (res.url) {
            window.open(res.url, res.new_tab ? "_blank" : "_self");
        } else if (res.action_id) {
            const options = { clearBreadcrumbs: true };
            if (res.view_type) {
                options.viewType = res.view_type;
            }
            if (res.res_id) {
                options.props = { resId: res.res_id };
            }
            if (res.filtre) {
                options.additionalContext = { is_favoris_filtre: res.filtre };
            }
            await this.action.doAction(res.action_id, options);
        } else if (res.action) {
            await this.action.doAction(res.action, { clearBreadcrumbs: true });
        }
    }

    modifier(favori) {
        this.dialog.add(FormViewDialog, {
            resModel: "is.favoris",
            resId: favori.id,
            title: "Modifier le favori",
            onRecordSaved: async () => {
                await this.charger();
                await this.favorisService.reload();
            },
        });
    }

    supprimer(favori) {
        this.dialog.add(ConfirmationDialog, {
            title: "Supprimer le favori",
            body: `Supprimer le favori « ${favori.name} » ?`,
            confirmLabel: "Supprimer",
            confirm: async () => {
                await this.orm.unlink("is.favoris", [favori.id]);
                await this.charger();
                await this.favorisService.reload();
            },
            cancel: () => {},
        });
    }

    async changerTaille(taille) {
        this.state.taille = taille;
        await this.orm.call("is.favoris", "set_taille", [taille]);
    }

    ouvrirListe() {
        this.action.doAction("is_favoris.action_is_favoris_liste", { clearBreadcrumbs: true });
    }

    // ------------------------------------------------------------------
    // Déplacement à la souris
    // ------------------------------------------------------------------

    onDragStart(ev, favori) {
        ev.dataTransfer.effectAllowed = "move";
        ev.dataTransfer.setData("text/plain", String(favori.id));
        this.state.dragId = favori.id;
    }

    onDragEnd() {
        this.state.dragId = null;
        this.state.survol = null;
    }

    onDragOver(ev, cible) {
        if (!this.state.dragId) {
            return;
        }
        ev.preventDefault();
        ev.dataTransfer.dropEffect = "move";
        this.state.survol = cible;
    }

    async onDrop(ev, ligne, colonne) {
        ev.preventDefault();
        const id = this.state.dragId;
        this.onDragEnd();
        if (id) {
            await this.deplacer(id, ligne, colonne);
        }
    }

    async onDropNouvelleLigne(ev) {
        const lignes = this.state.favoris.map((f) => f.ligne);
        await this.onDrop(ev, lignes.length ? Math.max(...lignes) + 1 : 0, 0);
    }

    async deplacer(id, ligne, colonne) {
        const favoris = this.state.favoris;
        const favori = favoris.find((f) => f.id === id);
        if (!favori || (favori.ligne === ligne && favori.colonne === colonne)) {
            return;
        }
        const avant = new Map(favoris.map((f) => [f.id, `${f.ligne}-${f.colonne}`]));
        const autres = favoris.filter((f) => f.id !== id);
        const occupe = (c) => autres.some((f) => f.ligne === ligne && f.colonne === c);
        if (occupe(colonne)) {
            // Insertion : décalage vers la droite jusqu'au premier trou
            let trou = colonne;
            while (occupe(trou)) {
                trou++;
            }
            for (const f of autres) {
                if (f.ligne === ligne && f.colonne >= colonne && f.colonne < trou) {
                    f.colonne++;
                }
            }
        }
        favori.ligne = ligne;
        favori.colonne = colonne;
        this.compacterLignes();
        const positions = favoris
            .filter((f) => avant.get(f.id) !== `${f.ligne}-${f.colonne}`)
            .map((f) => [f.id, f.ligne, f.colonne]);
        if (positions.length) {
            await this.orm.call("is.favoris", "enregistrer_positions", [positions]);
        }
    }

    /** Supprime les lignes vides : lignes numérotées 0, 1, 2… */
    compacterLignes() {
        const numeros = [...new Set(this.state.favoris.map((f) => f.ligne))].sort((a, b) => a - b);
        const nouveau = new Map(numeros.map((n, index) => [n, index]));
        for (const f of this.state.favoris) {
            f.ligne = nouveau.get(f.ligne);
        }
    }
}

registry.category("actions").add("is_favoris.page", IsFavorisPage);
