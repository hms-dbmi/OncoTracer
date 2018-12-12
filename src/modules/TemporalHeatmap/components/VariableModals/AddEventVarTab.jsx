import React from 'react';
import {observer} from 'mobx-react';
import EventVariableSelector from "./EventVariableSelector";
import VariableTable from "./VariableTable";
import UndoRedoStore from "../../UndoRedoStore";
import VariableManagerStore from "./VariableManagerStore";
import OriginalVariable from "../../OriginalVariable";
import EventVariable from "../../EventVariable";
import {toJS} from "mobx";


const AddEventVarTab = observer(class AddEventVarTab extends React.Component {
    constructor(props) {
        super();
        this.state = {
            addOrder: props.currentVariables.slice()

        };
        this.variableManagerStore = new VariableManagerStore(UndoRedoStore.serializeVariables(props.referencedVariables), props.currentVariables.slice());
        this.addEventVariable = this.addEventVariable.bind(this);
        this.addTimepointDistance = this.addTimepointDistance.bind(this);
        this.removeVariable = this.removeVariable.bind(this);
    }

    /**
     * adds event variable
     * @param event
     * @param eventCategory
     */
    addEventVariable(event, eventCategory) {
        this.variableManagerStore.addVariableToBeDisplayed(new EventVariable(event.id, event.name, eventCategory, event.eventType, [], this.props.store.getSampleEventMapping(eventCategory, event)));
        this.props.setData(this.variableManagerStore.currentVariables, this.variableManagerStore.referencedVariables);
        this.setState({addOrder: [...this.state.addOrder, event.id]})
    }

    /**
     * adds timepoint distance
     * @param timepointDistance
     */
    addTimepointDistance(timepointDistance) {
        this.variableManagerStore.addVariableToBeDisplayed(new OriginalVariable(timepointDistance.id, timepointDistance.name, timepointDistance.datatype, timepointDistance.description, [], [], this.props.staticMappers[timepointDistance.id], "Computed"));
        this.props.setData(this.variableManagerStore.currentVariables, this.variableManagerStore.referencedVariables);
        this.setState({addOrder: [...this.state.addOrder, timepointDistance.id]})

    }

    /**
     * removes variable
     * @param variableId
     */
    removeVariable(variableId) {
        this.variableManagerStore.removeVariable(variableId);
        if (this.state.addOrder.includes(variableId)) {
            let addOrder = this.state.addOrder.slice();
            addOrder.splice(this.addOrder.indexOf(variableId), 1);
            this.setState({addOrder: addOrder})
        }
        this.props.setData(toJS(this.variableManagerStore.currentVariables), this.variableManagerStore.referencedVariables);
    }

    static toTitleCase(str) {
        return str.replace(/\w\S*/g, function (txt) {
            return txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase();
        });
    }

    render() {
        let profiles = [...this.props.eventCategories.map(d => {
            return {id: d, name: AddEventVarTab.toTitleCase(d)}
        }), {id: "Computed", name: "Computed"}];
        return (
            <div>
                <EventVariableSelector {...this.props}
                                       eventCategories={profiles}
                                       addTimepointDistance={this.addTimepointDistance}
                                       addEventVariable={this.addEventVariable}
                                       removeVariable={this.removeVariable}
                                       currentVariables={this.variableManagerStore.currentVariables}/>
                <VariableTable {...this.props} variableManagerStore={this.variableManagerStore}
                               addOrder={this.state.addOrder} availableProfiles={profiles}/>
            </div>

        )
    }
});
export default AddEventVarTab;
