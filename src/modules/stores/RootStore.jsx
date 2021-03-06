import { action, extendObservable, reaction, toJS } from 'mobx';
import uuidv4 from 'uuid/v4';
import DataStore from './DataStore';

import VisStore from './VisStore';
import OriginalVariable from './OriginalVariable';
import MolProfileMapping from '../MolProfileMapping';
import SvgExport from '../SvgExport';
import CBioAPI from '../../API/CBioAPI';
import FileAPI from '../../API/FileAPI';
import LocalFileLoader from '../../LocalFileLoader';
import GeneNamesLocalAPI from '../../API/GeneNamesLocalAPI';
import ScoreStore from './ScoreStore';

/*
 Store containing all the other stores gets the data with either the CBioAPI
 or from local files, transforms it and gives it to the other stores
 */
class RootStore {
    constructor(uiStore, studyAPI) {
        this.study = null; // current study
        this.patients = []; // patients ids in the current study

        this.initialVariable = {}; // initial variable saved for reset

        this.timeDistanceId = uuidv4(); // random id for time distance variable

        this.mutationMappingTypes = ['Binary', 'Mutation type', 'Protein change', 'Variant allele frequency']; // possible variable types of mutation data
        this.eventAttributes = []; // available event attributes

        this.sampleTimelineMap = {}; // map of sample ids to dates of sample collection
        this.eventTimelineMap = {}; // map of sample ids to dates of events
        this.staticMappers = {}; // mappers of sample id to pre-loaded variables
        this.patientMappers = {}; // mappers of patient id to patient variables
        this.eventMappers = {}; // maps event ids to event dates

        this.sampleStructure = {}; // structure of samples per patient

        this.api = null; // current api in use: CBioAPI or FileAPI
        this.molProfileMapping = new MolProfileMapping(this); // store for loading data on demand
        this.dataStore = new DataStore(this); // substore containing the main data
        this.visStore = new VisStore(this); // substore for visual parameters of the visualization
        this.svgExport = new SvgExport(this); // substore for SVG export
        this.scoreStore = new ScoreStore(this); // substore for scores
        this.geneNamesAPI = new GeneNamesLocalAPI(); // substore for gene name API
        this.localFileLoader = new LocalFileLoader(); // substore for loading local files
        this.uiStore = uiStore;
        this.studyAPI = studyAPI;

        this.allEvents = null;

        extendObservable(this, {
            // current state of data and data parsing
            isOwnData: false,
            timelineParsed: false,
            hasClinical: false,
            dataParsed: false,
            firstLoad: true,


            // Global timeline: current axis scale
            timeVar: 1,
            timeValue: 'days',

            // available clinical sample variables
            clinicalSampleCategories: [],
            // available clinical patient variables
            clinicalPatientCategories: [],
            // array of available molecular profiles
            availableProfiles: [],

            // current structure of sample timepoints
            timepointStructure: [],

            

            /**
             * resets everything
             */
            reset: action(() => {
                this.dataParsed = false;
                this.dataStore.reset();
                this.resetTimepointStructure(false);
                if(this.hasClinical){
                    this.addInitialVariable();
                }
                this.dataParsed = true;
            }),
            /**
             * sets global timeline axis scale
             * @param {number} id
             * @param {string} value
             */
            setTimeData: action((id, value) => {
                this.timeValue = value;
                this.timeVar = id;
            }),
            /**
             * sets if own data or cBio data is displayed
             * @param {boolean} isOwn
             */
            setIsOwnData: action((isOwn) => {
                this.isOwnData = isOwn;
            }),
            /**
             * resets the timepoint structure to the default alignment
             * @param {boolean} update - keep variables (true) or completely reset view (false)
             */
            resetTimepointStructure: action((update) => {
                this.timepointStructure = [];
                Object.keys(this.sampleStructure).forEach((patient) => {
                    this.sampleStructure[patient].forEach((d, i) => {
                        if (this.timepointStructure.length === i) {
                            this.timepointStructure.push([]);
                        }
                        this.timepointStructure[i].push({ patient, sample: d });
                    });
                });
                if (update) {
                    this.dataStore.update(this.patients);
                } else {
                    this.dataStore.initialize();
                }
            }),
            /**
             * parses timeline data
             * @param {Object} study
             * @param {loadFinishedCallback} callback
             */
            parseTimeline: action((study, callback) => {
                this.study = study;
                if (this.isOwnData) {
                    this.api = new FileAPI(this.localFileLoader, this.geneNamesAPI);
                } else {
                    this.api = new CBioAPI(this.study.studyId,
                        this.cBioLink);
                    this.geneNamesAPI.geneList = {};
                }
                this.staticMappers = {};
                this.eventMappers = {};

                this.clinicalPatientCategories.clear();
                this.clinicalSampleCategories.clear();
                this.hasClinical = false;
                this.dataParsed = false;
                this.timelineParsed = false;
                // this.uiStore.selectedTab = 'stateTransition';
                this.api.getPatients((patients) => {
                    this.patients = patients;
                    this.api.getEvents(patients, (events) => {
                        this.buildTimelineStructure(events);
                        this.createEventVariables(events);
                        this.createTimeGapMapping();

                        this.timelineParsed = true;
                        
                        

                        callback();

                        //this.setEvents(events);
                        //this.allEvents = events;

                        //console.log(events);

                    }, this.studyAPI.accessTokenFromUser);

                }, this.studyAPI.accessTokenFromUser);

                
            }),
            /**
             *  gets variable data and sets parameters
             *  @param {loadFinishedCallback} callback
             */
            parseCBio: action((callback) => {
                this.api.getAvailableMolecularProfiles((profiles) => {
                    this.availableProfiles = profiles;
                    this.api.getClinicalSampleData((sampleData) => {
                        this.createClinicalSampleMapping(sampleData);
                        if (sampleData.length !== 0) {
                            this.initialVariable = this.clinicalSampleCategories[0];
                            this.hasClinical = true;
                        }
                        this.api.getClinicalPatientData((patientData) => {
                            this.createClinicalPatientMappers(patientData);
                            if (patientData.length !== 0) {
                                if (!this.hasClinical) {
                                    this.initialVariable = this.clinicalPatientCategories[0];
                                    this.initialVariable.source = 'clinPatient';
                                }
                                this.hasClinical = true;
                            }
                            this.dataStore.initialize();
                            this.firstLoad = false;
                            this.dataParsed = true;
                            this.visStore.fitToScreenHeight();
                            this.visStore.fitToScreenWidth();
                            if(this.hasClinical){
                                this.addInitialVariable()
                            }
                            callback();
                        }, this.studyAPI.accessTokenFromUser);
                    }, this.studyAPI.accessTokenFromUser);
                }, this.studyAPI.accessTokenFromUser);
            }),
            /**
             * creates a dictionary mapping sample IDs onto clinical sample data
             * @param {Object[]} data - raw clinical sample data
             */
            createClinicalSampleMapping: action((data) => {
                data.forEach((d) => {

                    if (this.patients.includes(d.patientId)) {
                        if (!(d.clinicalAttributeId in this.staticMappers)) {
                            this.clinicalSampleCategories.push({
                                id: d.clinicalAttributeId,
                                variable: d.clinicalAttribute.displayName,
                                datatype: d.clinicalAttribute.datatype,
                                description: d.clinicalAttribute.description,
                                source: 'clinSample',
                            });
                            this.staticMappers[d.clinicalAttributeId] = {};
                        }
                    }
                    if (this.sampleStructure[d.patientId].includes(d.sampleId)) {
                        if (d.clinicalAttribute.datatype !== 'NUMBER') {
                            this.staticMappers[d.clinicalAttributeId][d.sampleId] = d.value;
                        } else {
                            this.staticMappers[d.clinicalAttributeId][d.sampleId] = parseFloat(d.value);
                        }
                    }
                });
                this.scoreStore.calculateVScore();
                this.scoreStore.calculateVScoreWithinTimeLine();
            }),
            /**
             * creates dictionaries mapping sample IDs onto clinical patient data
             * @param {Object[]} data - raw clinical patient data
             */
            createClinicalPatientMappers: action((data) => {
                data.forEach((d) => {
                    if (this.patients.includes(d.patientId)) {
                        if (!(d.clinicalAttributeId in this.staticMappers)) {
                            this.clinicalPatientCategories.push({
                                id: d.clinicalAttributeId,
                                variable: d.clinicalAttribute.displayName,
                                datatype: d.clinicalAttribute.datatype,
                                description: d.clinicalAttribute.description,
                                source: 'clinPatient',
                            });
                            this.staticMappers[d.clinicalAttributeId] = {};
                        }

                        if( this.patientMappers[d.clinicalAttributeId] === undefined){
                            this.patientMappers[d.clinicalAttributeId] = {}
                        }
                        this.patientMappers[d.clinicalAttributeId][d.patientId] = parseFloat(d.value)||d.value
                    }
                    this.sampleStructure[d.patientId].forEach((f) => {
                        if (d.clinicalAttribute.datatype !== 'NUMBER') {
                            this.staticMappers[d.clinicalAttributeId][f] = d.value;
                        } else {
                            this.staticMappers[d.clinicalAttributeId][f] = parseFloat(d.value);
                        }
                    });
                });
            }),


            /**
             * creates timepoint and sample structure
             */
            buildTimelineStructure: action((events) => {
                this.timepointStructure.clear();
                this.sampleStructure = {};
                this.sampleTimelineMap = {};
                const excludeDates = {};
                const toDelete = [];
                this.patients.forEach((patient, i) => {

                    
                    this.sampleStructure[patient] = [];
                    excludeDates[patient] = [];
                    let currTP = 0;
                    const sampleEvents = events[patient].filter(event => event.eventType === 'SPECIMEN');

                    const chooseRandom = (samples) => {
                        const chosenSample = samples[Math.floor(Math.random()
                            * samples.length)];
                        this.sampleStructure[patient].push(chosenSample);
                        if (this.timepointStructure.length <= currTP) {
                            this.timepointStructure.push([]);
                        }
                        this.timepointStructure[currTP]
                            .push({ patient, sample: chosenSample });
                    };
                    if (new Set(sampleEvents.map(d => d.startNumberOfDaysSinceDiagnosis))
                        .size > 0) {
                        let currSamples = [];
                        let previousDate = sampleEvents[0].startNumberOfDaysSinceDiagnosis;
                        sampleEvents.forEach((e, j) => {
                            const sampleId = e.attributes.filter(d => d.key === 'SAMPLE_ID')[0].value;
                            excludeDates[patient].push(e.startNumberOfDaysSinceDiagnosis);
                            this.sampleTimelineMap[sampleId] = e.startNumberOfDaysSinceDiagnosis;
                            if (e.startNumberOfDaysSinceDiagnosis !== previousDate) {
                                chooseRandom(currSamples);
                                currTP += 1;
                                currSamples = [sampleId];
                            } else {
                                currSamples.push(sampleId);
                            }
                            if (j === sampleEvents.length - 1) {
                                chooseRandom(currSamples);
                                currSamples = [];
                            }
                            previousDate = e.startNumberOfDaysSinceDiagnosis;
                        });
                    } else {
                        toDelete.push(i);
                    }
                });
                toDelete.reverse().forEach(d => this.patients.splice(d, 1));
            }),
            /**
             * updates the timepoint structure after patients are moved up or down
             * @param {string[]} patients - patients to be moved
             * @param {number} timepoint - index of timepoint that is moved
             * @param {boolean} up - up movement (true) or down movement (false)
             */
            updateTimepointStructure: action((patients, timepoint, up) => {
                const oldSampleTimepointNames = this.dataStore.variableStores
                    .sample.childStore.timepoints.map(d => d.name);
                let timepointStructure = toJS(this.timepointStructure);
                if (!up) { // down movement
                    timepointStructure = timepointStructure.reverse();
                }
                for (let i = 0; i < timepointStructure.length; i += 1) {
                    patients.forEach((patient) => {
                        const currIndex = timepointStructure[i]
                            .map(d => d.patient).indexOf(patient);
                        if (i !== 0) {
                            if (currIndex !== -1) {
                                const prevIndex = timepointStructure[i - 1]
                                    .map(d => d.patient).indexOf(patient);
                                if (prevIndex === -1) {
                                    timepointStructure[i - 1]
                                        .push(timepointStructure[i][currIndex]);
                                } else {
                                    timepointStructure[i - 1][prevIndex] = timepointStructure[i][currIndex];
                                }
                                timepointStructure[i].splice(currIndex, 1);
                            }
                        } else if (currIndex !== -1) {
                            timepointStructure.unshift([timepointStructure[i][currIndex]]);
                        }
                    });
                }
                if (timepointStructure[timepointStructure.length - 1].length === 0) {
                    timepointStructure.splice(timepointStructure.length - 1, 1);
                }
                if (!timepointStructure.map(d => d.length).includes(0)) {
                    if (!up) {
                        timepointStructure.reverse();
                    }
                    this.timepointStructure.replace(timepointStructure);
                }
                this.dataStore.update(this.dataStore.timepoints[timepoint].heatmapOrder.slice());
                this.dataStore.variableStores.sample.childStore
                    .updateNames(this.createNameList(up, oldSampleTimepointNames, patients));
                this.visStore.resetTransitionSpaces();
            }),
            /**
             * gets block structure for events
             * @returns {Object[][]}
             */
            get eventBlockStructure() {
                const eventBlockStructure = [];
                eventBlockStructure.push(this.timepointStructure[0].slice());
                for (let i = 1; i < this.timepointStructure.length; i += 1) {
                    const newEntry = this.timepointStructure[i].slice();
                    this.timepointStructure[i - 1].forEach((d) => {
                        if (!(this.timepointStructure[i].map(f => f.patient).includes(d.patient))) {
                            newEntry.push({ patient: d.patient, sample: `${d.sample}_post` });
                        }
                    });
                    eventBlockStructure.push(newEntry);
                }
                eventBlockStructure.push(this.timepointStructure[this.timepointStructure.length - 1]
                    .map(d => ({
                        sample: `${d.sample}_post`,
                        patient: d.patient,
                    })));
                return eventBlockStructure;
            },
            /**
             * get first and last date for every patient and the state of survival if available
             * @return {object}
             */
            get minMax() {
                const minMax = {};
                const survivalEvents = this.computeSurvival();
                Object.keys(this.sampleStructure).forEach((patient) => {
                    let status;
                    let max = Math.max(...this.sampleStructure[patient]
                        .map(d => this.sampleTimelineMap[d]));
                    Object.values(this.eventTimelineMap).forEach((value) => {
                        max = Math.max(max, Math.max(...value.filter(d => d.patientId === patient)
                            .map(d => d.eventEndDate)));
                    });
                    if (survivalEvents.map(d => d.patient).includes(patient)) {
                        const survivalEvent = survivalEvents.filter(d => d.patient === patient)[0];
                        if (survivalEvent.date > max) {
                            max = survivalEvent.date;
                            status = survivalEvent.status;
                        }
                    }
                    minMax[patient] = { start: 0, end: max, status };
                });
                return minMax;
            },
            /**
             * get maximum date of all patients
             * @return {number}
             */
            get maxTimeInDays() {
                let max = 0;
                Object.keys(this.minMax).forEach((patient) => {
                    if (this.minMax[patient].end > max) {
                        max = this.minMax[patient].end;
                    }
                });
                return max;
            },
            /**
             * returns the mutations profile of a study if available, returns null if there is none
             * @return {object|null}
             */
            get mutationProfile() {
                const filteredProfiles = this.availableProfiles.filter(d => d.molecularAlterationType === 'MUTATION_EXTENDED');
                let muationProfile = null;
                if (filteredProfiles.length > 0) {
                    muationProfile = filteredProfiles[0];
                }
                return muationProfile;
            },
            /**
             * checks if a study includes profile data
             * @return {boolean}
             */
            get hasProfileData() {
                return this.availableProfiles.length > 0;
            },
            get cBioLink() {
                return this.studyAPI.allLinks[this.uiStore.cBioInstance];
            },
        });
        // reset timelineParsed if data input is changed
        reaction(() => this.isOwnData, (isOwnData) => {
            if (isOwnData && !this.geneNamesAPI.geneListLoaded) {
                this.geneNamesAPI.getAllGeneSymbols();
            }
            this.timelineParsed = false;
        });
        // reset timelineParsed if eventsParsed in localFileLoader is reset
        reaction(() => this.localFileLoader.eventsParsed, (parsed) => {
            if (!parsed) {
                this.timelineParsed = false;
            }
        });
        // reacts to change in stacking mode
        reaction(() => this.uiStore.horizontalStacking,
            (horizontalStacking) => {
                if (horizontalStacking) {
                    // this.visStore.setGap(8);
                    this.visStore.setBandRectHeight(0);
                    this.visStore.setColorRectHeight(0);
                } else {
                    // this.visStore.setGap(1);
                    this.visStore.setBandRectHeight(15);
                    this.visStore.setColorRectHeight(2);
                }
            });
        reaction(() => this.uiStore.cBioInstance,
            () => {
                this.timelineParsed = false;
            });
        this.reset = this.reset.bind(this);
    }

    /**
     * adds variable in the beginning or after reset
     * add all sample variable in the beginning
     */
    
    addInitialVariable() {

        let sampleOptions = this.clinicalSampleCategories
            .filter(category => !this.dataStore
                .variableStores.sample.fullCurrentVariables
                .map(d => d.id).includes(category.id))

        // let patientOptions = this.clinicalPatientCategories
        //     .filter(category => !this.dataStore
        //         .variableStores.sample.fullCurrentVariables
        //         .map(d => d.id).includes(category.id))
        
        
        let eventOptions = [];
        Object.keys(this.eventAttributes).filter(d => d !== 'SPECIMEN') //
        .forEach(cate=>{
            Object.keys(this.eventAttributes[cate])
            .forEach((key) => {
                const subOptions = this.eventAttributes[cate][key]
                    .map(d => ({
                        ...d,
                        category: cate,
                        profile: `event`
                    }));

                eventOptions = eventOptions.concat(subOptions)
            });
        })

        // add all sample variable
        sampleOptions.forEach(d=>{
            // this.dataStore.variableStores.sample.addVariableToBeDisplayed(option)
            this.dataStore.variableStores.sample
                    .addVariableToBeDisplayed(new OriginalVariable(d.id, d.variable,
                        d.datatype, d.description, [], [],
                        this.staticMappers[d.id], d.source,
                        'clinical'));
        })

        //
        this.dataStore.autoGroup()
        this.dataStore.applyCustomGroups()

        // // add all even variable
        // eventOptions.forEach(d=>{
        //         const variable = new OriginalVariable(d.id, d.name, 'BINARY', `Indicates if event: "${d.name}" has happened between two timepoints`,
        //             [], [], this.eventMappers[d.id], d.category, 'event');
        //         this.dataStore.variableStores
        //             .between.addVariableToBeDisplayed(variable);   
        // })
        
           
        
        // this.dataStore.variableStores.sample.addVariableToBeDisplayed(
            // new OriginalVariable(this.initialVariable.id, this.initialVariable.variable, 
            // this.initialVariable.datatype, this.initialVariable.description, [], [], this.staticMappers[this.initialVariable.id], this.initialVariable.source, 'clinical'));
        // this.dataStore.globalPrimary = this.initialVariable.id;
    }

    /**
     * Adapts the old names of the timepoints to the new timepoint structure
     * @param {boolean} up - up movement (true), down movement (false)
     * @param {string[]} oldNames
     * @param {string[]} patients
     * @returns {string[]}
     */
    createNameList(up, oldNames, patients) {
        const newNames = oldNames;
        if (this.timepointStructure.length > oldNames.length) {
            if (up) {
                newNames.unshift('new');
            } else {
                newNames.push('new');
            }
        } else if (this.timepointStructure.length < oldNames.length) {
            if (up) {
                newNames.pop();
            } else {
                newNames.shift();
            }
        } else {
            const longestPatientTimeline = patients.every(patient => this.timepointStructure
                .filter(row => row.map(d => d.patient)
                    .includes(patient)).length === this.timepointStructure.length);
            if (longestPatientTimeline) {
                if (up) {
                    newNames.unshift('new');
                    newNames.pop();
                } else {
                    newNames.push('new');
                    newNames.shift();
                }
            }
        }
        return newNames;
    }


    
    /**
     * creates a dictionary mapping sample IDs onto time between timepoints
     */
    createTimeGapMapping() {
        const timeGapMapping = {};
        this.patients.forEach((d) => {
            const curr = this.sampleStructure[d];
            for (let i = 1; i < curr.length; i += 1) {
                if (i === 1) {
                    timeGapMapping[curr[i - 1]] = undefined;
                }
                timeGapMapping[curr[i]] = this.sampleTimelineMap[curr[i]]
                    - this.sampleTimelineMap[curr[i - 1]];
            }
            timeGapMapping[`${curr[curr.length - 1]}_post`] = undefined;
        });
        this.staticMappers[this.timeDistanceId] = timeGapMapping;
    }


    /**
     * computes survival events if OS_MONTHS and OS_STATUS exist
     * @return {Object[]} - array of objects specifying patient,
     * date and state of the survival event
     */
    computeSurvival() {
        const survivalMonths = 'OS_MONTHS';
        const survivalStatus = 'OS_STATUS';
        const survivalEvents = [];
        const hasStatus = this.clinicalPatientCategories.map(d => d.id).includes(survivalStatus);
        if (this.clinicalPatientCategories.map(d => d.id).includes(survivalMonths)) {
            Object.keys(this.sampleStructure).forEach((patient) => {
                let status;
                if (hasStatus) {
                    status = this.staticMappers[survivalStatus][this.sampleStructure[patient][0]];
                }
                survivalEvents.push({
                    patient,
                    date: this.staticMappers[survivalMonths][this.sampleStructure[patient][0]] * 30,
                    status,
                });
            });
        }
        return survivalEvents;
    }

    setEvents(events){
        this.allEvents=events;
    }
    /**
     * creates all event variables
     * @param {object[]} events
     */
    createEventVariables(events) {
        this.eventTimelineMap = {};
        this.eventAttributes = {};

        //this.setEvents(events);

        this.allEvents=events;


        Object.keys(events).forEach((patient) => {
            const samples = [];
            // extract samples for current patient
            this.eventBlockStructure.forEach((g) => {
                g.forEach((l) => {
                    if (l.patient === patient) {
                        samples.push(l.sample);
                    }
                });
            });

            

            events[patient].forEach((event) => {
                if (!(event.eventType in this.eventAttributes)) {
                    this.eventAttributes[event.eventType] = {};
                }
                event.attributes.forEach((attribute) => {
                    if (!(attribute.key in this.eventAttributes[event.eventType])) {
                        this.eventAttributes[event.eventType][attribute.key] = [];
                    }
                    const valueId = `${event.eventType}_${attribute.key}_${attribute.value}`;
                    if (!(valueId in this.eventMappers)) {
                        this.eventTimelineMap[valueId] = [];
                        this.eventAttributes[event.eventType][attribute.key].push({
                            name: attribute.value,
                            id: valueId,
                        });
                        this.eventMappers[valueId] = {};
                        this.eventBlockStructure.forEach((g) => {
                            g.forEach((l) => {
                                this.eventMappers[valueId][l.sample] = false;
                            });
                        });
                    }
                    samples.forEach((sampleId, i) => {
                        let currentStart = Number.NEGATIVE_INFINITY;
                        let currentEnd = Number.POSITIVE_INFINITY;
                        if (i > 0) {
                            currentStart = this.sampleTimelineMap[samples[i - 1]];
                            if (i < samples.length - 2) {
                                currentEnd = this.sampleTimelineMap[sampleId];
                            }
                        } else {
                            currentEnd = this.sampleTimelineMap[sampleId];
                        }
                        if (RootStore.isInCurrentRange(event, currentStart, currentEnd)) {
                            this.eventMappers[valueId][sampleId] = true;
                            const start = event.startNumberOfDaysSinceDiagnosis;
                            let end = start;
                            if ('endNumberOfDaysSinceDiagnosis' in event) {
                                end = event.endNumberOfDaysSinceDiagnosis;
                            }
                            this.eventTimelineMap[valueId].push({
                                time: i,
                                patientId: patient,
                                sampleId,
                                eventStartDate: start,
                                eventEndDate: end,
                            });
                        }
                    });
                });
            });
        });
    }

    /**
     * checks if an event has happened in a specific timespan
     * @param {Object} event
     * @param {number} currMinDate
     * @param {number} currMaxDate
     * @returns {boolean}
     */
    static isInCurrentRange(event, currMinDate, currMaxDate) {
        let isInRange = false;
        if ('endNumberOfDaysSinceDiagnosis' in event) {
            isInRange = (event.endNumberOfDaysSinceDiagnosis <= currMaxDate
                && event.endNumberOfDaysSinceDiagnosis > currMinDate)
                || (event.startNumberOfDaysSinceDiagnosis < currMaxDate
                    && event.startNumberOfDaysSinceDiagnosis >= currMinDate);
        } else {
            isInRange = event.startNumberOfDaysSinceDiagnosis < currMaxDate
                && event.startNumberOfDaysSinceDiagnosis >= currMinDate;
        }
        return isInRange;
    }
}

export default RootStore;
