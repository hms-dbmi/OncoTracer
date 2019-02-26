import {action, extendObservable, observe} from "mobx";

/*
Store containing information about variables
 */
class VariableManagerStore {
    constructor(referencedVariables, currentVariables, primaryVariables, savedReferences) {
        //Variables that are referenced (displayed or used to create a derived variable)
        this.referencedVariables = referencedVariables;
        this.primaryVariables = primaryVariables;
        this.savedReferences = savedReferences;
        extendObservable(this, {
            //List of ids of currently displayed variables
            currentVariables: currentVariables.map(d => {
                return {id: d, isNew: false, isSelected: false}
            }),
            addOrder:[],
            removeVariable: action(variableId => {
                this.currentVariables.remove(this.currentVariables.filter(d => d.id === variableId)[0]);
                this.addOrder.splice(this.addOrder.indexOf(variableId),1);
                if (this.primaryVariables.includes(variableId)) {
                    this.primaryVariables.forEach((d, i) => {
                        if (d === variableId) {
                            this.primaryVariables[i] = "";
                        }
                    })
                }
            }),
            addVariableToBeDisplayed: action(variable => {
                this.addVariableToBeReferenced(variable);
                if (!this.currentVariables.map(d => d.id).includes(variable.id)) {
                    this.currentVariables.push({id: variable.id, isNew: true, isSelected: false});
                    this.addOrder.push(variable.id);
                }
            }),


            replaceDisplayedVariable: action((oldId, newVariable) => {
                if (oldId !== newVariable.id) {
                    this.referencedVariables[newVariable.id] = newVariable;
                    const replaceIndex = this.currentVariables.map(d => d.id).indexOf(oldId);
                    this.currentVariables[replaceIndex] = {
                        id: newVariable.id,
                        isNew: this.currentVariables[replaceIndex].isNew,
                        isSelected: this.currentVariables[replaceIndex].isSelected
                    };
                }
                this.addOrder[this.addOrder.indexOf(oldId)]=newVariable.id;
                if (this.primaryVariables.includes(oldId)) {
                    for (let i = 0; i < this.primaryVariables.length; i++)
                        if (this.primaryVariables[i] === oldId) {
                            this.primaryVariables[i] = newVariable.id;
                        }
                }
            }),

            toggleSelected: action(id => {
                this.currentVariables[this.currentVariables.map(d => d.id).indexOf(id)].isSelected = !this.currentVariables[this.currentVariables.map(d => d.id).indexOf(id)].isSelected;
            }),

            sortBySource: action(profileOrder => {
                this.currentVariables.replace(this.currentVariables.sort((a, b) => {
                        if (profileOrder.indexOf(this.referencedVariables[a.id].profile) < profileOrder.indexOf(this.referencedVariables[b.id].profile)) {
                            return -1
                        }
                        if (profileOrder.indexOf(this.referencedVariables[a.id].profile) > profileOrder.indexOf(this.referencedVariables[b.id].profile)) {
                            return 1;
                        }
                        else return 0;
                    }
                ))
            }),

            sortByAddOrder: action(() => {
                this.currentVariables.replace(this.currentVariables.sort((a, b) => {
                        if (this.addOrder.indexOf(a.id) < this.addOrder.indexOf(b.id)) {
                            return -1
                        }
                        if (this.addOrder.indexOf(a.id) > this.addOrder.indexOf(b.id)) {
                            return 1;
                        }
                        else return 0;
                    }
                ))
            }),

            sortAlphabetically: action(() => {
                this.currentVariables.replace(this.currentVariables.sort((a, b) => {
                    if (this.referencedVariables[a.id].name < this.referencedVariables[b.id].name) {
                        return -1
                    }
                    if (this.referencedVariables[a.id].name > this.referencedVariables[b.id].name) {
                        return 1;
                    }
                    else return 0;
                }));
            }),

            sortByDatatype: action(() => {
                this.currentVariables.replace(this.currentVariables.sort((a, b) => {
                        if (this.referencedVariables[a.id].datatype < this.referencedVariables[b.id].datatype) {
                            return -1
                        }
                        if (this.referencedVariables[a.id].datatype > this.referencedVariables[b.id].datatype) {
                            return 1;
                        }
                        else return 0;
                    }
                ))
            }),

            /**
             * moves variables up or down
             * @param isUp: if true move up, if false move down
             * @param toExtreme: if true move to top/bottom, if false move only by one row
             * @param indices: move these indices
             */
            move: action((isUp, toExtreme, indices) => {
                if (toExtreme) {
                    this.moveToExtreme(isUp, indices);
                }
                else {
                    this.moveByOneRow(isUp, indices);
                }
            }),

            /**
             * move a group of variables at indices to the top or the bottom
             * @param isUp
             * @param indices
             */
            moveToExtreme: action((isUp, indices) => {
                let currentVariables = this.currentVariables.slice();
                let selectedVariables = currentVariables.filter((d, i) => indices.includes(i));
                let notSelectedVariables = currentVariables.filter((d, i) => !indices.includes(i));
                if (isUp) {
                    currentVariables = [...selectedVariables, ...notSelectedVariables]
                }
                else {
                    currentVariables = [...notSelectedVariables, ...selectedVariables];
                }
                this.currentVariables.replace(currentVariables);
            }),

            /**
             * move variable(s) up or down by one row
             * @param isUp
             * @param indices
             */
            moveByOneRow: action((isUp, indices) => {
                let currentVariables = this.currentVariables.slice();
                let extreme, getNextIndex;
                if (isUp) {
                    extreme = 0;
                    getNextIndex = function (index) {
                        return index - 1;
                    }
                }
                else {
                    extreme = currentVariables.length - 1;
                    indices.reverse();
                    getNextIndex = function (index) {
                        return index + 1;
                    }
                }
                indices.forEach(d => {
                    if ((d !== extreme)) {
                        if (!(indices.includes(extreme) && VariableManagerStore.isBlock(indices))) {
                            let save = currentVariables[getNextIndex(d)];
                            currentVariables[getNextIndex(d)] = currentVariables[d];
                            currentVariables[d] = save;
                        }
                    }
                });
                this.currentVariables.replace(currentVariables);
            })
        });
        /**
         * removes a variable from current variables
         * @param variableId
         */

        observe(this.currentVariables, () => {
            this.updateReferences();
        });
    }


    saveVariable(variableId) {
        if (!this.savedReferences.includes(variableId)) {
            this.savedReferences.push(variableId);
        }
    }

    removeSavedVariable(variableId) {
        if (this.savedReferences.includes(variableId)) {
            this.savedReferences.splice(this.savedReferences.indexOf(variableId), 1);
        }
    }

    updateSavedVariables(variableId, save) {
        if (save) {
            this.saveVariable(variableId);
        }
        else {
            this.removeSavedVariable(variableId);
        }
    }

    /**
     * Increment the referenced property of all the variables which are used by the current variable (and their "child variables")
     * @param currentId
     */
    setReferences(currentId) {
        const _self = this;
        if (!(this.referencedVariables[currentId].originalIds.length === 1 && this.referencedVariables[currentId].originalIds[0] === currentId)) {
            this.referencedVariables[currentId].originalIds.forEach(function (d) {
                _self.setReferences(d);
            });
        }
        this.referencedVariables[currentId].referenced += 1;
    }

    updateReferences() {
        for (let variable in this.referencedVariables) {
            this.referencedVariables[variable].referenced = 0;
        }
        this.currentVariables.forEach(d => this.setReferences(d.id));
        this.savedReferences.forEach(d => this.setReferences(d));
        for (let variable in this.referencedVariables) {
            if (this.referencedVariables[variable].referenced === 0) {
                delete this.referencedVariables[variable]
            }
        }
    }


    addVariableToBeReferenced(variable) {
        if (!(variable.id in this.referencedVariables)) {
            this.referencedVariables[variable.id] = variable;
        }
    }


    /**
     * checks if the selected indices are a block (no not selected variable in between)
     * @param array
     * @returns {boolean}
     */
    static isBlock(array) {
        let sorted = array.sort((a, b) => a - b);
        let isBlock = true;
        let current = sorted[0];
        for (let i = 1; i < sorted.length; i++) {
            if (sorted[i] !== current + 1) {
                isBlock = false;
                break;
            }
        }
        return isBlock
    }


    /**
     * gets a variable by id
     * @param id
     */
    getById(id) {
        return this.referencedVariables[id];
    }

    getSelectedVariables() {
        return this.currentVariables.filter(d => d.isSelected).map(d => this.referencedVariables[d.id]);
    }

    getSelectedIndices() {
        return this.currentVariables.map((d, i) => {
            return {isSelected: d.isSelected, index: i}
        }).filter(d => d.isSelected).map(d => d.index);
    }


    /**
     * checks is a variable is derived from a variable with a certain type
     * @param id
     * @param variableType
     * @returns {boolean}
     */
    recursiveSearch(id, variableType) {
        if (this.referencedVariables[id].type === variableType) {
            return true;
        }
        else if (this.referencedVariables[id].type === "derived") {
            return this.referencedVariables[id].originalIds.map(d => this.recursiveSearch(d, variableType)).includes(true);
        }
        else {
            return false;
        }
    }
}

export default VariableManagerStore;