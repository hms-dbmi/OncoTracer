import React from 'react';
import PropTypes from 'prop-types';
import { inject, observer, Provider } from 'mobx-react';
import FontAwesome from 'react-fontawesome';
import { extendObservable, reaction } from 'mobx';
import { Button, Col, Row } from 'antd';
import { Pane, SortablePane } from 'react-sortable-pane';
import {Switch} from 'antd'
import HeatmapGroupTransition from './Transitions/HeatmapGroupTransition/HeatmapGroupTransition';
import LineTransition from './Transitions/LineTransition/LineTransition';
import SankeyTransition from './Transitions/SankeyTransition/SankeyTransition';
import GroupTimepoint from './Timepoints/GroupTimepointCustom';
import TimepointLabels from './PlotLabeling/TimepointLabels';
import RowOperators from './RowOperatorsNew';
import Legend from './Legend';
import CustomGrouping from './StateTransition/CustomGrouping';


/**
 * Component for the Block view
 */
const BlockView = inject('rootStore', 'uiStore', 'undoRedoStore')(observer(class BlockView extends React.Component {
    constructor(props) {
        super(props);
        this.padding = 20;
        this.blockWidthRatio = 0.75
        this.blockView = React.createRef();

        this.handleTimeClick = this.handleTimeClick.bind(this);
        this.setHighlightedVariable = this.setHighlightedVariable.bind(this);
        this.removeHighlightedVariable = this.removeHighlightedVariable.bind(this);
        this.updateDimensions = this.updateDimensions.bind(this);
        extendObservable(this, {
            highlightedVariable: '', // variableId of currently highlighted variable
            order: ['labels', 'operators', 'view', 'legend'],
            width:window.innerWidth,
            height: window.innerHeight-250,
            hasBackground:true,
            panes: {
                labels: { width: (window.innerWidth - 40) * this.blockWidthRatio / 10 * 0.7, active: false },
                operators: { width: ((window.innerWidth - 40) *this.blockWidthRatio / 10) * 1.3, active: false },
                view: { width: ((window.innerWidth - 40) * this.blockWidthRatio / 10) * 6.5, active: false },
                legend: { width: (window.innerWidth - 40) * this.blockWidthRatio / 10 * 1.3, active: false },
            },
            ref: React.createRef(),
            active: {
                labels: false,
                operators: false,
                view: false,
                legend: false,
            },
        });
        reaction(() => this.panes.view.width, (width) => {
            this.props.rootStore.visStore.setPlotWidth(width - 10);
        });
    }

    /**
     * Add event listener
     */
    componentDidMount() {

        this.width = this.ref.current.getBoundingClientRect().width
        this.updateDimensions()

        this.props.rootStore.visStore.setPlotWidth(this.panes.view.width - 10);
        this.props.rootStore.visStore
            .setPlotHeight(window.innerHeight - this.blockView
                .current.getBoundingClientRect().top);
        window.addEventListener('resize', this.updateDimensions);

    }

    /**
     * Remove event listener
     */
    componentWillUnmount() {
        window.removeEventListener('resize', this.updateDimensions);
    }

    /**
     * updates view dimensions
     */
    updateDimensions() {
        const prevWidth = Object.values(this.panes).map(d => d.width).reduce((a, b) => a + b);
        this.panes = {
            labels: {
                width: (this.width - 40)* this.blockWidthRatio / (prevWidth / this.panes.labels.width),
            },
            operators: {
                width: (this.width - 40) * this.blockWidthRatio/ (prevWidth / this.panes.operators.width),
            },
            view: {
                width: (this.width- 40) * this.blockWidthRatio / (prevWidth / this.panes.view.width),
            },
            legend: {
                width: (this.width - 40) * this.blockWidthRatio / (prevWidth / this.panes.legend.width),
            },
        };
        this.props.rootStore.visStore
            .setPlotHeight(window.innerHeight - this.blockView
                .current.getBoundingClientRect().top);

        this.height = window.innerHeight - 250
    }

    /**
     * sets a variable to be highlighted
     * @param {string} newHighlighted
     */
    setHighlightedVariable(newHighlighted) {
        this.highlightedVariable = newHighlighted;
    }

    /**
     * removes the highlighted variable
     */
    removeHighlightedVariable() {
        this.highlightedVariable = '';
    }


    /**
     * handle visualizing real time
     */
    handleTimeClick() {
        this.props.rootStore.dataStore.applyPatientOrderToAll(0);
        this.props.uiStore.setRealTime(!this.props.uiStore.realTime);
        this.props.undoRedoStore.saveRealTimeHistory(this.props.uiStore.realTime);
    }

    /**
     * gets timepoints and transitions
     * @return {*[]}
     */
    getTimepointAndTransitions() {
        const timepoints = [];
        const transitions = [];
        this.props.rootStore.dataStore.timepoints
        .forEach((d, i) => {
            let rectWidth = this.props.rootStore.visStore.sampleRectWidth;
            // check the type of the timepoint to get the correct width of the heatmap rectangles
            
               
            // create timepoints
            if (d.heatmap) {
                
                    const transformTP = `translate(
                        ${this.props.rootStore.visStore.getTpXTransform(i)},
                        ${this.props.rootStore.visStore.newTimepointPositions.timepoint[i]}
                        )`;
                    timepoints.push(
                        <g key={d.globalIndex} transform={transformTP}>
                            <Provider
                                dataStore={this.props.rootStore.dataStore}
                                visStore={this.props.rootStore.visStore}
                            >
                                <GroupTimepoint
                                    type={d.type}
                                    group={d.customPartitions.length>0?d.customGrouped:d.grouped}
                                    heatmap={d.heatmap}
                                    index={i}
                                    currentVariables={this.props.rootStore.dataStore
                                        .variableStores[d.type].fullCurrentVariables}
                                    rectWidth={rectWidth}
                                    tooltipFunctions={this.props.tooltipFunctions}
                                    primaryVariableId={d.primaryVariableId}
                                    hasBackground={this.hasBackground}
                                />
                            </Provider>
                        </g>,
                    );
                
            }
            // create transitions
            // if(d.type=='between') return
            if (i !== this.props.rootStore.dataStore.timepoints.length - 1) {
                const transformTR = `translate(0,${this.props.rootStore.visStore.newTimepointPositions.connection[i]})`;
                const firstTP = d;
                let secondTP = this.props.rootStore.dataStore.timepoints[i + 1];
                // if (secondTP.type=='between' & i<this.props.rootStore.dataStore.timepoints.length - 2){
                //     secondTP = this.props.rootStore.dataStore.timepoints[i + 2];
                // }
                let transition;
                if (firstTP.customPartitions.length>0) {
                    if (secondTP.customPartitions.length>0) {
                        transition = (
                            <Provider
                                dataStore={this.props.rootStore.dataStore}
                                visStore={this.props.rootStore.visStore}
                            >
                                <SankeyTransition
                                    index={i}
                                    firstGrouped={firstTP.customGrouped}
                                    secondGrouped={secondTP.customGrouped}
                                    firstPrimary={this.props.rootStore.dataStore
                                        .variableStores[firstTP.type]
                                        .getById(firstTP.primaryVariableId)}
                                    secondPrimary={this.props.rootStore.dataStore
                                        .variableStores[secondTP.type]
                                        .getById(secondTP.primaryVariableId)}
                                    tooltipFunctions={this.props.tooltipFunctions}
                                />
                            </Provider>
                        );
                    } else {
                        transition = (
                            <Provider
                                dataStore={this.props.rootStore.dataStore}
                                visStore={this.props.rootStore.visStore}
                            >
                                <HeatmapGroupTransition
                                    inverse={false}
                                    index={firstTP.globalIndex}
                                    partitions={firstTP.grouped}
                                    nonGrouped={secondTP}
                                    heatmapScale={this.props.rootStore.visStore
                                        .heatmapScales[i + 1]}
                                    colorScale={this.props.rootStore.dataStore
                                        .variableStores[firstTP.type]
                                        .getById(firstTP.primaryVariableId).colorScale}
                                />
                            </Provider>
                        );
                    }
                } else if (secondTP.isGrouped) {
                    transition = (
                        <Provider
                            dataStore={this.props.rootStore.dataStore}
                            visStore={this.props.rootStore.visStore}
                        >
                            <HeatmapGroupTransition
                                inverse
                                index={secondTP.globalIndex}
                                partitions={secondTP.grouped}
                                nonGrouped={firstTP}
                                heatmapScale={this.props.rootStore.visStore.heatmapScales[i]}
                                colorScale={this.props.rootStore.dataStore
                                    .variableStores[secondTP.type]
                                    .getById(secondTP.primaryVariableId).colorScale}
                            />
                        </Provider>
                    );
                } else {
                    transition = (
                        <Provider
                            dataStore={this.props.rootStore.dataStore}
                            visStore={this.props.rootStore.visStore}
                        >
                            <LineTransition
                                index={firstTP.globalIndex}
                                from={firstTP.patients}
                                to={secondTP.patients}
                                firstHeatmapScale={this.props.rootStore.visStore.heatmapScales[i]}
                                secondHeatmapScale={this.props.rootStore
                                    .visStore.heatmapScales[i + 1]}
                                secondTimepoint={secondTP}
                                timeGapMapper={this.props.rootStore
                                    .staticMappers[this.props.rootStore.timeDistanceId]}
                                colorScale={this.props.rootStore.dataStore
                                    .variableStores[secondTP.type]
                                    .getById(secondTP.primaryVariableId).colorScale}
                                tooltipFunctions={this.props.tooltipFunctions}    
                            />
                        </Provider>
                    );
                }
                transitions.push(
                    <g
                        key={firstTP.globalIndex}
                        transform={transformTR}
                    >
                        {transition}
                    </g>,
                );
            }
        });
        return [transitions, timepoints];
    }


    render() {
        return (
            <div className="blockView" ref={this.ref}>
                <div className="view" id="block-view" style={{height:this.height, overflowY:"scroll"}}>
                    <Row style={{marginLeft: '0'}}>
                        <Button
                            bsSize="xsmall"
                            onClick={this.handleTimeClick}
                            disabled={this.props.uiStore.selectedTab==='line'
                            || this.props.rootStore.dataStore.variableStores
                                .between.currentVariables.length > 0}
                            key="actualTimeline"
                        >
                            <FontAwesome
                                name="clock"
                            />
                            {' '}
                            {(this.props.uiStore.realTime) ? 'Hide Relative Time' : 'Show Relative Time'}
                        </Button>
                    </Row>
                    <Row>
                        <Col span={6}>
                            <CustomGrouping/>
                        </Col>
                        <Col span={18}>
                        <SortablePane
                            direction="horizontal"
                            margin={10}
                            order={this.order}
                            disableEffect
                            onOrderChange={(order) => {
                                this.order = order;
                            }}
                            onResizeStop={(e, key, dir, ref, d) => {
                                this.panes = {
                                    ...this.panes,
                                    [key]: { width: this.panes[key].width + d.width },
                                    [this.order[this.order.length - 1]]: {
                                        width: this.panes[this.order[this.order.length - 1]].width
                                            - d.width,
                                    },
                                };
                            }}
                            onDragStart={(e, key) => {
                                if (e.target.tagName === 'svg') {
                                    this.active[key] = true;
                                }
                            }}
                            onDragStop={(e, key) => {
                                this.active[key] = false;
                            }}
                        >
                            <Pane
                                className={`${this.active.labels ? 'pane-active' : 'pane-inactive'} timepointLabel`}
                                key="labels"
                                size={{ width: this.panes.labels.width }}
                            >
                                <Provider
                                    dataStore={this.props.rootStore.dataStore}
                                    visStore={this.props.rootStore.visStore}
                                    uiStore={this.props.uiStore}
                                >
                                    <TimepointLabels
                                        width={this.panes.labels.width - 10}
                                        padding={this.padding}
                                    />
                                </Provider>
                            </Pane>
                            <Pane
                                className={`${this.active.operators ? 'pane-active' : 'pane-inactive'} variableOperator`}
                                key="operators"
                                size={{ width: this.panes.operators.width }}
                                style={{ paddingTop: this.padding }}
                            >
                                <RowOperators
                                    highlightedVariable={this.highlightedVariable}
                                    width={this.panes.operators.width - 10}
                                    setHighlightedVariable={this.setHighlightedVariable}
                                    removeHighlightedVariable={this.removeHighlightedVariable}
                                    tooltipFunctions={this.props.tooltipFunctions}
                                    showContextMenu={this.props.showContextMenu}
                                    openBinningModal={this.props.openBinningModal}
                                    openSaveVarModal={this.props.openSaveVarModal}
                                />
                            </Pane>
                            <Pane
                                className={this.active.view ? 'pane-active' : 'pane-inactive'}
                                key="view"
                                size={{ width: this.panes.view.width }}
                                style={{ paddingTop: this.padding }}
                            >
                                <div ref={this.blockView} className="scrollableX">
                                    <Switch size="small" 
                                        onChange={()=>this.hasBackground=!this.hasBackground}
                                        checkedChildren="bg" unCheckedChildren="bg"
                                        style={{position:'absolute', top:"-15px"}}
                                    />
                                    <svg
                                        width={this.props.rootStore.visStore.svgWidth}
                                        height={this.props.rootStore.visStore.svgHeight}
                                    > <g transform={`translate(5, 5)`}>
                                        {this.getTimepointAndTransitions()}
                                    </g>
                                    </svg>
                                </div>
                            </Pane>
                            <Pane
                                className={this.active.legend ? 'pane-active' : 'pane-inactive'}
                                key="legend"
                                size={{ width: this.panes.legend.width }}
                                style={{ paddingTop: this.padding }}
                            >
                                <Legend
                                    highlightedVariable={this.highlightedVariable}
                                    setHighlightedVariable={this.setHighlightedVariable}
                                    removeHighlightedVariable={this.removeHighlightedVariable}
                                    {...this.props.tooltipFunctions}
                                />
                            </Pane>
                        </SortablePane>
                        </Col>
                    </Row>
                </div>
                <form id="svgform" method="post">
                    <input type="hidden" id="output_format" name="output_format" value=""/>
                    <input type="hidden" id="data" name="data" value=""/>
                </form>
            </div>
        );
    }
}));
BlockView.propTypes = {
    tooltipFunctions: PropTypes.objectOf(PropTypes.func).isRequired,
    showContextMenuHeatmapRow: PropTypes.func.isRequired,
};
export default BlockView;
