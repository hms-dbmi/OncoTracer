import React from 'react';
import {observer} from 'mobx-react';
import {Button, Checkbox, ControlLabel, FormControl, Modal} from 'react-bootstrap';
import BinaryCombine from "./BinaryCombine";
import DerivedVariable from "../../../DerivedVariable";
import uuidv4 from 'uuid/v4';
import MapperCombine from "../../../MapperCombineFunctions";
import ColorScales from "../../../ColorScales";


const CombineModal = observer(class CombineModal extends React.Component {

    constructor(props) {
        super(props);
        this.modificationType = this.getModificationType();
        this.state = this.getInitialState();
        this.setModification = this.setModification.bind(this);
        this.setColors = this.setColors.bind(this);
        this.setOrdinal = this.setOrdinal.bind(this);
        this.setCurrentVarCategories = this.setCurrentVarCategories.bind(this);
        this.handleApply = this.handleApply.bind(this);
        this.handleNameChange = this.handleNameChange.bind(this);
        this.getMapper = this.getMapper.bind(this);

    }

    /**
     * get type of combine based on input variables
     * @returns {*}
     */
    getModificationType() {
        let modificationType;
        if (this.props.derivedVariable !== null) {
            modificationType = this.props.derivedVariable.modificationType;
        }
        else {
            if (this.props.variables.filter(d => d.datatype === "BINARY").length === this.props.variables.length) {
                modificationType = "binaryCombine"
            }
            else if (this.props.variables.filter(d => d.datatype === "NUMBER").length === 0) {
                modificationType = "categoryCombine"
            }
            else {
                modificationType = "numberCombine";
            }
        }
        return modificationType;
    }

    getInitialState() {
        let name;
        let modification = {operator: "", datatype: ""};
        let nameChanged = false;
        let variableRange = [];
        let keep = true;
        let ordinal = false;
        let currentVarCategories = [];
        if (this.props.derivedVariable !== null) {
            modification = this.props.derivedVariable.modification;
            name = this.props.derivedVariable.name;
            nameChanged = true;
            variableRange = this.props.derivedVariable.range;
            ordinal = this.props.derivedVariable.datatype === "ORDINAL";
            if (this.props.derivedVariable.modification.datatype === "STRING") {
                currentVarCategories=this.getCurrentDataOfDerivedVariable();
            }
        }
        else {
            if (this.modificationType === "binaryCombine") {
                name = "BINARY COMBINE: " + this.props.variables.map(d => d.name);
            }
            else if (this.modificationType === "categoryCombine") {
                name = "CATEGORY COMBINE: " + this.props.variables.map(d => d.name);
            }
            else {
                name = "NUMBER COMBINE: " + this.props.variables.map(d => d.name);
            }
        }
        return {
            name: name,
            modification: modification,
            nameChanged: nameChanged,
            variableRange: variableRange,
            keep: keep,
            ordinal: ordinal,
            currentVarCategories: currentVarCategories
        };
    }

    getCurrentDataOfDerivedVariable() {
        let currentVarCategories = [];
        this.props.derivedVariable.domain.forEach((d, i) => {
            for (let key in this.props.derivedVariable.modification.categoryMapping) {
                if (this.props.derivedVariable.modification.categoryMapping[key] === d) {
                    if (!(currentVarCategories.map(d => d.name).includes(d))) {
                        currentVarCategories.push({
                            selected: false,
                            name: d,
                            categories: [],
                            color: this.props.derivedVariable.range[i % this.props.derivedVariable.range.length]
                        })
                    }
                    currentVarCategories[currentVarCategories.map(d => d.name).indexOf(d)].categories.push(key);
                }
            }
        });
        return currentVarCategories;
    }

    /**
     * creates current data for displaying variable categories
     * @param modification
     * @param colors
     * @returns {Array}
     */
    createCurrentCategoryData(modification, colors) {
        let currentVarCategories = [];
        this.getDomain(modification).forEach((d, i) => {
            currentVarCategories.push({
                selected: false,
                name: d,
                categories: [d],
                color: colors[i % colors.length]
            })
        });
        return currentVarCategories;
    }

    /**
     * sets the current modification type and corresponding currentVarCategories and colors
     * @param modification
     */
    setModification(modification) {
        let currentVarCategories = [];
        let colors = [];
        if (modification.datatype === "STRING") {
            if (this.props.derivedVariable !== null && this.props.derivedVariable.modification.datatype === "STRING") {
                colors = this.props.derivedVariable.range;
            }
            else {
                colors = ColorScales.defaultCategoricalRange;
            }
            currentVarCategories = this.createCurrentCategoryData(modification, colors);
        }
        else {
            if (this.props.derivedVariable !== null && this.props.derivedVariable.modification.datatype === "BINARY") {
                colors = this.props.derivedVariable.range;
            }
            else {
                colors = ColorScales.defaultBinaryRange;
            }
        }
        this.setState({
            modification: modification,
            currentVarCategories: currentVarCategories,
            variableRange: colors
        });
    }

    /**
     * returns a mapper for a modification
     * @param modification
     */
    getMapper(modification) {
        let mapper = {};
        if (this.modificationType === "binaryCombine") {
            mapper = MapperCombine.createBinaryCombinedMapper(this.props.variables.map(d => d.mapper), modification, this.props.variables.map(d => d.name));
        }
        else if (this.modificationType === "categoryCombine") {
        }
        else if (this.modificationType === "numberCombine") {
        }
        return mapper;
    }

    /**
     * returns the domain of the current mapper
     * @param modification
     * @returns {Array}
     */
    getDomain(modification) {
        let currDomain = [];
        let mapper = this.getMapper(modification);
        for (let sample in mapper) {
            if (!(currDomain.includes(mapper[sample]))) {
                currDomain.push(mapper[sample]);
            }
        }
        return currDomain;
    }

    /**
     * sets colors for the combined variable
     * @param colors
     */
    setColors(colors) {
        this.setState({variableRange: colors});
    }

    setOrdinal(ordinal) {
        this.setState({ordinal: ordinal});
    }

    setCurrentVarCategories(currentVarCategories) {
        let categoryMapping = {};
        this.getDomain(this.state.modification).forEach((d) => {
            this.state.currentVarCategories.forEach(f => {
                if (f.categories.includes(d)) {
                    categoryMapping[d] = f.name;
                }
            });
        });
        const range = this.state.currentVarCategories.map(d => d.color);
        this.setState({
            currentVarCategories: currentVarCategories,
            variableRange: range,
            modification: {operator: "or", datatype: "STRING", categoryMapping: categoryMapping}
        });
    }

    /**
     * handles the name change
     * @param event
     */
    handleNameChange(event) {
        this.setState({name: event.target.value, nameChanged: true});
    }

    getModificationPanel() {
        if (this.modificationType === "binaryCombine") {
            return <BinaryCombine setModification={this.setModification}
                                  ordinal={this.state.ordinal}
                                  modification={this.state.modification}
                                  mapper={this.getMapper(this.state.modification)}
                                  variableRange={this.state.variableRange}
                                  variableDomain={this.getDomain(this.state.modification)}
                                  currentVarCategories={this.state.currentVarCategories}
                                  setOrdinal={this.setOrdinal}
                                  setColors={this.setColors}
                                  setCurrentVarCategories={this.setCurrentVarCategories}/>
        }
    }


    handleApply() {
        let dataType, description;
        let mapper = this.getMapper(this.state.modification);
        if (this.modificationType === "binaryCombine") {
            if (this.state.modification.datatype === "BINARY") {
                dataType = "BINARY";
                description = "Binary combination of " + this.props.variables.map(d => d.name);
            }
            else {
                if (this.state.ordinal) {
                    dataType = "ORDINAL";
                }
                else {
                    dataType = "STRING";
                }
                description = "Binary combination of " + this.props.variables.map(d => d.name);
                if (this.state.modification.categoryMapping !== null) {
                    mapper = MapperCombine.createModifyCategoriesMapper(mapper, this.state.modification.categoryMapping);
                }
            }
        }
        else if (this.modificationType === "categoryCombine") {
            dataType = "STRING";
            description = "Combination of the categories of" + this.props.variables.map(d => d.name);

        }
        else if (this.modificationType === "numberCombine") {
            dataType = "NUMBER";
            description = "Numerical combination of " + this.props.variables.map(d => d.name);

        }
        this.props.callback(new DerivedVariable(uuidv4(), this.state.name, dataType, description, this.props.variables.map(d => d.id), this.modificationType, this.state.modification, this.state.variableRange, [], mapper, this.props.variables[0].profile,this.props.variables[0].type), this.state.keep);
        this.props.closeModal();
    }


    render() {
        return (
            <Modal show={this.props.modalIsOpen}
                   onHide={this.props.closeModal}>
                <Modal.Header closeButton>
                    <Modal.Title>Combine Variables</Modal.Title>
                </Modal.Header>
                <Modal.Body style={{minHeight: "400px"}}>
                    <ControlLabel>Variable name</ControlLabel>
                    <FormControl
                        type="text"
                        value={this.state.name}
                        onChange={this.handleNameChange}/>
                    {this.getModificationPanel()}
                </Modal.Body>
                <Modal.Footer>
                    <Checkbox disabled={this.props.derivedVariable !== null}
                              onChange={() => this.setState({keep: !this.state.keep})} checked={!this.state.keep}>Discard
                        original variables</Checkbox>
                    <Button onClick={this.props.closeModal}>
                        Cancel
                    </Button>
                    <Button onClick={this.handleApply}>
                        Apply
                    </Button>
                </Modal.Footer>
            </Modal>
        )
    }
});
export default CombineModal;