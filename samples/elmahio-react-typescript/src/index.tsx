import React from 'react';
import ReactDOM from 'react-dom';
import './index.css';
import App from './App';
import reportWebVitals from './reportWebVitals';
import Elmahio from 'elmah.io.javascript';

new Elmahio({
  apiKey: 'API_KEY',
  logId: 'LOG_ID',
  breadcrumbs: true, // Required for now because of a bug in the recent version of the TypeScript mappings. Will be optional in time.
  // Optional options
  
  // Set an application name on all messages:
  //application: 'My application',
  
  // Log any messages logged to the console (in this example console.warn and console.error):
  //captureConsoleMinimumLevel: 'warn',
  
  // Enable debug messages (good thing to add localhost but not on production):
  //debug: true,
  
  // Ignore specific log messages from being logged:
  //filter: msg => {
  //  return msg.statusCode === 400;
  //}
})

// Optionally implement the on message handler to decorate all messages with additional properties
//.on('message', msg => {
//  msg.version = '1.0.0';
//})

// Optionally implement the on error handler to log any errors communicating with the elmah.io API
//.on('error', (status, statusText) => {
//  console.log(status, statusText);
//})
;

ReactDOM.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
  document.getElementById('root')
);

// If you want to start measuring performance in your app, pass a function
// to log results (for example: reportWebVitals(console.log))
// or send to an analytics endpoint. Learn more: https://bit.ly/CRA-vitals
reportWebVitals();
