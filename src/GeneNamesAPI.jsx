import axios from "axios/index";
import {action, extendObservable} from "mobx";

/**
 * Component for getting the mapping of hugoSymbols to entrezIDs for every possible gene (used before local files are loaded)
 */
class GeneNamesAPI {
    constructor() {
        this.geneList = {};
        extendObservable(this, {
            geneListLoaded: false,
            getAllGeneSymbols: action(() => {
                axios.get("http://rest.genenames.org/fetch/status/Approved").then(response => {
                    response.data.response.docs.forEach(d => this.geneList[d.symbol] = parseInt(d.entrez_id, 10));
                    this.geneListLoaded = true;
                })
            })
        });
    }

    /**
     * gets entrez gene ids for hgnc symbols
     * @param {string[]} hgncSymbols
     * @param {returnDataCallback} callback
     */
    getGeneIDs(hgncSymbols, callback) {
        let returnArray = [];
        let invalidSymbols = [];
        hgncSymbols.forEach(d => {
            if (d in this.geneList) {
                returnArray.push({
                    hgncSymbol: d,
                    entrezGeneId: this.geneList[d]
                })
            }
            else {
                invalidSymbols.push(d);
            }
        });
        if (invalidSymbols.length === hgncSymbols.length) {
            alert("No valid symbols found");
        }
        else {
            if (invalidSymbols.length > 0) {
                alert('WARNING the following symbols are not valid: ' + invalidSymbols);
            }
            callback(returnArray);
        }
    }
}

export default GeneNamesAPI;
