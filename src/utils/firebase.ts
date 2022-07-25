// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
import {
  connectFunctionsEmulator,
  getFunctions,
  httpsCallable,
} from "firebase/functions";

// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries
// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: process.env.REACT_APP_FIREBASE_API_KEY,
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
//connectFunctionsEmulator(functions, "localhost", 5001);

export const getDailyProducts = async () => {
  const getDailyProducts = httpsCallable(functions, "getDailyProducts");
  let returnedData = (await getDailyProducts({ limit: 30 })).data as any;
  return (await returnedData).products;
};
export const loadMoreProducts = async (currentlyLoaded: number) => {
  const getDailyProducts = httpsCallable(functions, "getDailyProducts");
  let returnedData = (await getDailyProducts({ limit: currentlyLoaded + 50 }))
    .data as any;
  console.log((await returnedData).products.length + " " + currentlyLoaded);
  return (await returnedData).products.slice(currentlyLoaded);
};
export const getSearchedProducts = async (searchText: string) => {
  const getSearchedProduct = httpsCallable(functions, "searchForProduct");
  let returnedData = (await getSearchedProduct({ searchText: searchText }))
    .data as any;
  return (await returnedData).products;
};
export const testScraper = async () => {
  await httpsCallable(functions, "scraperTester").call(functions);
};
