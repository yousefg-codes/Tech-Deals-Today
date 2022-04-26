import * as functions from "firebase-functions";
import * as admin from "firebase-admin";
import * as cheerio from "cheerio";
import { RequestInfo, RequestInit } from "node-fetch";

const fetch = (url: RequestInfo, init?: RequestInit) =>
  import("node-fetch").then(({ default: fetch }) => fetch(url, init));

admin.initializeApp();
const db = admin.firestore();
const batch = db.batch();
const productsColl = db.collection("Products");
exports.runScraper = functions.pubsub
  .schedule("every 60 minutes")
  .onRun(async (context) => {
    await scraperMain();
    return null;
  });
exports.scraperTester = functions.https.onCall(async (data, context) => {
  return await scraperMain();
});
exports.getProducts = functions.https.onCall(async (data, context) => {
  const today = new Date();
  const products = db
    .collection("DailyProductData")
    .doc(
      today.getMonth() + 1 + "-" + today.getDate() + "-" + today.getFullYear()
    )
    .collection("Products");
  return { products: (await products.get()).docs.map((doc) => doc.data()) };
});
const siteEnums = {
  AMAZON: "amazon",
  BEST_BUY: "bestbuy",
  EBAY: "ebay",
  WALMART: "walmart",
  TARGET: "target",
};
const compare = (searchText: string, itemName: string) => {
  if (searchText.length < 2 || itemName.length < 2) {
    if (itemName.includes(searchText)) {
      return 1;
    }
    return 0;
  }
  let searchTextEveryTwo = new Map();
  for (let i = 0; i < searchText.length - 1; i++) {
    let everyTwo = searchText.substr(i, 2);
    let count = searchTextEveryTwo.has(everyTwo)
      ? searchTextEveryTwo.get(everyTwo) + 1
      : 1;
    searchTextEveryTwo.set(everyTwo, count);
  }
  let matches = 0;
  for (let i = 0; i < itemName.length - 1; i++) {
    let everyTwo = itemName.substr(i, 2);
    let count = searchTextEveryTwo.has(everyTwo)
      ? searchTextEveryTwo.get(everyTwo)
      : 0;
    if (count > 0) {
      searchTextEveryTwo.set(everyTwo, count - 1);
      matches += 2;
    }
  }
  return matches / (searchText.length + itemName.length - 2);
};
const containsBannedWord = (title: string, words: string[]) => {
  for (let i = 0; i < words.length; i++) {
    if (title.includes(words[i])) {
      return true;
    }
  }
  return false;
};
const scrapeSite = async (
  allProducts: FirebaseFirestore.QuerySnapshot<FirebaseFirestore.DocumentData>,
  baseUrl: string,
  firstHalfSiteUrl: string,
  secondHalfSiteUrl: string,
  productIdentifier: any,
  titleIdentifier: string,
  priceIdentifier: string,
  urlIdentifier: string,
  imageUrlIdentifier: string,
  siteEnum: string
) => {
  const htmlFound: any = { siteEnum };
  for (let i = 0; i < allProducts.docs.length; i++) {
    const id = allProducts.docs[i].id;
    // allProducts.forEach(({ doc }: { doc: { data: Function } }) => {
    const { name, bannedWords } = allProducts.docs[i].data();
    const nameWords = name.split(" ");
    htmlFound[id] = { avgPrice: -1, bestIndex: -1, allListings: [] };
    await fetch(
      firstHalfSiteUrl +
        nameWords.reduce((prev: string, curr: string) => {
          return prev === "" ? curr : prev + "+" + curr;
        }, "") +
        secondHalfSiteUrl
    ).then(async (response) => {
      let html = await response.text();
      if (response.status === 200) {
        const $ = cheerio.load(html);
        $(productIdentifier).each((i: number, item: string) => {
          let title = $(item).find(titleIdentifier).text();
          if (siteEnum === siteEnums.EBAY && title.includes("NEW LISTING")) {
            title = title.substring(11);
          }
          let lowerCaseTitle = title.toLowerCase();
          if (
            !containsBannedWord(lowerCaseTitle, bannedWords) &&
            (lowerCaseTitle.includes(name) ||
              compare(name, lowerCaseTitle) > 0.4)
          ) {
            let price = $(item).find(priceIdentifier).text();
            if (siteEnum === siteEnums.WALMART && price.includes("From")) {
              price = price.substring(6);
            }
            if (siteEnum === siteEnums.TARGET && price.includes("-")) {
              price = "";
            }
            try {
              parseFloat(price);
            } catch (e) {
              price = "";
            }
            if (price && title) {
              let url = $(item).find(urlIdentifier).attr().href;
              let imageUrl = $(item).find(imageUrlIdentifier).attr().src;
              if (
                siteEnum === siteEnums.WALMART ||
                siteEnum === siteEnums.AMAZON
              ) {
                url = baseUrl + url;
                if (siteEnum === siteEnums.AMAZON) {
                  url = url + "&tag=yoyogogo-20";
                }
              }
              if (price.includes("$")) {
                price = price.substring(1);
              }
              htmlFound[id].allListings.push({
                title: title,
                price: parseFloat(price),
                url,
                imageUrl,
              });
            }
          }
        });
        let total = 0;
        let lowest = htmlFound[id].allListings[0].price;
        let lowestIndex = 0;
        htmlFound[id].allListings.forEach((listing: any, index: number) => {
          total += listing.price;
          if (listing.price < lowest) {
            lowest = listing.price;
            lowestIndex = index;
          }
        });
        htmlFound[id].bestIndex = lowestIndex;
        htmlFound[id].avgPrice = total / htmlFound[id].allListings.length;
      }
    });
  }
  //console.error(htmlFound);
  return htmlFound;
};

const scraperMain = async () => {
  const allProducts = await productsColl.get();
  console.time("loadingSpeed");
  let allSiteData = await Promise.all([
    scrapeSite(
      allProducts,
      "https://www.amazon.com",
      "https://www.amazon.com/s?k=",
      "",
      "div.s-result-item.s-asin.sg-col-0-of-12.sg-col-16-of-20.sg-col.s-widget-spacing-small.sg-col-12-of-16",
      "span.a-size-medium.a-color-base.a-text-normal",
      "span.a-offscreen",
      "a.a-link-normal.s-no-outline",
      "img.s-image",
      siteEnums.AMAZON
    ),
    // scrapeSite(
    //   allProducts,
    //   "https://www.bestbuy.com/site/searchpage.jsp?st=",
    //   "",
    //   "li.sku-item",
    //   "div > div > div.right-column > div.information > div:nth-child(2) > div.sku-title > h4 > a",
    //   "div > div > div.right-column > div.price-block > div.sku-list-item-price > div > div > div > div > div > div > div > div:nth-child(1) > div > div:nth-child(1) > div > span:nth-child(1)",
    //   siteEnums.BEST_BUY
    // ),
    scrapeSite(
      allProducts,
      "https://www.ebay.com",
      "https://www.ebay.com/sch/i.html?_nkw=",
      "&rt=nc&LH_BIN=1",
      "li.s-item.s-item__pl-on-bottom.s-item--watch-at-corner",
      ".s-item__title",
      "span.s-item__price",
      "a.s-item__link",
      "img.s-item__image-img",
      siteEnums.EBAY
    ),
    // scrapeSite(
    //   allProducts,
    //   "https://www.walmart.com",
    //   "https://www.walmart.com/search?q=",
    //   "",
    //   "div.mb1.ph1.pa0-xl.bb.b--near-white.w-25",
    //   "span.f6.f5-l.normal.dark-gray.mb0.mt1.lh-title",
    //   "div.b.black.f5.mr1.mr2-xl.lh-copy.f4-l",
    //   "a.absolute.w-100.h-100.z-1",
    //   "img.absolute.top-0.left-0",
    //   siteEnums.WALMART
    // ),
    //   scrapeSite(
    //     "https://www.target.com/s?searchTerm=",
    //     "",
    //     "div.styles__StyledCol-sc-ct8kx6-0.ebNJlV",
    //     "a.Link__StyledLink-sc-4b9qcv-0.styles__StyledTitleLink-sc-h3r0um-1.csEnsr.dAyBrL.h-display-block.h-text-bold.h-text-bs",
    //     "div > section > div > div:nth-child(2) > div > div > div:nth-child(2) > div > div > div:nth-child(2) > div:nth-child(1) > div.h-padding-r-tiny > div > span",
    //     siteEnums.TARGET
    //   )
  ]);
  let overallProductData: any[] = [];
  allProducts.docs.forEach((doc) => {
    const { name } = doc.data();
    const id = doc.id;
    overallProductData.push({
      name,
      id,
      avgPrice: -1,
      bestEnum: "",
    });
    let total = 0;
    let lowest =
      allSiteData[0][id].allListings[allSiteData[0][id].bestIndex].price;
    let lowestEnum = allSiteData[0].siteEnum;
    allSiteData.forEach((siteData) => {
      overallProductData[overallProductData.length - 1][siteData.siteEnum] =
        siteData;
      total += siteData[id].avgPrice;
      if (siteData[id].allListings[siteData[id].bestIndex].price < lowest) {
        lowest = siteData[id].allListings[siteData[id].bestIndex].price;
        lowestEnum = siteData.siteEnum;
      }
    });
    overallProductData[overallProductData.length - 1].avgPrice =
      total / allSiteData.length;
    overallProductData[overallProductData.length - 1].bestEnum = lowestEnum;
    const today = new Date();
    const docRef = db
      .collection("DailyProductData")
      .doc(
        today.getMonth() + 1 + "-" + today.getDate() + "-" + today.getFullYear()
      )
      .collection("Products")
      .doc(id);
    batch.set(docRef, overallProductData[overallProductData.length - 1]);
  });
  //console.error(overallProductData);
  batch.commit();
  console.timeEnd("loadingSpeed");
  console.log(overallProductData);
};
