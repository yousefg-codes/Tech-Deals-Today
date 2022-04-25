// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
import { getFunctions, httpsCallable } from "firebase/functions";
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

export const testScraper = async () => {
  console.log(await scrapeAmazon());
};
const scrapeAmazon = async () => {
  // const allProducts = await productsColl.get();
  const allProducts = [{ doc: { data: () => ({ name: "Airpods Pro" }) } }];
  const htmlFound: string[][] = [];
  for (let i = 0; i < allProducts.length; i++) {
    const doc = allProducts[i].doc;
    // allProducts.forEach(({ doc }: { doc: { data: Function } }) => {
    const { name } = doc.data();
    const nameWords = name.split(" ");
    htmlFound.push([]);
    await fetch(
      `https://www.amazon.com/s?k=${nameWords.reduce(
        (prev: string, curr: string) => {
          return prev === "" ? curr : prev + "+" + curr;
        },
        ""
      )}`,
      { mode: "cors" }
    ).then(async (response) => {
      let html = await response.text();
      console.log(response.status);
      if (response.status === 0) {
        const $ = cheerio.load(html);
        console.log(await response.text());
        $(
          "div.s-result-item.s-asin.sg-col-0-of-12.sg-col-16-of-20.sg-col.s-widget-spacing-small.sg-col-12-of-16"
        ).each((i: number, item: string) => {
          console.log(item);
          htmlFound[htmlFound.length].push($(item).text());
        });
      }
    });
  }
  return htmlFound;
};
