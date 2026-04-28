import React from 'react';
import { createPortal } from 'react-dom';
import { createRoot } from 'react-dom/client';
import DOMPurify from 'dompurify';
import { jsPDF } from 'jspdf';
import L from 'leaflet';
import QRCodeGenerator from 'qrcode';
import App from './App.jsx';
import { supabase } from './supabaseClient.js';
import './authBridge.js';
import './db.js';
import 'leaflet/dist/leaflet.css';
import './styles.css';
import './styles/main.css';

window.React = React;
window.ReactDOM = { createRoot, createPortal };
window.DOMPurify = DOMPurify;
window.jspdf = { jsPDF };
window.L = L;
window.QRCode = function QRCodeCompat(container, options = {}) {
  const target = container;
  const text = options.text || '';
  const width = options.width || 200;
  const height = options.height || width;

  if (!target || !text) {
    return;
  }

  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;

  target.innerHTML = '';

  QRCodeGenerator.toCanvas(canvas, text, {
    width,
    margin: 1,
    errorCorrectionLevel: 'H',
    color: {
      dark: options.colorDark || '#000000',
      light: options.colorLight || '#ffffff',
    },
  }).then(() => {
    target.innerHTML = '';
    target.appendChild(canvas);
  }).catch((error) => {
    console.error('[QuizUp] QR code render failed:', error);
    target.textContent = text;
  });
};
window.QRCode.CorrectLevel = { H: 'H' };
window.__supabaseReady = true;
window.__quizupAuthReady = false;
window.__quizupCurrentAuthUser = null;
window.__quizupAuthReadyPromise = window.initSupabaseAuthBridge();
window.__quizupReadyPromise = Promise.resolve(null);
window.__manualLogoutInProgress = false;

if ('scrollRestoration' in history) {
  history.scrollRestoration = 'manual';
}

const legacyScripts = [
  '/legacy/config/pdf-fonts.js',
  '/legacy/utils/helpers.js',
  '/legacy/utils/hooks.js',
  '/legacy/utils/location.js',
  '/legacy/utils/icons.js',
  '/legacy/components/ErrorBoundary.js',
  '/legacy/components/DemoBadge.js',
  '/legacy/components/sidebar.js',
  '/legacy/components/ScrollToTop.js',
  '/legacy/components/landing.js',
  '/legacy/components/login.js',
  '/legacy/components/usermanagement.js',
  '/legacy/components/suggestquestion.js',
  '/legacy/components/suggestedquestions.js',
  '/legacy/components/mytests.js',
  '/legacy/components/questions.js',
  '/legacy/components/manager.js',
  '/legacy/components/quiz.js',
  '/legacy/components/dashboard.js',
  '/legacy/components/tests.js',
  '/legacy/components/result.js',
  '/legacy/components/branding.js',
  '/legacy/components/locationmap.js',
  '/legacy/components/CompanyManagement.js',
  '/legacy/components/questionlist.js',
  '/legacy/components/adminform.js',
  '/legacy/components/admin.js'
];

const loadScript = (src) => new Promise((resolve, reject) => {
  const script = document.createElement('script');
  script.src = src;
  script.async = false;
  script.onload = resolve;
  script.onerror = () => reject(new Error(`Legacy script yüklenemedi: ${src}`));
  document.head.appendChild(script);
});

const bootstrap = async () => {
  for (const src of legacyScripts) {
    await loadScript(src);
  }

  window.supabase = supabase;

  const RootErrorBoundary = window.ErrorBoundary || React.Fragment;

  createRoot(document.getElementById('root')).render(
    <RootErrorBoundary>
      <App />
    </RootErrorBoundary>
  );
};

bootstrap().catch((error) => {
  console.error('[QuizUp] Uygulama başlatılamadı:', error);
});
