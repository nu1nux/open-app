/**
 * @fileoverview Entry point for the React renderer application.
 * Mounts the root App component to the DOM.
 * @module renderer/main
 */

import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './styles.css';

/**
 * Initializes and renders the React application into the root DOM element.
 */
ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
