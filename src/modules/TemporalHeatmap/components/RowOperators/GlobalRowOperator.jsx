import React from 'react';
import { inject, observer } from 'mobx-react';
import UtilityFunctions from '../../UtilityClasses/UtilityFunctions';

/**
 * Component for a a row operators of a timepont type in the Global timeline
 */
const GlobalRowOperator = inject('dataStore', 'visStore', 'undoRedoStore')(observer(class GlobalRowOperator extends React.Component {
    constructor(props) {
        super(props);
        this.promote = this.promote.bind(this);
        this.iconScale = (props.visStore.secondaryHeight) / 24;
        this.iconDimensions = 24;
    }


    /**
     * creates an icon for deleting and associates it with the corresponding functions
     * @param {(DerivedVariable|OriginalVariable)} variable
     * @param {number} xPos
     * @return {g}
     */
    getDeleteIcon(variable, xPos) {
        return (
            <g
                id="delete"
                className="not_exported"
                transform={`translate(${xPos},0)scale(${this.iconScale})`}
                onMouseEnter={e => this.props.showTooltip(e, 'Delete variable from all blocks ')}
                onMouseLeave={this.props.hideTooltip}
            >
                <path
                    fill="gray"
                    d="M12.12,10,20,17.87,17.87,20,10,12.12,2.13,20,0,17.87,7.88,10,0,2.13,2.13,0,10,7.88,17.87,0,20,2.13Z"
                />
                <rect
                    onClick={() => this.handleDelete(variable)}
                    width={this.iconDimensions}
                    height={this.iconDimensions}
                    fill="none"
                    pointerEvents="visible"
                />
            </g>
        );
    }


    /**
     * creates the label for a row
     * @param {(OriginalVariable|DerivedVariable)} variable
     * @param {*} fontWeight
     * @param {number} fontSize
     * @return {*}
     */
    getRowLabel(variable, fontWeight, fontSize) {
        let promoteFunction = null;
        let colorRect = null;
        if (this.props.type === 'sample') {
            promoteFunction = () => this.promote(variable.id);
        } else {
            colorRect = (
                <rect
                    key="rect"
                    width={fontSize}
                    height={fontSize}
                    x={this.props.width - this.iconScale * this.iconDimensions - fontSize}
                    fill={this.props.visStore.globalTimelineColors(variable.id)}
                    opacity={0.5}
                />
            );
        }
        return (
            <g
                key={variable.id}
                onMouseEnter={e => this.props.showTooltip(e, variable.name,
                    variable.description)}
                onMouseLeave={this.props.hideTooltip}
            >

                <text
                    style={{ fontWeight, fontSize }}
                    y={fontSize}
                    onClick={promoteFunction}
                >
                    {UtilityFunctions.cropText(variable.name, fontSize,
                        fontWeight, this.props.width - this.iconScale
                        * this.iconDimensions - fontSize)}
                </text>
                {this.getDeleteIcon(variable, this.props.width
                    - this.iconScale * this.iconDimensions)}
                {colorRect}
            </g>
        );
    }

    /**
     * Creates the Row operator for a timepoint
     */
    getRowOperator() {
        return this.props.dataStore.variableStores[this.props.type]
            .currentVariables.map((variableId, i) => {
                let lineHeight;
                let fontWeight;
                if (variableId === this.props.dataStore.globalPrimary) {
                    lineHeight = this.props.visStore.secondaryHeight;
                    fontWeight = 'bold';
                } else {
                    lineHeight = this.props.visStore.secondaryHeight;
                    fontWeight = 'normal';
                }
                const transform = `translate(0,${i * lineHeight})`;
                let fontSize = 10;
                if (lineHeight < fontSize) {
                    fontSize = Math.round(lineHeight);
                }
                return (
                    <g key={variableId} className="clickable" transform={transform}>
                        {this.getRowLabel(this.props.dataStore.variableStores[this.props.type]
                            .getById(variableId), fontWeight, fontSize)}
                    </g>
                );
            });
    }

    /**
     * handles deleting a timepoint
     * @param {(OriginalVariable|DerivedVariable)} variable
     */
    handleDelete(variable) {
        if (this.props.type === 'between' || this.props.dataStore.variableStores[this.props.type].currentVariables.length > 1) {
            this.props.dataStore.variableStores[this.props.type].removeVariable(variable.id);
            if (this.props.type.type === 'sample') {
                this.promote(this.props.dataStore.variableStores.sample.currentVariables[0]);
            }
        } else {
            alert('Samples have to be represented by at least one variable');
        }
    }

    /**
     * promotes a variable at a timepoint to a primary variable
     * @param {string} variableId - variable to be the primary variable
     */
    promote(variableId) {
        this.props.dataStore.setGlobalPrimary(variableId);
        this.props.undoRedoStore.saveGlobalHistory('PROMOTE');
    }

    render() {
        return (
            <svg width={this.props.width} height={this.props.height}>
                <g transform={this.props.transform}>
                    {this.getRowOperator()}
                </g>
            </svg>
        );
    }
}));
export default GlobalRowOperator;
