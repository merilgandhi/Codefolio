import React from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.jsx';
import './styles.css';

// React 19/Helmet owns metadata after boot; remove the initial server copies once.
document.head.querySelectorAll('[data-codefolio-seo]').forEach((element) => element.remove());

createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
