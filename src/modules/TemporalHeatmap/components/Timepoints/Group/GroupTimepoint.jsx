import React from 'react';
import {observer} from 'mobx-react';

import GroupPartition from './GroupPartition'
/*
creates a grouped timepoint
 */
const GroupTimepoint = observer(class GroupTimepoint extends React.Component {
    constructor() {
        super();
        this.handleMouseClick = this.handleMouseClick.bind(this);
    }

    /**
     * gets the different partitions in the grouped timepoint
     */
    getPartitions() {
        let partitions = [];
        let previousXPosition = 0;
        this.props.group.forEach((d, i)=> {
            const transform = "translate(" + previousXPosition + ",0)";
            let stroke = "none";
            if (this.isSelected(d.patients) && !this.props.store.rootStore.uiStore.advancedSelection) {
                stroke = "black";
            }
            partitions.push(<g key={d.partition} style={{backgroundColor: "darkgray"}}
                               onClick={(e) => this.handleMouseClick(e, d.patients)}
                               transform={transform}><GroupPartition visMap={this.props.visMap}
                                                                     store={this.props.store}
                                                                     heatmap={this.props.heatmap}
                                                                     currentVariables={this.props.currentVariables}
                                                                     groupScale={this.props.groupScale}
                                                                     tooltipFunctions={this.props.tooltipFunctions}
                                                                     partition={d}
                                                                     partitionIndex={i}
                                                                     stroke={stroke}
                                                                     primaryVariableId={this.props.primaryVariableId}/>
            </g>);

            previousXPosition += this.props.groupScale(d.patients.length) + 10;

        });
        return partitions;
    }

    handleMouseClick(event, patients) {
        if (event.button === 0) {
            this.props.store.handlePartitionSelection(patients);
        }
    }

    /**
     * checks if the patients in the partition are selected
     * @param patients
     * @returns {boolean}
     */
    isSelected(patients) {
        let isSelected = true;
        for (let i = 0; i < patients.length; i++) {
            if (!this.props.store.selectedPatients.includes(patients[i])) {
                isSelected = false;
                break;
            }
        }
        return isSelected;
    }

    render() {
        return (
            this.getPartitions()
        )
    }
});
export default GroupTimepoint;