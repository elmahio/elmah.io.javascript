import React, { Component } from 'react';
import { Route } from 'react-router';
import { Layout } from './components/Layout';
import { Home } from './components/Home';
import { FetchData } from './components/FetchData';
import { Counter } from './components/Counter';
import Elmahio from '../node_modules/elmah.io.javascript/dist/elmahio';

export default class App extends Component {
    displayName = App.name

    constructor() {
        super();
        var log = new Elmahio({
            apiKey: 'API_KEY',
            logId: 'LOG_ID'
        });
        log.information("Initialized");
    }

    render() {
        return (
            <Layout>
                <Route exact path='/' component={Home} />
                <Route path='/counter' component={Counter} />
                <Route path='/fetchdata' component={FetchData} />
            </Layout>
        );
    }
}
