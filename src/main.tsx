import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';

// Prevent noisy benign media errors from interrupting the preview
window.addEventListener('unhandledrejection', (event) => {
  if (
    event.reason && 
    (event.reason.name === 'NotAllowedError' || 
     String(event.reason.message).includes('The play() request was interrupted') ||
     String(event.reason.message).includes('was removed from the document'))
  ) {
    event.preventDefault();
  }
});

window.addEventListener('error', (event) => {
  if (typeof event.message === 'string' && (event.message.includes('The play() request was interrupted') || event.message.includes('was removed from the document'))) {
    event.preventDefault();
  }
}, true);

const originalConsoleError = console.error;
console.error = (...args) => {
  const msg = args.join(' ');
  if (msg.includes('The play() request was interrupted') || msg.includes('was removed from the document')) {
    return;
  }
  originalConsoleError(...args);
};

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
