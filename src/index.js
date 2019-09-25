/* eslint-disable import/extensions,react/jsx-filename-extension */
/**
 * Created by theresa on 30.01.18.
 */
import React from 'react';
import ReactDOM from 'react-dom';
import { Provider } from 'mobx-react';

import App from './modules/TemporalHeatmap/components/App.jsx';
import RootStore from './modules/RootStore';
import UIStore from './modules/UIStore';
import UndoRedoStore from './modules/UndoRedoStore';
import StudyAPI from './studyAPI';

const uiStore = new UIStore();
const studyAPI = new StudyAPI(uiStore);
const rootStore = new RootStore(uiStore, studyAPI);
const undoRedoStore = new UndoRedoStore(rootStore, uiStore);
studyAPI.loadDefaultStudies();
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
    </Provider>, document.getElementById('app'),
);
