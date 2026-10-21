// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyCYWeI3_iJOsyQQK6MKKfFmq_J7DiVRJVw",
  authDomain: "ifan-f8f19.firebaseapp.com",
  databaseURL: "https://ifan-f8f19-default-rtdb.firebaseio.com",
  projectId: "ifan-f8f19",
  storageBucket: "ifan-f8f19.firebasestorage.app",
  messagingSenderId: "298503400012",
  appId: "1:298503400012:web:fb887ebec5fb62fb6622e9",
  measurementId: "G-K6L32CX584"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);
