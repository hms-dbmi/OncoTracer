/* eslint-disable no-console */
import axios from 'axios';
import GenomeNexusAPI from './GenomeNexusAPI';
import StudyAPI from './studyAPI';

/**
 * retrieves data using the cBio API
 */
class CBioAPI {
    constructor(studyId, cBioLink) {
        this.cBioLink = cBioLink;
        this.studyId = studyId;
        this.genomeNexusAPI = new GenomeNexusAPI();
        this.allEvents = null;
    }

    /**
     * get all patients in a study
     * @param {returnDataCallback} callback
     */
    getPatients(callback, token) {
        StudyAPI.callGetAPI(`${this.cBioLink}/api/studies/${this.studyId}/patients?projection=SUMMARY&pageSize=10000000&pageNumber=0&direction=ASC`, token, {})
            .then((response) => {
                callback(response.data.map(patient => patient.patientId));
            }).catch((error) => {
                if (CBioAPI.verbose) {
                    console.log(error);
                } else {
                    console.log('Could not load patients');
                }
            });
    }


    /**
     * get all events for all patients in a study
     * @param {string[]} patients
     * @param {returnDataCallback} callback
     */
    getEvents(patients, callback, token) {
        axios.all(patients
            .map(patient => StudyAPI.callGetAPI(`${this.cBioLink}/api/studies/${this.studyId}/patients/${patient}/clinical-events?projection=SUMMARY&pageSize=10000000&pageNumber=0&sortBy=startNumberOfDaysSinceDiagnosis&direction=ASC`, token, {})))
            .then((eventResults) => {
                const events = {};
                eventResults.forEach((response, i) => {
                    events[patients[i]] = response.data;
                });
                //console.log(events);
                
                this.allEvents=events;
                callback(events);
            }).catch((error) => {
                if (CBioAPI.verbose) {
                    console.log(error);
                } else {
                    console.log('Could not load events');
                }
            });
    }

    /**
     * get all available clinical sample data in a study
     * @param {returnDataCallback} callback
     */
    getClinicalPatientData(callback, token) {
        StudyAPI.callGetAPI(`${this.cBioLink}/api/studies/${this.studyId}/clinical-data?clinicalDataType=PATIENT&projection=DETAILED&pageSize=10000000&pageNumber=0&direction=ASC`, token, {})
            .then((response) => {
                callback(response.data);
            }).catch((error) => {
                if (CBioAPI.verbose) {
                    console.log(error);
                } else {
                    console.log('Could not load sample data');
                }
            });
    }

    /**
     * get all available molecular profiles for a study
     * @param {returnDataCallback} callback
     */
    getAvailableMolecularProfiles(callback, token) {
        StudyAPI.callGetAPI(`${this.cBioLink}/api/studies/${this.studyId}/molecular-profiles?projection=SUMMARY&pageSize=10000000&pageNumber=0&direction=ASC`, token, {})
            .then((response) => {
                callback(response.data);
            }).catch((error) => {
                if (CBioAPI.verbose) {
                    console.log(error);
                } else {
                    console.log('Could not available molecular profiles');
                }
            });
    }

    /**
     * get all available clinical sample data in a study
     * @param {returnDataCallback} callback
     */
    getClinicalSampleData(callback, token) {
        StudyAPI.callGetAPI(`${this.cBioLink}/api/studies/${this.studyId}/clinical-data?clinicalDataType=SAMPLE&projection=DETAILED&pageSize=10000000&pageNumber=0&direction=ASC`, token, {})
            .then((response) => {
                callback(response.data);
            }).catch((error) => {
                if (CBioAPI.verbose) {
                    console.log(error);
                } else {
                    console.log('Could not load sample data');
                }
            });
    }

    /**
     *
     * @param {Object[]} entrezIDs
     * @param {string} profileId
     * @param {returnDataCallback} callback
     */
    getMutations(entrezIDs, profileId, callback, token) {
        StudyAPI.callPostAPI(`${this.cBioLink}/api/molecular-profiles/${profileId}/mutations/fetch?projection=DETAILED&pageSize=10000000&pageNumber=0&direction=ASC`, token, {}, {
            entrezGeneIds:
                entrezIDs.map(d => d.entrezGeneId),
            sampleListId: `${this.studyId}_all`,
        }).then((response) => {
            callback(response.data);
        }).catch((error) => {
            if (CBioAPI.verbose) {
                console.log(error);
            } else {
                console.log("Can't get mutations");
            }
        });
    }

    /**
     * checks for each sample if genes have been profiled
     * @param {Object[]} genes
     * @param {string} profileId
     * @param {returnDataCallback} callback
     */
    areProfiled(genes, profileId, callback, token) {
        const profiledDict = {};
        StudyAPI.callPostAPI(`${this.cBioLink}/api/molecular-profiles/${profileId}/gene-panel-data/fetch`, token, {}, {
            sampleListId: `${this.studyId}_all`,
        }).then((samplePanels) => {
            const differentPanels = [...new Set(samplePanels.data.filter(d => 'genePanelId' in d).map(d => d.genePanelId))];
            if (differentPanels.length > 0) {
                axios.all(differentPanels.map(d => axios.get(`${this.cBioLink}/api/gene-panels/${d}`))).then((panelList) => {
                    samplePanels.data.forEach((samplePanel) => {
                        profiledDict[samplePanel.sampleId] = [];
                        genes.forEach((gene) => {
                            if (samplePanel.genePanelId !== undefined) {
                                if (panelList[panelList.map(panel => panel.data.genePanelId)
                                    .indexOf(samplePanel.genePanelId)].data.genes
                                    .map(id => id.entrezGeneId).includes(gene.entrezGeneId)) {
                                    profiledDict[samplePanel.sampleId].push(gene.entrezGeneId);
                                }
                            } else {
                                profiledDict[samplePanel.sampleId].push(gene.entrezGeneId);
                            }
                        });
                    });
                    callback(profiledDict);
                }).catch((error) => {
                    if (CBioAPI.verbose) {
                        console.log(error);
                    }
                });
            } else {
                samplePanels.data.forEach((samplePanel) => {
                    if (samplePanel.profiled) {
                        profiledDict[samplePanel.sampleId] = genes.map(d => d.entrezGeneId);
                    } else {
                        profiledDict[samplePanel.sampleId] = [];
                    }
                });
                callback(profiledDict);
            }
        }).catch((error) => {
            if (CBioAPI.verbose) {
                console.log(error);
            }
        });
    }

    /**
     * gets data for an array of entrezIds in a specified profile
     * @param {string} profileId
     * @param {Object[]} entrezIDs
     * @param {returnDataCallback} callback
     */
    getMolecularValues(profileId, entrezIDs, callback, token) {
        StudyAPI.callPostAPI(`${this.cBioLink}/api/molecular-profiles/${profileId}/molecular-data/fetch?projection=SUMMARY`, token, {}, {
            entrezGeneIds:
                entrezIDs.map(d => d.entrezGeneId),
            sampleListId: `${this.studyId}_all`,
        }).then((response) => {
            callback(response.data);
        }).catch((error) => {
            console.log(error);
        });
    }

    getGeneIDs(hgncSymbols, callback, token) {
        this.genomeNexusAPI.getGeneIDs(hgncSymbols, callback, token);
    }
}

CBioAPI.verbose = true;

export default CBioAPI;
