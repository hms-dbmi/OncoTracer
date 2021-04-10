import React from 'react';
import { inject, observer } from 'mobx-react';
import axios from 'axios';
import Select from 'react-select';
import {
    Alert,
    Button,
    Col,
    ControlLabel,
    FormControl,
    FormGroup,
    Grid,
    InputGroup,
    Panel,
    Radio,
    Row,
    Tab,
    Tabs,
} from 'react-bootstrap';
import { extendObservable } from 'mobx';
import StudySummary from '../StudySummary';
import LocalFileSelection from './LocalFileSelection';

const axiosInstance = axios.create({
    baseURL: "http://threadstates.gehlenborglab.org/demo_data/",
    withCredentials: false,
    headers: {
      'Access-Control-Allow-Origin' : '*',
      'Access-Control-Allow-Methods':'GET,PUT,POST,DELETE,PATCH,OPTIONS',
      }
  });


/*
 * Component for view if no study has been loaded
 * used for selection of studies from cBio or own data sets
 */
const DefaultView = inject('rootStore', 'undoRedoStore', 'uiStore')(observer(class DefaultView extends React.Component {
    constructor(props) {
        super(props);
        this.getStudy = this.getStudy.bind(this);
        extendObservable(this, {
            selectedStudy: null,
            selectedTab: 'cBio',
            ownInstanceURL: ''
        });
        this.handleSelectTab = this.handleSelectTab.bind(this);
        this.displayStudy = this.displayStudy.bind(this);
        this.selectInstance = this.selectInstance.bind(this);
        this.handleInstanceChange = this.handleInstanceChange.bind(this);
        this.loadExampleFromServer = this.loadExampleFromServer.bind(this)
        this.loadCOVIDExample = this.loadCOVIDExample.bind(this)
    }

    /**
     * selects a study from cBioPortal
     * @param {Object} selectedOption
     */
    getStudy(selectedOption) {
        this.selectedStudy = selectedOption;
        this.props.rootStore.parseTimeline(this.props.rootStore.studyAPI.studies
            .filter((d) => d.studyId === selectedOption.value)[0], () => {
        });
    }

    /**
     * creates different options for study selection
     * @returns {Object[]}
     */
    setOptions() {
        let options = [];
        this.props.rootStore.studyAPI.studies.forEach((d) => {
            options.push({ value: d.studyId, label: d.name });
        });
        return options
    }

    /**
     * load example studies from the txt files on server
     * @param {Object} selectedOption
     */
    loadExampleFromServer(selectedOption){
        if (selectedOption.value==='synthea COVID'){
            this.loadCOVIDExample()
        }
       
    }

    /**
     * load covid example studies from the txt files on server
     */
    loadCOVIDExample(){
        const {localFileLoader} = this.props.rootStore
        
        // timeline data
        axios.all([
            axiosInstance.get('covid_100_timeline_med.txt'),
            axiosInstance.get('covid_100_timeline_samples.txt'),
        ]).then(res=>{
            const files = res.map(d=>d.data)
            localFileLoader.setEventFiles(files, () => {
                this.props.rootStore.parseTimeline(null, () => {
                });
            });
        }).then(()=>axiosInstance.get('covid_100_samples.txt'))
        .then(res=>{
            localFileLoader.setClinicalFile(res.data, true)
            return axiosInstance.get('covid_100_patients.txt')
        }).then(res=>{
            localFileLoader.setClinicalFile(res.data, false)
        })
         
    }


    /**
     * gets information about study
     * @returns {Component}
     */
    getStudyInfo() {
        let info = null;
        if (this.selectedStudy !== null && this.props.rootStore.timelineParsed
            && (!this.props.rootStore.isOwnData || this.props.rootStore.localFileLoader.eventsParsed === 'finished')) {
            info = (
                <div>
                    <Panel>
                        <Panel.Heading>
                            <Panel.Title>
                                Study information
                            </Panel.Title>
                        </Panel.Heading>
                        <Panel.Body>
                            <StudySummary />
                        </Panel.Body>
                    </Panel>
                </div>
            );
        } else if ((this.selectedStudy !== null && !this.props.rootStore.isOwnData)
            || (this.props.rootStore.isOwnData && this.props.rootStore.localFileLoader.eventsParsed === 'loading')) {
            info = <div className="smallLoader" />;
        } else if (this.props.rootStore.isOwnData && this.props.rootStore.localFileLoader.dataReady){
            info = (
                <div>
                    <Panel>
                        <Panel.Heading>
                            <Panel.Title>
                                Study information
                            </Panel.Title>
                        </Panel.Heading>
                        <Panel.Body>
                            <StudySummary />
                        </Panel.Body>
                    </Panel>
                </div>)
        }
        return info;
    }

    /**
     * handle click on tab
     * @param {string} key
     */
    handleSelectTab(key) {
        this.props.rootStore.setIsOwnData( (key !== 'cBio') );
        if (key === 'cBio') {
            if (this.selectedStudy !== null) {
                this.props.rootStore.parseTimeline(this.props.rootStore.studyAPI.studies
                    .filter((d) => d.studyId === this.selectedStudy.value)[0], () => {
                });
            }
        } else if (this.props.rootStore.localFileLoader.eventsParsed) {
            this.props.rootStore.parseTimeline(null, () => {
            });
        }
        this.selectedTab = key;
    }

    /**
     * initiates data parsing
     */
    displayStudy() {
        this.props.rootStore.parseCBio(() => {
            if (this.props.rootStore.isOwnData) {
                this.props.undoRedoStore.saveLoadHistory('own data');
            } else {
                this.props.undoRedoStore.saveLoadHistory(this.props.rootStore.study.name);
            }
        });
    }

    handleInstanceChange(e) {
        this.selectedStudy = null;
        this.props.uiStore.setCBioInstance(e.target.value);
    }

    /**
     * gets content for default view
     * */
    getDefaultViewContent() {
        let instanceTextfield = null;
        let connected = null;
        let placeHoplderText="Select Study";
        if (this.props.uiStore.cBioInstance === 'own') {
            placeHoplderText= "Connect to a cBioPortal instance to load study list";
            instanceTextfield = (
                <FormGroup>
                    <ControlLabel>

                    Enter URL for cBioPortal (e.g. 'http://www.cbiohack.org')
                    </ControlLabel>
                    
                    <InputGroup>
                        <FormControl componentClass="textarea" rows='1' cols='50' 
                            value={this.ownInstanceURL}
                            onChange={(e) => {
                                this.ownInstanceURL = e.target.value;
                            }}
                            type="url"
                        />
                        
                    </InputGroup>

                      <br></br>      
                    <ControlLabel>
                            
                        Enter access token for password-protected instances of cBioPortal  <a href="https://docs.cbioportal.org/2.2-authorization-and-authentication/authenticating-users-via-tokens#using-data-access-tokens" >(instructions to find token)</a>
                    </ControlLabel>

                    <InputGroup>

                        
                        <FormControl componentClass="textarea" rows='1' cols='50' 
                            
                            onChange={(e) => {
                                console.log("new token:" + e.target.value);
                                this.props.rootStore.studyAPI.accessTokenFromUser=e.target.value;
                            }}
                            
                        />
                        
                    </InputGroup>

                    <br></br>  

                    <Button variant="primary" onClick={this.selectInstance}>
                        Connect
                    </Button>   

                </FormGroup>
            );
        }

        if (this.props.rootStore.studyAPI.connectionStatus[this.props.uiStore.cBioInstance] === 'failed') {
            connected = <Alert bsStyle="warning">Connection failed: {this.props.rootStore.studyAPI.errorMsg}</Alert>;
        } else if (this.props.rootStore.studyAPI.connectionStatus[this.props.uiStore.cBioInstance] === 'success') {
            placeHoplderText="Select Study";
            connected = <Alert>Successfully connected</Alert>;
        }

        return (
            <div style={{ marginTop: '10px', marginBottom: '10px' }}>
                {instanceTextfield}
                {connected}
                <ControlLabel>
                    Select study
                </ControlLabel>
                <Select
                    type="text"
                    searchable
                    isDisabled={this.props.rootStore.studyAPI.connectionStatus[this.props.uiStore.cBioInstance] !== 'success'}
                    componentClass="select"
                    placeholder={placeHoplderText}//"Connect to a cBioPortal instance to load study list"//"Select Study"
                    value={this.selectedStudy}
                    options={this.setOptions()}
                    onChange={this.getStudy}
                />
            </div>
        );
    }

    /**
     * selects own instance and loads studies
     * */
    selectInstance() {
        this.props.rootStore.studyAPI.loadOwnInstanceStudies(this.ownInstanceURL);
    }


    render() {
        // check if data is ready
        let launchDisabled = true;
        if (this.props.rootStore.isOwnData) {
            launchDisabled = !this.props.rootStore.localFileLoader.dataReady;
        } else {
            launchDisabled = !this.props.rootStore.timelineParsed;
        }
        return (
            <Grid>
                <Row>
                    <Col xs={8} xsOffset={2}>
                        <Tabs
                            activeKey={this.selectedTab}
                            id="controlled-tab"
                            animation={false}
                            onSelect={this.handleSelectTab}
                        >
                            <Tab eventKey="cBio" title="Load data from cBioPortal">
                                <form>
                                    <FormGroup>
                                        <Radio
                                            name="linkSelect"
                                            value="hack"
                                            checked={this.props.uiStore.cBioInstance === 'hack'}
                                            onChange={this.handleInstanceChange}
                                            inline
                                        >
                                            cBioPortal for ThreadStates
                                        </Radio>
                                        {' '}
                                        <Radio
                                            name="linkSelect"
                                            value="own"
                                            checked={this.props.uiStore.cBioInstance === 'own'}
                                            onChange={this.handleInstanceChange}
                                            inline
                                        >
                                            Custom cBioPortal
                                        </Radio>
                                        {' '}
                                    </FormGroup>
                                </form>
                                {this.getDefaultViewContent()}
                            </Tab>
                            <Tab eventKey="own" title="Load data from files">
                                <LocalFileSelection />
                            </Tab>
                            {/* host other non-genomic datasets */}
                            <Tab eventKey="examples" title="Other example datasets">
                                <ControlLabel>
                                    Select study
                                </ControlLabel>
                                <Select
                                    type="text"
                                    componentClass="select"
                                    placeholder="Select Study"
                                    options={[{'value': 'synthea COVID', 'label': 'synthea COVID'}]}
                                    onChange={this.loadExampleFromServer}
                                />
                            </Tab>
                        </Tabs>
                        {this.getStudyInfo()}
                        <Button
                            disabled={launchDisabled}
                            onClick={this.displayStudy}
                        >
                            {launchDisabled? 'Data is loading or not selected': 'Launch'}
                        </Button>
                    </Col>
                </Row>
            </Grid>
        );
    }
}));
export default DefaultView;
