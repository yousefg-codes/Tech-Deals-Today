// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
import {
  connectFunctionsEmulator,
  getFunctions,
  httpsCallable,
} from "firebase/functions";
const cheerio = require("cheerio");
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries
// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyC6tgUgz0zYzUTavFwucaIlJQnwIpTKUxY",
  authDomain: "tech-deals-8a355.firebaseapp.com",
  projectId: "tech-deals-8a355",
  storageBucket: "tech-deals-8a355.appspot.com",
  messagingSenderId: "219228634798",
  appId: "1:219228634798:web:ff33769f195894ac05373f",
  measurementId: "G-X2FEL66BC6",
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);
const functions = getFunctions();
// connectFunctionsEmulator(functions, "localhost", 5001);

export const getProducts = async () => {
  return (await httpsCallable(functions, "getProducts").call(functions)).data
    .products;
};
export const testScraper = async () => {
  await httpsCallable(functions, "scraperTester").call(functions);
};
