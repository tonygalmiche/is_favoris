/** @odoo-module **/

import {
    Component,
    onMounted,
    onWillStart,
    useExternalListener,
    useRef,
    useState,
} from "@odoo/owl";
import { ConfirmationDialog } from "@web/core/confirmation_dialog/confirmation_dialog";
import { registry } from "@web/core/registry";
import { useService } from "@web/core/utils/hooks";
import { FormViewDialog } from "@web/views/view_dialogs/form_view_dialog";
import { ECART, TAILLES, iconeVue, nomVue } from "../favoris_service";

/**
 * Page des favoris : grille de cases de taille fixe.
 * - Position mémorisée : ligne + case dans la ligne (cases vides possibles).
 * - Une ligne trop longue pour la fenêtre se replie et décale les lignes suivantes.
 * - Déplacement à la souris n'importe où sur l'écran : case vide (lignes vides
 *   comprises), ou insertion sur une case occupée (décalage vers la droite
 *   jusqu'au premier trou).
 */
export class IsFavorisPage extends Component {
    setup() {
        this.orm = useService("orm");
        this.action = useService("action");
        this.dialog = useService("dialog");
        this.menu = useService("menu");
        this.favorisService = useService("is_favoris");
        this.state = useState({
            taille: "moyenne",
            favoris: [],
            dragId: null,
            survol: null,
            largeur: window.innerWidth,
            hauteur: window.innerHeight,
        });
        this.grilleRef = useRef("grille");
        onMounted(() => this.mesurer());
        useExternalListener(window, "resize", () => this.mesurer());
        this.tailles = [
            { key: "petite", label: "Petites" },
            { key: "moyenne", label: "Moyennes" },
            { key: "grande", label: "Grandes" },
        ];
        onWillStart(() => Promise.all([this.charger(), this.favorisService.ensureLoaded()]));
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

    get pas() {
        return (TAILLES[this.state.taille] || TAILLES.moyenne) + ECART;
    }

    /** Nombre de cases par ligne affichée, selon la largeur de la grille */
    get nbColonnes() {
        return Math.max(1, Math.floor((this.state.largeur + ECART) / this.pas));
    }

    /**
     * Lignes à afficher : toute la surface de l'écran est découpée en cases,
     * pour pouvoir déposer un favori n'importe où (lignes vides comprises).
     * Une ligne plus longue que l'écran se replie sur plusieurs lignes affichées.
     */
    get lignes() {
        const nbColonnes = this.nbColonnes;
        const parLigne = new Map();
        for (const favori of this.state.favoris) {
            if (!parLigne.has(favori.ligne)) {
                parLigne.set(favori.ligne, []);
            }
            parLigne.get(favori.ligne).push(favori);
        }
        const derniere = this.state.favoris.length
            ? Math.max(...this.state.favoris.map((f) => f.ligne))
            : -1;
        // Assez de lignes pour remplir l'écran, + 1 ligne vide sous la dernière
        const nbLignesEcran = Math.floor((this.state.hauteur + ECART) / this.pas);
        const nbLignes = Math.max(derniere + 2, nbLignesEcran);
        const lignes = [];
        for (let numero = 0; numero < nbLignes; numero++) {
            const favoris = parLigne.get(numero) || [];
            // Complète jusqu'au bout de la dernière ligne affichée (même nombre de cases
            // pendant un déplacement, pour que rien ne bouge au survol)
            const occupees = favoris.length ? Math.max(...favoris.map((f) => f.colonne)) + 1 : 0;
            const nbCases = Math.max(1, Math.ceil(occupees / nbColonnes)) * nbColonnes;
            const cases = [];
            for (let colonne = 0; colonne < nbCases; colonne++) {
                cases.push({
                    key: `${numero}-${colonne}`,
                    ligne: numero,
                    colonne,
                    favori: favoris.find((f) => f.colonne === colonne) || null,
                });
            }
            lignes.push({ numero, cases });
        }
        return lignes;
    }

    mesurer() {
        const el = this.grilleRef.el;
        if (el) {
            const style = getComputedStyle(el);
            this.state.largeur =
                el.clientWidth - parseFloat(style.paddingLeft) - parseFloat(style.paddingRight);
            this.state.hauteur =
                el.clientHeight - parseFloat(style.paddingTop) - parseFloat(style.paddingBottom);
        }
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
        if (favori.image_seule) {
            classes.push("o_is_favoris_image_seule");
        }
        if (this.state.dragId === favori.id) {
            classes.push("o_is_favoris_deplace");
        }
        return classes.join(" ");
    }

    /** Infobulle : nom et chemin complet du menu d'origine */
    infobulle(favori) {
        return JSON.stringify({
            name: favori.name,
            chemin: favori.chemin_menu || "",
            vue: nomVue(favori.view_type),
            filtre: favori.description_filtre || "",
            creation: favori.date_creation,
            miseAJour:
                favori.date_mise_a_jour !== favori.date_creation ? favori.date_mise_a_jour : "",
        });
    }

    // ------------------------------------------------------------------
    // Ouverture, modification, suppression, taille
    // ------------------------------------------------------------------

    async ouvrir(favori) {
        const res = await this.orm.call("is.favoris", "get_ouverture", [[favori.id]]);
        if (res.action_id || res.view_type) {
            // Action enregistrée (action_id) ou action sans id mémorisée (res.action)
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
            await this.action.doAction(res.action_id || res.action, options);
            // Affiche l'application et les menus d'origine (et non plus « Favoris »),
            // comme le service des menus d'Odoo 16 après doAction
            if (res.menu_id && this.menu.getMenu(res.menu_id)) {
                this.menu.setCurrentMenu(res.menu_id);
            }
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
        const positions = favoris
            .filter((f) => avant.get(f.id) !== `${f.ligne}-${f.colonne}`)
            .map((f) => [f.id, f.ligne, f.colonne]);
        if (positions.length) {
            await this.orm.call("is.favoris", "enregistrer_positions", [positions]);
        }
    }
}

IsFavorisPage.template = "is_favoris.Page";
IsFavorisPage.props = ["*"];

registry.category("actions").add("is_favoris.page", IsFavorisPage);
