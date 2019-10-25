import React from 'react';
import PropTypes from 'prop-types';
import { inject, observer } from 'mobx-react';
import { Grid, Tab, Tabs } from 'react-bootstrap';
import GlobalTimeline from './GlobalTimeline';
import BlockView from './BlockView';

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


    render() {
        // create  views
        let blockView = null;
        let timelineView = null;
        if (!this.props.uiStore.globalTime) {
            blockView = (
                <BlockView
                    showContextMenuHeatmapRow={this.props.showContextMenuHeatmapRow}
                    tooltipFunctions={this.props.tooltipFunctions}
                    showContextMenu={this.props.showContextMenu}
                    openBinningModal={this.props.openBinningModal}
                    openSaveVarModal={this.props.openSaveVarModal}
                />
            );
        } else {
            timelineView = (
                <GlobalTimeline
                    tooltipFunctions={this.props.tooltipFunctions}
                    openSaveVarModal={this.props.openSaveVarModal}
                />
            );
        }
        return (
            <Grid fluid>
                <Tabs
                    mountOnEnter
                    unmountOnExit
                    animation={false}
                    activeKey={this.props.uiStore.globalTime}
                    onSelect={this.handleSwitchView}
                    id="viewTab"
                >
                    <Tab eventKey={false} style={{ paddingTop: 10 }} title="Block View">
                        {blockView}
                    </Tab>
                    <Tab eventKey style={{ paddingTop: 10 }} title="Timeline">
                        {timelineView}
                    </Tab>
                </Tabs>
            </Grid>
        );
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
