import React from 'react';
import ReactDOM from 'react-dom';
import { Provider } from 'mobx-react';
import App from './App';
import RootStore from '../../RootStore';
import UndoRedoStore from '../../UndoRedoStore';
import UIStore from '../../UIStore';

it('renders without crashing', () => {
    const uiStore = new UIStore();
    const rootStore = new RootStore(uiStore);
    const undoRedoStore = new UndoRedoStore(rootStore, uiStore);
    const div = document.createElement('div');
    ReactDOM.render(
        <Provider
            rootStore={rootStore}
            uiStore={uiStore}
            undoRedoStore={undoRedoStore}
        >
            <App
                parsed="false"
                firstload="false"
            />
        </Provider>, div,
    );
    ReactDOM.unmountComponentAtNode(div);
});
