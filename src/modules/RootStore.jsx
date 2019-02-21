import DataStore from "./TemporalHeatmap/DataStore"

import VisStore from "./TemporalHeatmap/VisStore.jsx"
import {extendObservable} from "mobx";
import uuidv4 from 'uuid/v4';
import UndoRedoStore from "./TemporalHeatmap/UndoRedoStore";
import OriginalVariable from "./TemporalHeatmap/OriginalVariable";
import MolProfileMapping from "./MolProfileMapping";


/*
gets the data with the cBioAPI and gives it to the other stores
TODO: make prettier
 */
class RootStore {
    constructor(cbioAPI, study, firstLoad, display) {
        this.cbioAPI = cbioAPI;
        this.study = study;


        this.hasMutations = false;
        this.mutations = [];
        this.events = [];

        //maximum and minimum amount of timepoints a patient has in the dataset
        this.maxTP = 0;
        this.minTP = Number.POSITIVE_INFINITY;

        this.mutationCountId = uuidv4();
        this.timeDistanceId = uuidv4();

        this.clinicalSampleCategories = [];
        this.clinicalPatientCategories = [];
        this.availableProfiles = [];
        this.mutationMappingTypes = ["Binary", "Mutation type", "Protein change", "Variant allele frequency"];
        this.eventCategories = [];
        this.eventAttributes = [];
        this.patientOrderPerTimepoint = [];
        this.sampleTimelineMap = {};
       //this.eventTimelineMap = {};
        this.staticMappers = {};

        this.sampleStructure = [];

        this.reset = this.reset.bind(this);

        this.exportSVG = this.exportSVG.bind(this);
        this.exportSVGandData = this.exportSVGandData.bind(this);
        //this.onSubmit = this.onSubmit.bind(this);

        extendObservable(this, {
            parsed: false,
            dataLoading: false,
            firstLoad: firstLoad,
            display: display,
            eventTimelineMap:{},


            timeVar: 1,
            timeValue: "days",

            timepointStructure: [],
            get actualTimeLine() {
                const _self = this;
                let timeline = [];
                this.timepointStructure.forEach(function (d) {
                    let singleTP = [];
                    d.forEach(function (f) {
                        singleTP.push(_self.sampleTimelineMap[f.sample].startNumberOfDaysSinceDiagnosis)
                    });
                    timeline.push(singleTP);
                });
                return timeline;
            },
            get transitionStructure() {
                const _self = this;
                let transitionStructure = [];
                transitionStructure.push(this.timepointStructure[0].slice());
                for (let i = 1; i < this.timepointStructure.length; i++) {
                    let newEntry = this.timepointStructure[i].slice();
                    this.timepointStructure[i - 1].forEach(function (d) {
                        if (!(_self.timepointStructure[i].map(d => d.patient).includes(d.patient))) {
                            newEntry.push({patient: d.patient, sample: d.sample + "_post"})
                        }
                    });
                    transitionStructure.push(newEntry);
                }
                transitionStructure.push(this.timepointStructure[this.timepointStructure.length - 1].map(d => ({
                    sample: d.sample + "_post",
                    patient: d.patient
                })));
                return transitionStructure;
            },
            get minMax() {
                let minMax = {};
                let survivalEvents=this.computeSurvival();
                for (let patient in this.sampleStructure) {
                    let value = undefined;
                    let max = Math.max(...this.sampleStructure[patient].map(d => this.sampleTimelineMap[d].startNumberOfDaysSinceDiagnosis));
                    let min = Math.min(...this.sampleStructure[patient].map(d => this.sampleTimelineMap[d].startNumberOfDaysSinceDiagnosis));
                    for (let variable in this.eventTimelineMap) {
                        max = Math.max(max, Math.max(...this.eventTimelineMap[variable].filter(d => d.patient === patient).map(d => d.eventEndDate)));
                        min = Math.min(min, Math.min(...this.eventTimelineMap[variable].filter(d => d.patient === patient).map(d => d.eventEndDate)));
                    }
                    if (survivalEvents.map(d => d.patient).includes(patient)) {
                        let survivalEvent = survivalEvents.filter(d => d.patient === patient)[0];
                        if (survivalEvent.date > max) {
                            max = survivalEvent.date;
                            value = survivalEvent.status;
                        }
                    }
                    minMax[patient] = {start: min, end: max, value: value}
                }
                return minMax;
            },
            get maxTimeInDays() {
                let max = 0;
                for(let patient in this.minMax){
                    if(this.minMax[patient].end>max){
                        max=this.minMax[patient].end;
                    }
                }
                return max;
            },

        });
        this.molProfileMapping = new MolProfileMapping(this);
        this.dataStore = new DataStore(this);
        this.visStore = new VisStore(this);
        this.undoRedoStore = new UndoRedoStore(this);
    }


    exportSVG() {
        var tmp;
        if (this.dataStore.globalTime) {
            tmp = document.getElementById("timeline-view");
        } else {
            tmp = document.getElementById("block-view");
        }
        var svg_all = tmp.getElementsByTagName("svg");

        var print_svg = '';

        var minW = null, minH = null, maxW = null, maxH = null;

        var prev_right = 0, new_x, new_right;


        for (var i = 0; i < svg_all.length; i++) {
            var t = "";

            var svg_copy = svg_all[i].cloneNode(true);
            var a = svg_copy.getElementsByClassName("not_exported");
            [...a].forEach(t => {
                t.remove();
            })


            for (var c = 0; c < svg_copy.children.length; c++) {
                var temp = svg_copy.children[c];

                t = t + (new XMLSerializer()).serializeToString(temp);
            }

            var boundingRect; // = svg_all[i].parentElement.getBoundingClientRect();

            if (this.dataStore.globalTime && this.dataStore.transitionOn && (i === 0 || i === 1)) {
                boundingRect = svg_all[i].getBoundingClientRect();
            }
            else {
                boundingRect = svg_all[i].parentElement.getBoundingClientRect();
            }
            var width = svg_all[i].getBoundingClientRect().width;
            var height = svg_all[i].getBoundingClientRect().height;

            new_x = boundingRect.x;
            new_right = new_x + width;

            if (boundingRect.x < prev_right && !this.dataStore.globalTime) {

                new_right = prev_right + width;
                new_x = prev_right;
            }

            prev_right = new_right - 1;

            if (minW == null || boundingRect.left < minW) {
                minW = boundingRect.left;
            }
            if (maxW == null || new_right > maxW) {
                maxW = new_right;
            }
            if (minH == null || boundingRect.top > minH) {
                minH = boundingRect.top;
            }
            if (maxH == null || boundingRect.bottom > maxH) {
                maxH = boundingRect.bottom;
            }

            var scaleX = 1;

            if (this.dataStore.globalTime && this.dataStore.transitionOn && i === 4) {
                // if(this.dataStore.transitionOn && i===4){

                scaleX = svg_all[i + 1].getBoundingClientRect().width / width;
                print_svg = print_svg +
                    '<g width="' + width + '" height= "' + height + '" transform="translate(' + new_x + ',' + (boundingRect.y) + ') scale(' + scaleX + ', 1)" >' +

                    t +

                    '</g>';

            }
            else if (this.dataStore.globalTime && !this.dataStore.transitionOn && i === 3) {

                scaleX = svg_all[i + 1].getBoundingClientRect().width / width;
                print_svg = print_svg +
                    '<g width="' + width + '" height= "' + height + '" transform="translate(' + new_x + ',' + (boundingRect.y) + ') scale(' + scaleX + ', 1)" >' +

                    t +

                    '</g>';
                //}

            } else {
                print_svg = print_svg +
                    '<g width="' + width + '" height= "' + height + '" transform="translate(' + new_x + ',' + (boundingRect.y) + ')" >' +

                    t +

                    '</g>';
            }
        }

        /*var svg_prefix =
        '<g width="' + (minW + maxW).toString() + '" height= "25" transform="translate(400, 25)">' +
            '<text style="font-size:18px">Study: ' + this.study.name + '</text>'+
        '</g>' +
        '<g width="' + (minW + maxW).toString() + '" height= "25" transform="translate(400, 50)">' +
            '<text style="font-size:18px">Description: ' + this.study.description + '</text>'+
        '</g>' +
        '<g width="' + (minW + maxW).toString() + '" height= "25" transform="translate(400, 75)">' +
            '<text style="font-size:18px">Citation: ' + this.study.citation + '</text>'+
        '</g>' +
        '<g width="' + (minW + maxW).toString() + '" height= "25" transform="translate(400, 100)">' +
            '<text style="font-size:18px">Number of patients: ' + this.patientOrderPerTimepoint.length + '</text>'+
        '</g>' +
        '<g width="' + (minW + maxW).toString() + '" height= "25" transform="translate(400, 125)">' +
            '<text style="font-size:18px">Number of timepoints: ' + this.minTP + "-" + this.maxTP + '</text>'+
        '</g>'*/

        var svg_xml = '<svg xmlns="http://www.w3.org/2000/svg" width = "' + (minW + maxW).toString() + '" height= "' + (minH + maxH).toString() + '">' +

            // svg_prefix +
            print_svg +

            '</svg>';


        // Submit the <FORM> to the server.
        // The result will be an attachment file to download.
        var form = document.getElementById("svgform");
        // form['output_format'].value = output_format;
        //form['data'].value = svg_xml ;

        form[0].value = "svg";
        form[1].value = svg_xml;
        this.downloadFile(svg_xml);
    }


    exportSVGandData() {
        var tmp;
        if (this.dataStore.globalTime) {
            tmp = document.getElementById("timeline-view");
        } else {
            tmp = document.getElementById("block-view");
        }
        var svg_all = tmp.getElementsByTagName("svg");

        var print_svg = '';

        var minW = null, minH = null, maxW = null, maxH = null;

        var prev_right = 0, new_x, new_right;


        for (var i = 0; i < svg_all.length; i++) {
            var t = "";

            var svg_copy = svg_all[i].cloneNode(true);
            var a = svg_copy.getElementsByClassName("not_exported");
            [...a].forEach(t => {
                t.remove();
            })


            for (var c = 0; c < svg_copy.children.length; c++) {
                var temp = svg_copy.children[c];

                //if(!this.dataStore.globalTime){

                /*if(i===0 ){

                    if(temp.childElementCount===2){
                        temp.children[1].remove();
                    }

                }
                else if(i===1 && temp.childElementCount===4){
                    for(var k=0; k<temp.childElementCount; k++){

                        for(var l=0; l< temp.children[k].childElementCount; l++){

                            temp.children[k].children[l].children.sort.remove();
                            if(temp.children[k].children[l].children.group){
                                temp.children[k].children[l].children.group.remove();
                            }
                            if(temp.children[k].children[l].children.ungroup){
                                temp.children[k].children[l].children.ungroup.remove();
                            }

                            temp.children[k].children[l].children.delete.remove();

                        }

                    }
                } */

                //var a = svg_all[i].getElementsByClassName("not_exported");
                //[...a].forEach(t => {t.remove();})

                //}
                /* else{ //global timeline

                     if(i===0){
                         for(var k2=0; k2<svg_all[0].children[0].childElementCount; k2++){
                             svg_all[i].children[0].children[k2].children[0].children[1].remove();
                         }
                     }


                 } */

                t = t + (new XMLSerializer()).serializeToString(temp);
            }

            var boundingRect; // = svg_all[i].parentElement.getBoundingClientRect();

            if (this.dataStore.globalTime && this.dataStore.transitionOn && (i === 0 || i === 1)) {
                boundingRect = svg_all[i].getBoundingClientRect();
            }
            else {
                boundingRect = svg_all[i].parentElement.getBoundingClientRect();
            }
            var width = svg_all[i].getBoundingClientRect().width;
            var height = svg_all[i].getBoundingClientRect().height;

            new_x = boundingRect.x;
            new_right = new_x + width;

            if (boundingRect.x < prev_right && !this.dataStore.globalTime) {

                new_right = prev_right + width;
                new_x = prev_right;
            }

            prev_right = new_right - 1;

            if (minW == null || boundingRect.left < minW) {
                minW = boundingRect.left;
            }
            if (maxW == null || new_right > maxW) {
                maxW = new_right;
            }
            if (minH == null || boundingRect.top > minH) {
                minH = boundingRect.top;
            }
            if (maxH == null || boundingRect.bottom > maxH) {
                maxH = boundingRect.bottom;
            }

            var scaleX = 1;

            if (this.dataStore.globalTime && this.dataStore.transitionOn && i === 4) {
                // if(this.dataStore.transitionOn && i===4){

                scaleX = svg_all[i + 1].getBoundingClientRect().width / width;
                print_svg = print_svg +
                    '<g width="' + width + '" height= "' + height + '" transform="translate(' + new_x + ',' + (boundingRect.y) + ') scale(' + scaleX + ', 1)" >' +

                    t +

                    '</g>';

            }
            else if (this.dataStore.globalTime && !this.dataStore.transitionOn && i === 3) {

                scaleX = svg_all[i + 1].getBoundingClientRect().width / width;
                print_svg = print_svg +
                    '<g width="' + width + '" height= "' + height + '" transform="translate(' + new_x + ',' + (boundingRect.y) + ') scale(' + scaleX + ', 1)" >' +

                    t +

                    '</g>';
                //}

            } else {
                print_svg = print_svg +
                    '<g width="' + width + '" height= "' + height + '" transform="translate(' + new_x + ',' + (boundingRect.y) + ')" >' +

                    t +

                    '</g>';
            }
        }

        var name = this.study.name.replace('&', 'and');
        var desc = this.study.description.replace('&', 'and');

        var svg_prefix =
            '<g width="' + ((minW + maxW) * 2).toString() + '" height= "25" transform="translate(400, 25)">' +
            '<text style="font-size:18px">Study: ' + name + '</text>' +
            '</g>' +
            '<g width="' + ((minW + maxW) * 2).toString() + '" height= "25" transform="translate(400, 50)">' +
            '<text style="font-size:18px">Description: ' + desc + '</text>' +
            '</g>' +
            '<g width="' + (minW + maxW).toString() + '" height= "25" transform="translate(400, 75)">' +
            '<text style="font-size:18px">Citation: ' + this.study.citation + '</text>' +
            '</g>' +
            '<g width="' + (minW + maxW).toString() + '" height= "25" transform="translate(400, 100)">' +
            '<text style="font-size:18px">Number of patients: ' + this.patientOrderPerTimepoint.length + '</text>' +
            '</g>' +
            '<g width="' + (minW + maxW).toString() + '" height= "25" transform="translate(400, 125)">' +
            '<text style="font-size:18px">Number of timepoints: ' + this.minTP + "-" + this.maxTP + '</text>' +
            '</g>'

        var svg_xml = '<svg xmlns="http://www.w3.org/2000/svg" width = "' + ((minW + maxW) * 2).toString() + '" height= "' + (minH + maxH).toString() + '">' +

            svg_prefix +
            print_svg +

            '</svg>';


        // Submit the <FORM> to the server.
        // The result will be an attachment file to download.
        var form = document.getElementById("svgform");
        // form['output_format'].value = output_format;
        //form['data'].value = svg_xml ;

        form[0].value = "svg";
        form[1].value = svg_xml;
        this.downloadFile(svg_xml);
    }


    downloadFile(content) {
        var element = document.createElement("a");
        var file = new Blob([content], {type: 'image/svg+xml'});
        element.href = URL.createObjectURL(file);
        element.download = "download.svg";
        //element.target = "_blank";
        element.click();
    }

    /**
     * resets everything
     */
    reset() {
        this.parsed = false;
        this.dataStore.reset();
        this.resetTimepointStructure(false);
        let initialVariable = this.clinicalSampleCategories[0];
        this.dataStore.variableStores.sample.addVariableToBeDisplayed(new OriginalVariable(initialVariable.id, initialVariable.variable, initialVariable.datatype, initialVariable.description, [], [], this.staticMappers[initialVariable.id], "clinSample", "clinical"));
        this.dataStore.globalPrimary = initialVariable.id;
        this.parsed = true;
    }

    /**
     * resets the timepoint structure to the default alignment
     */
    resetTimepointStructure(update) {
        let timepointStructure = [];
        const _self = this;
        for (let i = 0; i < this.maxTP; i++) {
            let patientSamples = [];
            this.patientOrderPerTimepoint.forEach(function (d, j) {
                if (_self.minTP === 0) {
                    _self.minTP = _self.sampleStructure[d].length;
                }
                else {
                    if (_self.sampleStructure[d].length < _self.minTP) {
                        _self.minTP = _self.sampleStructure[d].length;
                    }
                }
                if (_self.sampleStructure[d].length > i) {
                    patientSamples.push({patient: d, sample: _self.sampleStructure[d][i]})
                }
            });
            timepointStructure.push(patientSamples);
        }
        this.timepointStructure = timepointStructure;
        if (update) {
            this.dataStore.update(this.patientOrderPerTimepoint);
        }
        else {
            this.dataStore.initialize(this.patientOrderPerTimepoint);
        }
    }

    /*
    gets data from cBio and sets parameters in other stores
     */
    parseCBio() {
        this.cbioAPI.getPatients(this.study.studyId, patients => {
            this.patientOrderPerTimepoint = patients;
            this.cbioAPI.getEvents(this.study.studyId, patients, events => {
                this.events = events;
                this.buildTimelineStructure(patients, events);
                  this.cbioAPI.getClinialPatientData(this.study.studyId, patients, data => {
                    this.createClinicalPatientMappers(data);
                });
                this.cbioAPI.getClinicalSampleData(this.study.studyId, data => {
                    this.createClinicalSampleMapping(data);
                    this.dataStore.initialize(patients.length);
                    this.visStore.fitToScreenWidth();
                    let initialVariable = this.clinicalSampleCategories[0];
                    this.dataStore.variableStores.sample.addVariableToBeDisplayed(new OriginalVariable(initialVariable.id, initialVariable.variable, initialVariable.datatype, initialVariable.description, [], [], this.staticMappers[initialVariable.id], "clinSample", "clinical"));
                    this.dataStore.globalPrimary = initialVariable.id;
                    this.undoRedoStore.saveVariableHistory("ADD", initialVariable.variable, true);
                    this.parsed = true;
                });
                this.cbioAPI.getAvailableMolecularProfiles(this.study.studyId, profiles => {
                    this.availableProfiles = profiles;
                    const mutationIndex = profiles.map(d => d.molecularAlterationType).indexOf("MUTATION_EXTENDED");
                    if (mutationIndex !== -1) {
                        this.hasMutations = true;
                        this.cbioAPI.getAllMutations(this.study.studyId, profiles[mutationIndex].molecularProfileId, data => {
                            this.createMutationsStructure(data);
                        });
                        this.cbioAPI.getMutationCounts(this.study.studyId, profiles[mutationIndex].molecularProfileId, data => {
                            this.createMutationCountsMapping(data);
                        });
                    }
                })
            })
        });

    }

    /**
     * combines clinical events of sort "SPECIMEN" and clinical data in one datastructure,
     * sets some variables in the other stores
     */
    buildTimelineStructure(patients, events) {
        let sampleStructure = {};
        let timelineStructure = [];
        let sampleTimelineMap = {};
        let eventCategories = [];
        let maxTP = 0;
        let minTP = Number.POSITIVE_INFINITY;
        let timepointStructure = [];
        let excludeDates = {};

        patients.forEach(patient => {
            sampleStructure[patient] = [];
            timelineStructure[patient] = [];
            excludeDates[patient] = [];
            let previousDate = -1;
            let currTP = 0;
            events[patient].forEach(function (e, i) {
                if (!eventCategories.includes(e.eventType)) {
                    eventCategories.push(e.eventType);
                }
                if (e.eventType === "SPECIMEN") {
                    excludeDates[patient].push(e.startNumberOfDaysSinceDiagnosis);
                    sampleTimelineMap[e.attributes[1].value] = {
                        "method": e.attributes[0].key,
                        "method_name": e.attributes[0].value,
                        "startNumberOfDaysSinceDiagnosis": e.startNumberOfDaysSinceDiagnosis
                    };
                    if (e.startNumberOfDaysSinceDiagnosis !== previousDate) {
                        sampleStructure[patient].push(e.attributes[1].value);
                        timelineStructure[patient].push({
                            sampleId: e.attributes[1].value,
                            date: e.startNumberOfDaysSinceDiagnosis
                        });
                        if (timepointStructure.length <= currTP) {
                            timepointStructure.push([]);
                        }
                        timepointStructure[currTP].push({patient: patient, sample: e.attributes[1].value});
                        currTP += 1;

                    }
                    previousDate = e.startNumberOfDaysSinceDiagnosis;
                }
            });
            if (sampleStructure[patient].length > maxTP) {
                maxTP = currTP;
            }
            if (sampleStructure[patient].length < minTP) {
                minTP = currTP;
            }
        });
        this.maxTP = maxTP;
        this.minTP = minTP;
        this.sampleTimelineMap = sampleTimelineMap;
        this.eventCategories = eventCategories;
        this.sampleStructure = sampleStructure;
        this.timepointStructure = timepointStructure;
        this.getEventAttributes(events, excludeDates);
        this.staticMappers[this.timeDistanceId] = this.createTimeGapMapping(patients);
    }


    sortByPatientOrder(ObjectStructure) {
        return ObjectStructure.sort((d1, d2) => {
            return this.patientOrderPerTimepoint.indexOf(d1.patient) - this.patientOrderPerTimepoint.indexOf(d2.patient);
        })
    }

    /**
     * updates the timepoint structure after a patient is moved up or down
     * @param patient
     * @param timepoint
     * @param up
     */
    updateTimepointStructure(patient, timepoint, up) {
        const oldSampleTimepointNames = this.dataStore.variableStores.sample.childStore.timepoints.map(d => d.name);
        let timeline = this.timepointStructure[timepoint];
        const index = this.timepointStructure[timepoint].map(d => d.patient).indexOf(patient);
        let indexedElements;
        let element = timeline[index];
        let el2;
        const _self = this;
        if (!up) { //down movement
            if (timepoint === this.dataStore.timepoints.length - 1) {
                _self.timepointStructure.push([element]);
            }
            else {
                for (let i = timepoint; i < this.dataStore.variableStores.sample.childStore.timepoints.length; i++) {
                    if (i + 1 < _self.timepointStructure.length) {
                        indexedElements = _self.timepointStructure[i + 1]
                            .filter(d => d)
                            .map((d, j) => {
                                return {index: j, patient: d.patient};
                            }).find(d => d.patient === patient);
                        if (indexedElements) {
                            el2 = _self.timepointStructure[i + 1][indexedElements.index];
                            _self.timepointStructure[i + 1][indexedElements.index] = element;
                            element = el2;
                        }
                        else {
                            _self.timepointStructure[i + 1].push(element);
                            _self.timepointStructure[i + 1] = _self.sortByPatientOrder(_self.timepointStructure[i + 1]);
                            break;
                        }

                    } else {
                        _self.timepointStructure.push([element]);
                    }
                }
            }
        }
        else { //up movement
            for (let i = timepoint; i >= 0; i--) {
                if ((i - 1) >= 0 && _self.timepointStructure[i - 1]) { //if the timeline exists
                    indexedElements = _self.timepointStructure[i - 1]
                        .filter(d => d)
                        .map((d, j) => {
                            return {index: j, patient: d.patient};
                        }).find(d => d.patient === patient);
                    if (indexedElements) {
                        el2 = _self.timepointStructure[i - 1][indexedElements.index];
                        _self.timepointStructure[i - 1][indexedElements.index] = element;
                        element = el2;
                    }
                    else {
                        _self.timepointStructure[i - 1].push(element);
                        _self.timepointStructure[i - 1] = _self.sortByPatientOrder(_self.timepointStructure[i - 1]);
                        break;
                    }
                }
                else {
                    _self.timepointStructure.unshift([element]);
                }
            }
        } //else end
        timeline.splice(index, 1);
        this.timepointStructure = this.timepointStructure.filter(struct => struct.length);
        let heatmapOrder = this.dataStore.timepoints[timepoint].heatmapOrder.slice();
        this.dataStore.update(heatmapOrder);
        this.dataStore.variableStores.sample.childStore.updateNames(this.createNameList(up, this.dataStore.variableStores.sample.childStore.timepoints, oldSampleTimepointNames, patient));

    }

    /**
     * Adapts the old names of the timepoints to the new timepoint structure
     * @param up
     * @param timepoints
     * @param oldNames
     * @param patient
     * @returns {*}
     */
    createNameList(up, timepoints, oldNames, patient) {
        let newNames = oldNames;
        if (this.timepointStructure.length > oldNames.length) {
            if (up) {
                newNames.unshift("new");
            }
            else {
                newNames.push("new");
            }
        }
        else if (this.timepointStructure.length < oldNames.length) {
            if (up) {
                newNames.pop();
            }
            else {
                newNames.shift();
            }
        }
        else {
            let longestPatientTimeline = true;
            this.timepointStructure.forEach(function (d) {
                if (!(d.map(d => d.patient).includes(patient))) {
                    longestPatientTimeline = false;
                }
            });
            if (longestPatientTimeline) {
                if (up) {
                    newNames.unshift("new");
                    newNames.pop();
                }
                else {
                    newNames.push("new");
                    newNames.shift();
                }
            }
        }
        return newNames;
    }

    /**
     * creates a dictionary mapping sample IDs onto clinical data
     * @returns {{}}
     */
    createClinicalSampleMapping(data) {
        data.forEach(d => {
            if (d)
                if (!(d.clinicalAttributeId in this.staticMappers)) {
                    this.clinicalSampleCategories.push({
                        id: d.clinicalAttributeId,
                        variable: d.clinicalAttribute.displayName,
                        datatype: d.clinicalAttribute.datatype,
                        description: d.clinicalAttribute.description
                    });
                    this.staticMappers[d.clinicalAttributeId] = {}
                }
            if (this.sampleStructure[d.patientId].includes(d.sampleId)) {
                if (d.clinicalAttribute.datatype !== "NUMBER") {
                    return this.staticMappers[d.clinicalAttributeId][d.sampleId] = d.value;
                }
                else {
                    return this.staticMappers[d.clinicalAttributeId][d.sampleId] = parseFloat(d.value);
                }
            }
        });

    }

    /**
     * creates a dictionary mapping sample IDs onto mutation counts
     * @returns {{}}
     */
    createMutationCountsMapping(data) {
        this.staticMappers[this.mutationCountId] = {};
        data.forEach(d => {
            this.staticMappers[this.mutationCountId][d.sampleId] = d.mutationCount;
        });
        this.clinicalSampleCategories.push({
            id: this.mutationCountId,
            variable: "Mutation Count",
            datatype: "NUMBER",
            description: "Number of mutations"
        });
    }

    /**
     * creates a dictionary mapping sample IDs onto time between timepoints
     */
    createTimeGapMapping(patients) {
        let timeGapMapping = {};
        const _self = this;
        patients.forEach(d => {
            let curr = _self.sampleStructure[d];
            for (let i = 1; i < curr.length; i++) {
                if (i === 1) {
                    timeGapMapping[curr[i - 1]] = undefined
                }
                timeGapMapping[curr[i]] = _self.sampleTimelineMap[curr[i]].startNumberOfDaysSinceDiagnosis - _self.sampleTimelineMap[curr[i - 1]].startNumberOfDaysSinceDiagnosis;
            }
            timeGapMapping[curr[curr.length - 1] + "_post"] = undefined;
        });
        return timeGapMapping;

    }

    createMutationsStructure(data) {
        this.mutations = {};
        data.forEach(mutation => {
            if (!(mutation.entrezGeneId in this.mutations)) {
                this.mutations[mutation.entrezGeneId] = [];
            }
            this.mutations[mutation.entrezGeneId].push({
                patientId: mutation.patientId,
                sampleId: mutation.sampleId,
                mutationType: mutation.mutationType,
                proteinChange: mutation.proteinChange,
                vaf: mutation.tumorAltCount / (mutation.tumorAltCount + mutation.tumorRefCount)
            });
        });

    }

    createClinicalPatientMappers(data) {
        data.forEach(d => {
            d.forEach(d => {
                if (d)
                    if (!(d.clinicalAttributeId in this.staticMappers)) {
                        this.clinicalPatientCategories.push({
                            id: d.clinicalAttributeId,
                            variable: d.clinicalAttribute.displayName,
                            datatype: d.clinicalAttribute.datatype,
                            description: d.clinicalAttribute.description
                        });
                        this.staticMappers[d.clinicalAttributeId] = {}
                    }
                this.sampleStructure[d.patientId].forEach(f => {
                    if (d.clinicalAttribute.datatype !== "NUMBER") {
                        return this.staticMappers[d.clinicalAttributeId][f] = d.value;
                    }
                    else {
                        return this.staticMappers[d.clinicalAttributeId][f] = parseFloat(d.value);
                    }
                });
            })
        });
    }

    computeSurvival() {
        const survivalMonths = "OS_MONTHS";
        const survivalStatus = "OS_STATUS";
        let survivalEvents = [];
        let hasStatus = this.clinicalPatientCategories.map(d => d.id).includes(survivalStatus);
        if (this.clinicalPatientCategories.map(d => d.id).includes(survivalMonths)) {
            for (let patient in this.sampleStructure) {
                let status = undefined;
                if (hasStatus) {
                    status = this.staticMappers[survivalStatus][this.sampleStructure[patient][0]];
                }
                survivalEvents.push({
                    patient: patient,
                    date: this.staticMappers[survivalMonths][this.sampleStructure[patient][0]] * 30,
                    status: status
                })
            }
        }
        return survivalEvents;
    }


    /**
     *creates a mapping of an events to sampleIDs (events are mapped to the subsequent event)
     * @param eventType
     * @param selectedVariable
     * @returns {any[]}
     */
    getSampleEventMapping(eventType, selectedVariable) {
        let sampleMapper = {};
        this.eventTimelineMap[selectedVariable.id] = [];
        const _self = this;
        for (let patient in this.events) {
            let samples = [];
            //extract samples for current patient
            this.transitionStructure.forEach(function (g) {
                g.forEach(function (l) {
                    if (l.patient === patient) {
                        if (!(l.sample in sampleMapper)) {
                            sampleMapper[l.sample] = false;
                        }
                        samples.push(l.sample);
                    }
                });
            });
            if (samples.length > 0) {
                let counter = 0;
                let currentStart = Number.NEGATIVE_INFINITY;
                let currentEnd = this.sampleTimelineMap[samples[counter]].startNumberOfDaysSinceDiagnosis;
                let i = 0;
                while (i < this.events[patient].length) {
                    let start = this.events[patient][i].startNumberOfDaysSinceDiagnosis;
                    let end = this.events[patient][i].startNumberOfDaysSinceDiagnosis;
                    if (this.events[patient][i].hasOwnProperty("endNumberOfDaysSinceDiagnosis")) {
                        end = this.events[patient][i].endNumberOfDaysSinceDiagnosis;
                    }
                    if (RootStore.isInCurrentRange(this.events[patient][i], currentStart, currentEnd)) {
                        let matchingId = _self.doesEventMatch(eventType, selectedVariable, this.events[patient][i]);
                        if (matchingId !== null) {
                            sampleMapper[samples[counter]] = true;
                            _self.eventTimelineMap[matchingId].push({
                                time: counter,
                                patientId: patient,
                                sampleId: samples[counter],
                                eventDate: start,
                                eventEndDate: end,
                                varId: matchingId
                            });
                        }
                        i++;
                    }
                    else {
                        if (start >= currentEnd) {
                            currentStart = _self.sampleTimelineMap[samples[counter]].startNumberOfDaysSinceDiagnosis;
                            if (counter + 1 < samples.length - 1) {
                                currentEnd = _self.sampleTimelineMap[samples[counter + 1]].startNumberOfDaysSinceDiagnosis;
                            }
                            else {
                                currentEnd = Number.POSITIVE_INFINITY;
                            }
                            counter++;
                        }
                        else {
                            i++;
                        }
                    }
                }
            }
        }
        return sampleMapper;
    }

    /**
     * checks of the selected event matches the current event
     * @param type
     * @param value
     * @param event
     * @returns {*}
     */
    doesEventMatch(type, value, event) {
        let matchingId = null;
        if (type === event.eventType) {
            event.attributes.forEach(function (f) {
                if (f.key === value.eventType && f.value === value.name) {
                    matchingId = value.id;
                }
            })
        }
        return matchingId;
    }

    /**
     * checks if an event has happened in a specific timespan
     * @param event
     * @param currMinDate
     * @param currMaxDate
     * @returns {boolean}
     */
    static isInCurrentRange(event, currMinDate, currMaxDate) {
        let isInRange = false;
        if (event.hasOwnProperty("endNumberOfDaysSinceDiagnosis")) {
            if ((event.endNumberOfDaysSinceDiagnosis <= currMaxDate && event.endNumberOfDaysSinceDiagnosis > currMinDate) || (event.startNumberOfDaysSinceDiagnosis < currMaxDate && event.startNumberOfDaysSinceDiagnosis >= currMinDate)) {
                isInRange = true
            }

        }
        else if (event.startNumberOfDaysSinceDiagnosis < currMaxDate && event.startNumberOfDaysSinceDiagnosis >= currMinDate) {
            isInRange = true;
        }
        return isInRange;
    }


    /**
     * gets all the different attributes an event can have
     */
    getEventAttributes(events, excludeDates) {
        let attributes = {};
        for (let patient in events) {
            events[patient].forEach(function (d, i) {
                if (!excludeDates[patient].includes(d.startNumberOfDaysSinceDiagnosis) || d.hasOwnProperty("endNumberOfDaysSinceDiagnosis")) {
                    if (!(d.eventType in attributes)) {
                        attributes[d.eventType] = {}
                    }
                    d.attributes.forEach(function (f, j) {
                        if (!(f.key in attributes[d.eventType])) {
                            attributes[d.eventType][f.key] = [];
                            attributes[d.eventType][f.key].push({name: f.value, id: uuidv4(), eventType: f.key});
                        }
                        else {
                            if (!attributes[d.eventType][f.key].map(function (g) {
                                return g.name
                            }).includes(f.value)) {
                                attributes[d.eventType][f.key].push({name: f.value, id: uuidv4(), eventType: f.key});
                            }
                        }
                    })
                }

            })
        }

        this.eventAttributes = attributes;
    }

}

export default RootStore