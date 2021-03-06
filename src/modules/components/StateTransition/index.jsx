import React from 'react';
import PropTypes from 'prop-types';
import { inject, observer, Provider } from 'mobx-react';
import { extendObservable, } from 'mobx';

import { InputNumber, Card, Tooltip, Row, Col, Switch } from 'antd';
import { InfoCircleOutlined } from '@ant-design/icons';
import './index.css'

import CustomGrouping from './CustomGrouping'
import TransitionOverview from './TransitionOverview'
import TransitionComparison from './TransitionComparison'

import EventLegend from './EventLegend'

import GridLayout from 'react-grid-layout';

/**
 * Component for the Block view
 */
const StateTransition = inject('rootStore', 'uiStore', 'undoRedoStore')(observer(class StateTransition extends React.Component {
    widthRatios = [7, 6, 11]
    constructor(props) {
        super(props);

        this.updateDimensions = this.updateDimensions.bind(this);
        extendObservable(this, {
            highlightedVariable: '', // variableId of currently highlighted variable
            order: ['labels', 'operators', 'view', 'legend'],
            height: window.innerHeight - 360,
            width: window.innerWidth - 40,
            hasBackground: true,
            ref: React.createRef(),

        });
    }

    /**
     * Add event listener
     */
    componentDidMount() {

        this.updateDimensions()
        window.addEventListener('resize', this.updateDimensions);
    }

    /**
     * Remove event listener
     */
    componentWillUnmount() {
        window.removeEventListener('resize', this.updateDimensions);
    }

    updateDimensions() {
        this.height = window.innerHeight - 360
        this.width = window.innerWidth - 40

    }

    get overviewWidth() {
        return this.width / 24 * this.widthRatios[1] * 0.98
    }

    get comparisonWidth() {
        return this.width / 24 * this.widthRatios[2] * 0.98
    }



    render() {
        let { dataStore } = this.props.rootStore

        let controller = <span>
            Num of Sequence Groups
            <InputNumber min={1} step={1} value={dataStore.patientGroupNum} size="small" onChange={dataStore.changePatientGroupNum} />
        </span>

        let bgController = <span>
            <Switch size="small"
                checkedChildren="detailed" unCheckedChildren="only state"
                onChange={() => {
                    this.hasBackground = !this.hasBackground
                }} />
        </span>

        const dataIntroTransitionOverview = `<h4>Step 2: analyze the state transition among all patients.</h4> 
        The y-axis presents the timeline and the colored rectangle indicates patients of the same state.
        You can group patients based on their state transitions by changing the number in the top left input box.`

        return (
            <div className="stateTransition" ref={this.ref}>

                <Row>
                    <Col className="customGrouping" md={this.widthRatios[0]} sm={this.widthRatios[0]}>
                        <CustomGrouping />
                    </Col>

                    <Col md={this.widthRatios[1]} sm={this.widthRatios[1]}>
                        <Card title={<span style={{ fontSize: "17px" }}>Overview <Tooltip title="transition among the identified states"><InfoCircleOutlined translate='' /></Tooltip></span>}
                            extra={controller}
                            style={{ width: "98%" }}
                            bodyStyle={{padding:'0px'}}
                            data-intro={dataIntroTransitionOverview}
                            data-step="4"
                        >

                            <TransitionOverview width={this.overviewWidth} height={this.height}/>

                           
                        </Card>
                    </Col>

                    <Col md={this.widthRatios[2]} sm={this.widthRatios[2]}>
                        <Card title={<span style={{ fontSize: "17px" }}>Details <Tooltip title="detailed analysis of the cause of different state transitions"><InfoCircleOutlined translate='' /></Tooltip></span>}
                            extra={bgController}
                            style={{ width: "98%"}}
                            // style={{ width: (this.detailedWidthRatio * 100).toFixed(2) + '%', marginTop: "5px", marginLeft: "1%", float: "left" }}
                            data-intro="<h4>Step 3: Detailed Analysis</h4> You can select interested patient groups and observe the state transition details."
                            data-step='6'
                            bodyStyle={{padding:'0px'}}
                        >
                            <div className="stateTransition details" style={{ height: this.height, overflowY: "auto" }}>
                                
                                <TransitionComparison width={this.comparisonWidth} height={this.height} tooltipFunctions={this.props.tooltipFunctions} hasBackground={this.hasBackground} />
                        </div>

                    </Card>
                </Col>
            </Row>
        </div>
        );
    }
}));

export default StateTransition;
