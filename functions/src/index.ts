import * as functions from "firebase-functions";
const {
  initializeApp,
  applicationDefault,
  cert,
} = require("firebase-admin/app");
const { getFirestore } = require("firebase-admin/firestore");
initializeApp();
const request = require("request-promise");
const cheerio = require("cheerio");
const db = getFirestore();
const productsColl = db.collection("products");
exports.runScraper = functions.pubsub
  .schedule("every 720 minutes")
  .onRun(async (context) => {
    await Promise.all([scrapeAmazon()]);
    return null;
  });
const scrapeAmazon = async () => {
  const allProducts = await productsColl.get();
  allProducts.forEach(({ doc }: { doc: { data: Function } }) => {
    const { name } = doc.data();
    const nameWords = name.split(" ");
    request(
      `https://www.amazon.com/s?k=${nameWords.reduce(() => {}, "")}?tag=`,
      (error: string, response: { statusCode: number }, html: string) => {
        if (!error && response.statusCode === 200) {
          const $ = cheerio.load(html);
        }
      }
    );
  });
};
