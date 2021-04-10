import { action, extendObservable } from 'mobx';
import * as introJs from 'intro.js'

/**
 * store for storing the UI state
 */

class UIStore {
    constructor() {
        extendObservable(this, {
            introTutorial: undefined, // whether is in the tutorial mode
            cBioInstance: 'own', // hack, portal, own
            continuousRepresentation: 'gradient', // gradient, boxplot, medium
            realTime: false, // show realtime lines in block view
            selectedTab: 'stateTransition', // show global timeline
            advancedSelection: true, // advanced selection enables
            showUndefined: true, // show rows with only undefined values
            slantedLines: 'none', // altWithin, altAcross, none, random
            blockAlignment: 'left', // left middle, right
            rowOffset: 0,
            horizontalStacking: false,
            horizontalGap: 1,
            selectedPatientGroupIdx: [0],
            setCBioInstance: action((instance) => {
                this.cBioInstance = instance;
            }),
            setContinuousRepresentation: action((representation) => {
                this.continuousRepresentation = representation;
            }),
            setRealTime: action((boolean) => {
                this.realTime = boolean;
            }),
            selectTab: action((key) => {
                this.selectedTab = key;
            }),
            setAdvancedSelection: action((boolean) => {
                this.advancedSelection = boolean;
            }),
            setShowUndefined: action((boolean) => {
                this.showUndefined = boolean;
            }),
            setSlantedLines: action((slantedLines) => {
                this.slantedLines = slantedLines;
            }),
            setHorizontalStacking: action((isHorizontal) => {
                this.horizontalStacking = isHorizontal;
            }),
            setBlockAlignment: action((blockAlignment) => {
                this.blockAlignment = blockAlignment;
            }),
            setRowOffset: action((offset) => {
                this.rowOffset = Number(offset);
            }),
            setHorizontalGap: action((horizontalGap) => {
                this.horizontalGap = Number(horizontalGap);
            }),
            selectPatientGroup: action((groupIdx)=>{
                let idx = this.selectedPatientGroupIdx.indexOf(groupIdx)
                if (idx===-1){
                    this.selectedPatientGroupIdx.push(groupIdx)
                }else{
                    this.selectedPatientGroupIdx.splice(idx, 1)
                }
                // this.selectedPatientGroupIdx = [this.selectedPatientGroupIdx[1], groupIdx]
            }),
            setTutorialMode:action((isIn)=>{
                if(isIn ){
                    if (this.introTutorial===undefined){
                        this.introTutorial = introJs()
                        this.introTutorial.oncomplete(()=>{
                            this.introTutorial = undefined
                        })
                        this.introTutorial.onexit(()=>{
                            this.introTutorial = undefined
                        })

                        this.introTutorial.setOption('showStepNumbers', false)
                    }
                    
                    this.introTutorial.start()
                }

                if (isIn===false && this.introTutorial !== undefined){
                    this.introTutorial.exit()
                    this.introTutorial = undefined
                }
            })
        });
    }
}

export default UIStore;
