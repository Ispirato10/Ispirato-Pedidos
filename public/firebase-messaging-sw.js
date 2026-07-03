importScripts('https://www.gstatic.com/firebasejs/9.22.2/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/9.22.2/firebase-messaging-compat.js');

firebase.initializeApp({
  apiKey: "AIzaSyDa32mFDETqjJtz_p7ZWqUoXVi_qB-gJbk",
  authDomain: "ispirato-pedidos-pwa.firebaseapp.com",
  projectId: "ispirato-pedidos-pwa",
  storageBucket: "ispirato-pedidos-pwa.firebasestorage.app",
  messagingSenderId: "930231895100",
  appId: "1:930231895100:web:94cdb2e77fa0ce2089af39",
  measurementId: "G-STWTD2MFN2"
});

const messaging = firebase.messaging();
