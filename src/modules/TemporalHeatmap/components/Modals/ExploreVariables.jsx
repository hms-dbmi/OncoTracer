import React from 'react';

import { inject, observer } from 'mobx-react';
import { Button, Modal } from 'react-bootstrap';
import PropTypes from 'prop-types';
import { LineUp } from 'lineupjsx';
import { extendObservable } from 'mobx';


/**
 * Modal for choosing settings of the visualization
 * Settings: Visual representation of grouped continuous variables,
 * mode of selection (advanced/simplified), show rows of undefined values
 */
const ExploreVariables = inject('rootStore', 'variableManagerStore')(observer(class ExploreVariables extends React.Component {
    constructor(props) {
        super(props);
        extendObservable(this, {
            selected: [],
        });
        this.handleAdd = this.handleAdd.bind(this);
    }

    /**
     * handles adding the selected variables
     */
    handleAdd() {
        this.props.variables.forEach((variable, i) => {
            if (this.selected.includes(i)) {
                this.props.variableManagerStore.addVariableToBeDisplayed(variable);
            }
        });
        this.props.reset();
        this.props.close();
    }

    render() {
        // transform data for LineUp
        const data = this.props.variables.map((variable) => {
            console.log(variable.mapper);
            const newEntry = {};
            const values = Object.values(variable.mapper).filter(d => d !== undefined);
            newEntry.Name = variable.name;
            newEntry.Score = NaN;
            newEntry.Description = variable.description;
            newEntry.Datatype = variable.datatype;
            newEntry.Source = this.props.availableCategories
                .filter(category => category.id === variable.profile)[0].name;
            if (variable.datatype === 'NUMBER') {
                newEntry.Range = Math.max(...values) - Math.min(...values);
                newEntry.Categories = [];
                newEntry.NumCat = NaN;
            } else {
                newEntry.Range = NaN;
                newEntry['#Categories'] = variable.domain.length;
                newEntry.Categories = variable.domain;
            }
            if (variable.profile === 'clinSample') {
                newEntry.Score = this.props.rootStore.scoreStructure[variable.id];
            }
            newEntry['Missing Values'] = [].concat(...Object.values(this.props.rootStore.sampleStructure))
                .map(d => variable.mapper[d])
                .filter(d => d === undefined).length;
            return newEntry;
        });
        return (
            <Modal
                show={this.props.modalIsOpen}
                onHide={this.props.close}
                dialogClassName="fullSizeModal"
            >
                <Modal.Header closeButton>
                    <Modal.Title>Variable Explorer</Modal.Title>
                </Modal.Header>
                <Modal.Body>
                    <LineUp
                        data={data}
                        onSelectionChanged={(s) => {
                            this.selected = s;
                        }}
                        style={{ height: '800px' }}
                    />
                </Modal.Body>
                <Modal.Footer>
                    <Button onClick={this.props.close}>Close</Button>
                    <Button onClick={this.handleAdd}>Add Selected</Button>
                </Modal.Footer>
            </Modal>
        );
    }
}));
ExploreVariables.propTypes = {
    close: PropTypes.func.isRequired,
    modalIsOpen: PropTypes.bool.isRequired,
};
export default ExploreVariables;
