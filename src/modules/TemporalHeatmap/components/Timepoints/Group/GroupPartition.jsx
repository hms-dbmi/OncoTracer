import React from 'react';
import {observer} from 'mobx-react';

import CategoricalRow from './CategoricalRow'
import ContinuousRow from "./ContinuousRow";
/*
creates a partition in the grouped timepoint
 */
const GroupPartition = observer(class GroupPartition extends React.Component {
    createPartition() {
        const _self = this;
        let previousYposition = 0;
        let rows = [];
        this.props.partition.rows.forEach(function (d, i) {
            const color = _self.props.currentVariables[i].colorScale;
            let height = 0;
            let opacity = 1;
            let stroke = "none";
            const transform = "translate(0," + previousYposition + ")";
            if (_self.props.primaryVariableId === d.variable) {
                height = _self.props.visMap.primaryHeight;
                stroke = _self.props.stroke;
            }
            else {
                height = _self.props.visMap.secondaryHeight;
                opacity = 0.5;
            }
            if (_self.props.currentVariables[i].datatype === "NUMBER") {
                rows.push(<g key={d.variable} transform={transform}><ContinuousRow partition={d.counts} height={height}
                                                                                   opacity={opacity} color={color}
                                                                                   stroke={stroke}
                                                                                   variableDomain={_self.props.currentVariables[i].domain}
                                                                                   groupScale={_self.props.groupScale}
                                                                                   showTooltip={_self.props.showTooltip}
                                                                                   hideTooltip={_self.props.hideTooltip}
                                                                                   selectedPatients={_self.props.selectedPatients}
                                                                                   continuousRepresentation={_self.props.store.continuousRepresentation}/>
                </g>);
            }
            else {
                rows.push(<g key={d.variable} transform={transform}><CategoricalRow row={d.counts} height={height}
                                                                                    opacity={opacity} color={color}
                                                                                    stroke={stroke}
                                                                                    groupScale={_self.props.groupScale}
                                                                                    showTooltip={_self.props.showTooltip}
                                                                                    hideTooltip={_self.props.hideTooltip}
                                                                                    selectedPatients={_self.props.selectedPatients}
                                                                                    advancedSelection={_self.props.advancedSelection}/>
                </g>);
            }
            previousYposition += height + _self.props.visMap.gap;

        });
        return rows;
    }

    render() {
        return (
            this.createPartition()
        )
    }
});
export default GroupPartition;