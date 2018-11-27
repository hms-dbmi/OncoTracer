import OriginalVariable from "./TemporalHeatmap/OriginalVariable";


/*
gets the data with the cBioAPI and gives it to the other stores
 */
class MolProfileMapping {
    constructor(rootStore) {
        this.rootStore = rootStore;
        this.mutationOrder = ['trunc', 'inframe', 'promoter', 'missense', 'other'];
        this.currentMutations = [];
        this.currentMolecular = {};
        this.currentIds = [];

    }

    /**
     * Gets all currently selected mutations
     * @param mappingType
     */
    getMutationsProfile(mappingType) {
        let variables = [];
        if (this.currentMutations.length !== 0) {
            let datatype;
            if (mappingType === "Binary") {
                datatype = "BINARY";
            }
            else if (mappingType === "Variant allele frequency") {
                datatype = "NUMBER"
            }
            else {
                datatype = "STRING"
            }
            let geneDict = {};
            let noMutationsFound = [];
            this.currentIds.forEach(d => {
                const containedIds = this.currentMutations.filter(entry => entry.entrezGeneId === d.entrezGeneId);
                geneDict[d.entrezGeneId] = containedIds;
                if (containedIds.length === 0) {
                    noMutationsFound.push({hgncSymbol: d.hgncSymbol, entrezGeneId: d.entrezGeneId});
                }
            });
            let confirm = false;
            if (noMutationsFound.length > 0) {
                confirm = window.confirm("WARNING: No mutations found for " + noMutationsFound.map(entry => entry.hgncSymbol) + "\n Add anyway?");
            }
            if (!confirm) {
                noMutationsFound.forEach(d => {
                    delete geneDict[d.entrezGeneId];
                });
            }
            for (let entry in geneDict) {
                if (!this.rootStore.timepointStore.variableStores.sample.isDisplayed(entry + mappingType)) {
                    const symbol = this.currentIds.filter(d => d.entrezGeneId === parseInt(entry, 10))[0].hgncSymbol;
                    let domain = [];
                    if (mappingType === "Mutation type") {
                        domain = this.mutationOrder;
                    }
                    variables.push(new OriginalVariable(entry + mappingType, symbol + "_" + mappingType, datatype, "mutation in" + symbol, [], domain, this.createMutationMapping(geneDict[entry], mappingType), mappingType));
                }
            }

        }
        return variables;
    }

    /**
     * gets data corresponding to selected HUGOsymbols in a molecular profile
     */
    getMolecularProfile(profileId) {
        let variables = [];
        const profile = this.rootStore.cbioAPI.molecularProfiles.filter(d => d.molecularProfileId === profileId)[0];
        if (this.currentMolecular[profileId].length !== 0) {
            let geneDict = {};
            let noMutationsFound = [];
            this.currentIds.forEach(d => {
                const containedIds = this.currentMolecular[profileId].filter(entry => entry.entrezGeneId === d.entrezGeneId);
                geneDict[d.entrezGeneId] = containedIds;
                if (containedIds.length === 0) {
                    noMutationsFound.push({hgncSymbol: d.hgncSymbol, entrezGeneId: d.entrezGeneId});
                }
            });
            let confirm = false;
            if (noMutationsFound.length > 0) {
                confirm = window.confirm("WARNING: No data found for " + noMutationsFound.map(entry => entry.hgncSymbol) + "\n Add anyway?");
            }
            if (!confirm) {
                noMutationsFound.forEach(d => {
                    delete geneDict[d.entrezGeneId];
                });
            }
            for (let entry in geneDict) {
                if (!this.rootStore.timepointStore.variableStores.sample.isDisplayed(entry)) {
                    const symbol = this.currentIds.filter(d => d.entrezGeneId === parseInt(entry, 10))[0].hgncSymbol;
                    let domain = [];
                    let datatype = "NUMBER";
                    if (profile.molecularAlterationType === "COPY_NUMBER_ALTERATION") {
                        domain = ["-2", "-1", "0", "1", "2"];
                        datatype = "ORDINAL";
                    }
                    variables.push(new OriginalVariable(entry + "_" + profileId, symbol + "_" + profile.molecularAlterationType, datatype, profile.name + ": " + symbol, [], domain, this.createMolecularMapping(geneDict[entry], datatype), profileId));
                }
            }
        }
        return variables;
    }

    loadIds(HUGOsymbols, callback) {
        this.currentIds = [];
        this.currentMutations = [];
        this.currentMolecular = {};
        this.rootStore.cbioAPI.getGeneIDs(HUGOsymbols, entrezIDs => {
            this.currentIds = entrezIDs;
            callback();
        });
    }

    loadMutations(callback) {
        if (this.currentIds.length !== 0) {
            this.rootStore.cbioAPI.getMutations(this.rootStore.study.studyId, this.currentIds, response => {
                this.currentMutations = response;
                callback()
            })
        }
    }

    loadMolecularData(profileId, callback) {
        if (this.currentIds.length !== 0) {
            this.rootStore.cbioAPI.getMolecularValues(this.rootStore.study.studyId, profileId, this.currentIds, response => {
                this.currentMolecular[profileId] = response;
                callback()
            })
        }
    }


    getMutations(profileId, HUGOsymbols, mappingType, callback) {
        this.loadIds(HUGOsymbols, () => {
            if (this.rootStore.cbioAPI.molecularProfiles.filter(d => d.molecularProfileId === profileId)[0].molecularAlterationType === "MUTATION_EXTENDED") {
                this.loadMutations(() => {
                    callback(this.getMutationsProfile(mappingType))
                })
            }
            else {
                this.loadMolecularData(profileId, () => {
                    callback(this.getMolecularProfile(profileId));
                });
            }
        })
    }

    getMultipleProfiles(profileIds, mappingTypes) {
        let variables = [];
        mappingTypes.forEach(d => variables = variables.concat(this.getMutationsProfile(d)));
        profileIds.map(d => variables = variables.concat(this.getMolecularProfile(d)));
        return variables
    }


    /**
     * creates sample id mapping for mutations
     * @param list
     * @param mappingType
     */
    createMutationMapping(list, mappingType) {
        let mappingFunction;
        if (mappingType === "Binary") {
            mappingFunction = currentSample => (list.filter(d => d.sampleId === currentSample).length > 0)
        }
        else if (mappingType === "Protein change") {
            mappingFunction = currentSample => {
                const entry = list.filter(d => d.sampleId === currentSample)[0];
                let proteinChange = undefined;
                if (entry !== undefined) {
                    proteinChange = entry.proteinChange;
                }
                return (proteinChange);
            }
        }
        else if (mappingType === "Mutation type") {
            mappingFunction = currentSample => {
                const entries = list.filter(d => d.sampleId === currentSample);
                let mutationType = undefined;
                if (entries.length > 0) {
                    let indices = [];
                    entries.forEach(d => {
                        if ((d.proteinChange || "").toLowerCase() === "promoter") {
                            // promoter mutations aren't labeled as such in mutationType, but in proteinChange, so we must detect it there
                            indices.push(this.mutationOrder.indexOf("promoter"));
                        }
                        else {
                            let simplifiedMutationType = MolProfileMapping.getMutationType(d.mutationType);
                            if (simplifiedMutationType !== "fusion") {
                                if (simplifiedMutationType !== "missense" && simplifiedMutationType !== "inframe" && simplifiedMutationType !== "fusion" && simplifiedMutationType !== "other") {
                                    simplifiedMutationType = "trunc"
                                }
                                indices.push(this.mutationOrder.indexOf(simplifiedMutationType));
                            }
                        }
                    });
                    if (indices.length > 0) {
                        mutationType = this.mutationOrder[Math.min(...indices)];
                    }
                }
                return mutationType;
            }
        }
        else {
            mappingFunction = currentSample => {
                const entries = list.filter(d => d.sampleId === currentSample && (MolProfileMapping.getMutationType(d.mutationType) === "missense" || MolProfileMapping.getMutationType(d.mutationType) === "nonsense"));
                let vaf = 0;
                if (entries.length === 0) {
                    vaf = undefined;
                }
                entries.forEach(entry => {
                    vaf += entry.tumorAltCount / (entry.tumorAltCount + entry.tumorRefCount);

                });
                return vaf === undefined ? vaf : vaf / entries.length;
            }
        }
        let mapper = {};
        this.rootStore.timepointStructure.forEach(d => {
            d.forEach(f => {
                if (list.length === 0) {
                    mapper[f.sample] = undefined;
                }
                else {
                    mapper[f.sample] = mappingFunction(f.sample);
                }
            });
        });
        return mapper;
    }

    static getMutationType(type) {
        let ret = "";
        type = (typeof type === "string") ? type.toLowerCase() : "";
        switch (type) {
            case "missense_mutation":
            case "missense":
            case "missense_variant":
                ret = "missense";
                break;
            case "frame_shift_ins":
            case "frame_shift_del":
            case "frameshift":
            case "frameshift_deletion":
            case "frameshift_insertion":
            case "de_novo_start_outofframe":
            case "frameshift_variant":
                ret = "frameshift";
                break;
            case "nonsense_mutation":
            case "nonsense":
            case "stopgain_snv":
                ret = "nonsense";
                break;
            case "splice_site":
            case "splice":
            case "splice site":
            case "splicing":
            case "splice_site_snp":
            case "splice_site_del":
            case "splice_site_indel":
            case "splice_region":
                ret = "splice";
                break;
            case "translation_start_site":
            case "start_codon_snp":
            case "start_codon_del":
                ret = "nonstart";
                break;
            case "nonstop_mutation":
                ret = "nonstop";
                break;
            case "fusion":
                ret = "fusion";
                break;
            case "in_frame_del":
            case "in_frame_ins":
            case "in_frame_deletion":
            case "in_frame_insertion":
            case "indel":
            case "nonframeshift_deletion":
            case "nonframeshift":
            case "nonframeshift insertion":
            case "nonframeshift_insertion":
                ret = "inframe";
                break;
            default:
                ret = "other";
                break;
        }

        return ret;
    }

    createMolecularMapping(list, datatype) {
        let mapper = {};
        this.rootStore.timepointStructure.forEach(d => {
            d.forEach(f => {
                if (list.length === 0) {
                    mapper[f.sample] = undefined;
                }
                else {
                    let value = list.filter(d => d.sampleId === f.sample)[0].value;
                    if (datatype === "NUMBER") {
                        value = parseFloat(value);
                    }
                    mapper[f.sample] = value;
                }
            });
        });
        return mapper;
    }


}

export default MolProfileMapping