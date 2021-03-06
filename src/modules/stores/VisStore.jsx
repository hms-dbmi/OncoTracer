import { action, extendObservable, reaction } from 'mobx';
import * as d3 from 'd3';

/*
 stores information about current visual parameters
 */
class VisStore {
    constructor(rootStore) {
        this.rootStore = rootStore;
        this.primaryHeight = 30;
        this.secondaryHeight = 20;
        this.verticalGap = 1;
        this.partitionGap = 25;
        this.strokeW = 5;
        this.currentSVGHeight = undefined;
        this.currentVerticalZoomLevel = undefined;
        this.initialVerticalZoomLevel = undefined;

        this.globalTimelineColors = d3.scaleOrdinal().range([ '#38aab0', '#f0027f', '#bf5b17', '#6a3d9a', '#ff7f00', '#d864f5', '#7fc97f', '#beaed4', '#fdc086','#c4c423']);
        extendObservable(this, {
            colorRectHeight: 2,
            bandRectHeight: 15,
            transitionSpaces: [],
            plotHeight: 700,
            plotWidth: 700,
            horizontalZoom: 0,
            spreadAll: false,
            

            /**
             * Toggle the value of spreadAll,
             * which indicates whether the events for all patient in the global time line
             * will be spread out or not
             */
            toggleSpreadAll: action(() => {
                this.spreadAll = !this.spreadAll;
            }),
            /**
             * set plot height to current height
             */
            setPlotHeight: action((height) => {
                this.plotHeight = height;
            }),
            /**
             * sets plot width to current width
             */
            setPlotWidth: action((width) => {
                this.plotWidth = width;
            }),
            /**
             * fits content to visible area
             */
            fitToScreenHeight: action(() => {
                let heightWithoutSpace = 0;
                this.rootStore.dataStore.timepoints.forEach((d) => {
                    heightWithoutSpace += this.getTPHeight(d);
                });

                // current space used for transitions
                let currentHeight = this.transitionSpaces
                    .reduce((a, b) => a + b, 0);

                // space that is available for transitions in the visible part of the plot
                let availableHeight = this.plotHeight - heightWithoutSpace;

                // case: transitions have to be stretched
                if (availableHeight < currentHeight) {
                    // total height of transitions that already have minimum height
                    const unreducableHeight = this.transitionSpaces
                        .filter(space => space === this.minTransHeight)
                        .reduce((a, b) => a + b, 0);

                    // adapt current and available height
                    currentHeight -= unreducableHeight;
                    availableHeight -= unreducableHeight;
                }

                // adapt transition spaces
                this.transitionSpaces.replace(this.transitionSpaces.map((space) => {
                    let transitionSpace = availableHeight * (space / currentHeight);
                    if (transitionSpace < this.minTransHeight) {
                        transitionSpace = this.minTransHeight;
                    }
                    return transitionSpace;
                }));
                if(this.rootStore.uiStore.selectedTab === 'line') {
                    this.currentVerticalZoomLevel = Math.max(...this.transitionSpaces);
                    this.initialVerticalZoomLevel = this.currentVerticalZoomLevel;
                }
            }),
            /**
             * fits content to screen height if the height of the svg would otherwise be bigger
             */
            fitToBlockHeight: action(() => {
                if (this.plotHeight < this.svgHeight) {
                    this.fitToScreenHeight();
                }
            }),
            /**
             * fits content to current width
             */
            fitToScreenWidth: action(() => {
                this.horizontalZoom = 300 - (this.rootStore.dataStore.numberOfPatients
                < 300 ? this.rootStore.dataStore.numberOfPatients : 300);
            }),
            /**
             * sets horizontal zoom level
             */
            setHorizontalZoom: action((zoomLevel) => {
                this.horizontalZoom = zoomLevel;
            }),
            /**
             * resets the transition spaces to the number of timepoints -1
             */
            resetTransitionSpaces: action(() => {
                this.transitionSpaces.replace(Array(this.rootStore.dataStore.timepoints.length - 1)
                    .fill(this.minTransHeight));
                this.fitToScreenHeight();
            }),
            /**
             * sets all transition spaces to the same value
             * @param {number} value
             */
            setAllTransitionSpaces: action((value) => {
                let val;
                if (value < this.minTransHeight) {
                    val = this.minTransHeight;
                } else {
                    val = value;
                }
                if(this.rootStore.uiStore.selectedTab === 'line') {
                    this.currentVerticalZoomLevel = val;
                }
                this.transitionSpaces.replace(Array(this.transitionSpaces.length)
                    .fill(val));
        }),
            /**
             * sets a transition space at an index to a value
             * @param {number} index
             * @param {number} value
             */
            setTransitionSpace: action((index, value) => {
                if (value >= this.minTransHeight) {
                    this.transitionSpaces[index] = value;
                }
            }),
            /**
             * sets the height of the rects for the band proxies
             * @param {number} bandRectHeight
             */
            setBandRectHeight: action((bandRectHeight) => {
                this.bandRectHeight = bandRectHeight;
            }),
            /**
             * sets the height of the rects for the color proxies
             * @param {number} colorRectHeight
             */
            setColorRectHeight: action((colorRectHeight) => {
                this.colorRectHeight = colorRectHeight;
            }),
            /**
             * height of svg based on zoom level
             * @returns {*}
             */
            get svgHeight() {
                const h = this.timepointPositions.connection[this.timepointPositions.connection.length - 1]
                    + this.getTPHeight(this.rootStore.dataStore.timepoints[this.rootStore.dataStore.timepoints.length - 1]);
                if(this.rootStore.uiStore.selectedTab === 'line') {
                    this.currentSVGHeight = window.innerHeight - 200;
                    if(this.currentVerticalZoomLevel === undefined) {
                        //this.currentSVGHeight = window.innerHeight - 200;
                        this.currentVerticalZoomLevel = Math.max(...this.transitionSpaces);
                        this.initialVerticalZoomLevel = this.currentVerticalZoomLevel;
                    }

                    //console.log("in globaltime, height= " + this.currentSVGHeight * this.currentVerticalZoomLevel / this.initialVerticalZoomLevel);
                    return this.currentSVGHeight * this.currentVerticalZoomLevel / this.initialVerticalZoomLevel;
                }
                else {    
                    return h;
                }
                
            },
            /**
             * width of rects based on plot width and zoom level
             * @returns {number}
             */
            get sampleRectWidth() {
                return this.plotWidth / (300 - this.horizontalZoom) - this.verticalGap;
            },
            /**
             * minimum height of transitions
             * @return {number}
             */
            get minTransHeight() {
                return 2 * (this.bandRectHeight + this.colorRectHeight
                    + this.rootStore.uiStore.horizontalGap) + this.primaryHeight;
            },
            /**
             * size of timeline rects based on rect width
             * @returns {number}
             */
            get timelineRectSize() {
                return this.sampleRectWidth * (2 / 5);
            },
            /**
             * radius of sample variable circles in global view
             */
            get sampleRadius() {
                //return this.sampleRectWidth / 5;
                return this.sampleRectWidth / 10;
            },
            /**
             * radius of event variable circles in global view
             */
            get eventRadius() {
                return this.sampleRectWidth / 10;
            },
            /**
             * width of heatmap
             * @returns {number}
             */
            get heatmapWidth() {
                return this.rootStore.dataStore.numberOfPatients
                    * (this.sampleRectWidth + this.verticalGap) - this.verticalGap;
            },
            /**
             * width of svg based on content
             * @returns {number}
             */
            get svgWidth() {
                if (this.heatmapWidth > this.plotWidth) {
                    return this.heatmapWidth + this.rootStore.dataStore.maxPartitions
                        * this.partitionGap + this.sampleRectWidth;
                }
                return this.plotWidth;
            },
            /**
             * positions of timepoints based on current transition space
             * @returns {{timepoint: Array, connection: Array}}
             */
            get timepointPositions() {
                const timepointPositions = { timepoint: [], connection: [] };
                let prevY = 0;
                this.rootStore.dataStore.timepoints.forEach((timepoint, i) => {
                    const tpHeight = this.getTPHeight(timepoint);
                    timepointPositions.timepoint.push(prevY);
                    timepointPositions.connection.push(prevY + tpHeight);
                    if (i < this.rootStore.dataStore.timepoints.length - 1) {
                        prevY += this.transitionSpaces[timepoint.globalIndex] + tpHeight;
                    }
                });
                return timepointPositions;
            },

            // encode event data in flow
            get newTimepointPositions() {
                const timepointPositions = { timepoint: [], connection: [] };
                let prevY = 0;
                this.rootStore.dataStore.timepoints.forEach((timepoint, i) => {
                    const tpHeight = this.getTPHeight(timepoint);
                    timepointPositions.timepoint.push(prevY);
                    
                    timepointPositions.connection.push(prevY + tpHeight);
                    
                    if (i < this.rootStore.dataStore.timepoints.length - 1) {
                        prevY += this.transitionSpaces[timepoint.globalIndex] + tpHeight;
                        // if(timepoint.type=='sample'){
                        //     prevY += this.transitionSpaces[timepoint.globalIndex] + tpHeight;
                        // }else{
                        //     prevY += tpHeight;
                        // }
                        
                    }
                });
                return timepointPositions;
            },
            /**
             * gets scales for placement of heatmap rectangles
             * @return {d3.scalePoint[]}
             */
            get heatmapScales() {
                return this.rootStore.dataStore.timepoints.map(d => d3.scalePoint()
                    .domain(d.heatmapOrder)
                    .range([0, this.heatmapWidth - this.sampleRectWidth]));
            },
            /**
             * gets scale for partition widths in grouped timepoints
             * @return {d3.scaleLinear}
             */
            get groupScale() {
                let {dataStore, uiStore} = this.rootStore

                return d3.scaleLinear()
                .domain([0, dataStore.numberOfPatients])
                .range([0, this.plotWidth - dataStore.maxPartitions * this.partitionGap - uiStore.rowOffset * 2 - this.strokeW*2] );
            },
            /**
             * gets scale for placement of events and samples on time axis in global timeline
             * @return {d3.scaleLinear}
             */
            get timeScale() {
                return d3.scaleLinear().domain([0, this.rootStore.maxTimeInDays])
                    .rangeRound([0, this.svgHeight - this.primaryHeight * 2]);
            },
        });
        this.fitToScreenWidth = this.fitToScreenWidth.bind(this);
        this.fitToScreenHeight = this.fitToScreenHeight.bind(this);
        reaction(() => this.plotHeight,
            () => this.fitToScreenHeight());
    }

    /**
     * gets height of a timepoint
     * @param timepoint
     * @returns {number}
     */
    getTPHeight(timepoint) {
        let height = 0;
        let varCount = 0;
        this.rootStore.dataStore.variableStores[timepoint.type].currentVariables
            .forEach((variableId, i) => {
                if (!timepoint.heatmap[i].isUndef || this.rootStore.uiStore.showUndefined
                    || variableId === timepoint.primaryVariableId) {
                    varCount += 1;
                    if (variableId === timepoint.primaryVariableId && this.rootStore.uiStore.selectedTab==='block') {
                        // only have primary variable at block view V1
                        height += this.primaryHeight;
                    } else {
                        height += this.secondaryHeight;
                    }
                }
            });
    
        return height + (varCount - 1) * this.rootStore.uiStore.horizontalGap;
    }

    /**
     * get the width of a grouped timepoint at a specific index
     * @param {number} index - timepoint index
     * @return {number}
     */
    getTPWidth(index) {
        return this.groupScale(this.rootStore.dataStore.getNumTPPatients(index))
            + (this.rootStore.dataStore.getNumTPPartitions(index) - 1) * this.partitionGap
            + this.rootStore.uiStore.rowOffset * 2;
    }

    /**
     * get x transformation of a timepoint depending on the current block alignment
     * @param {number} index -  timepoint index
     * @return {number}
     */
    getTpXTransform(index) {
        switch (this.rootStore.uiStore.blockAlignment) {
        case 'left':
            return 0;
        case 'middle':
            return (this.plotWidth - this.getTPWidth(index)) / 2;
        default:
            return this.plotWidth - this.getTPWidth(index);
        }
    }
}

export default VisStore;
