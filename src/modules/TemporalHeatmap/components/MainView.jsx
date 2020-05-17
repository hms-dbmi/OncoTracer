import React from 'react';
import PropTypes from 'prop-types';
import { inject, observer } from 'mobx-react';
import { Tab, Tabs } from 'react-bootstrap';
import GlobalTimeline from './GlobalTimeline';
import BlockView from './BlockView';
import MyBlockView from './BlockViewMy';

/**
 * Component containing the main visualization
 */
const MainView = inject('rootStore', 'uiStore', 'undoRedoStore')(observer(class MainView extends React.Component {
    constructor(props) {
        super(props);
        this.handleSwitchView = this.handleSwitchView.bind(this);
    }

    /**
     * handles switching to global timeline and back
     * @param {boolean} key - global timeline (true) or block view (false)
     */
    handleSwitchView(key) {
        if (key !== this.props.uiStore.globalTime) {
            this.props.uiStore.setGlobalTime(key);
            this.props.undoRedoStore.saveSwitchHistory(this.props.uiStore.globalTime);
        }
    }

    getVisualization(){
        // create  views
        let blockView = null,
        timelineView = null,
        myblockView = null
        if (this.props.uiStore.globalTime==='myblock') {
            myblockView = (
                <MyBlockView
                    showContextMenuHeatmapRow={this.props.showContextMenuHeatmapRow}
                    tooltipFunctions={this.props.tooltipFunctions}
                    showContextMenu={this.props.showContextMenu}
                    openBinningModal={this.props.openBinningModal}
                    openSaveVarModal={this.props.openSaveVarModal}
                />
            );
        } else if(this.props.uiStore.globalTime==='line') {
            timelineView = (
                <GlobalTimeline
                    showContextMenuHeatmapRow={this.props.showContextMenuHeatmapRow}
                    tooltipFunctions={this.props.tooltipFunctions}
                    showContextMenu={this.props.showContextMenu}
                    openBinningModal={this.props.openBinningModal}
                    openSaveVarModal={this.props.openSaveVarModal}
                />
            ); 
        } else{
            blockView = (
                <BlockView
                    showContextMenuHeatmapRow={this.props.showContextMenuHeatmapRow}
                    tooltipFunctions={this.props.tooltipFunctions}
                    showContextMenu={this.props.showContextMenu}
                    openBinningModal={this.props.openBinningModal}
                    openSaveVarModal={this.props.openSaveVarModal}
                />
            );
        }

        return (
            // <Grid fluid className="tabContent">
                <Tabs
                    style={{width:"100%"}}
                    mountOnEnter
                    unmountOnExit
                    animation={false}
                    activeKey={this.props.uiStore.globalTime}
                    onSelect={this.handleSwitchView}
                    id="viewTab"
                >
                    <Tab eventKey='myblock' style={{ paddingTop: 10 }} title="New">
                        {myblockView}
                    </Tab>
                    <Tab eventKey='block' style={{ paddingTop: 10 }} title="Block View">
                        {blockView}
                    </Tab>
                    <Tab eventKey='line' style={{ paddingTop: 10 }} title="Timeline">
                        {timelineView}
                    </Tab>
                </Tabs>
            // </Grid>
        );
    }


    render() {
        if(this.props.rootStore.dataStore.variableStores.sample.currentVariables.length > 0 ||
            this.props.rootStore.dataStore.variableStores.between.currentVariables.length > 0){
            return(this.getVisualization())
        }
        else{
            const noDataText = 'No data currently selected. Use "Add" button or "Feature Manager" to select one or more timepoint features';
            return(
                <div style={{height:this.props.rootStore.visStore.plotHeight}}>
                    <div className='centeredText'>
                        {noDataText}
                    </div>
                </div>
            )
        }
    }
}));
MainView.propTypes = {
    tooltipFunctions: PropTypes.objectOf(PropTypes.func).isRequired,
    showContextMenu: PropTypes.func.isRequired,
    showContextMenuHeatmapRow: PropTypes.func.isRequired,
    openBinningModal: PropTypes.func.isRequired,
    openSaveVarModal: PropTypes.func.isRequired,
};
export default MainView;
