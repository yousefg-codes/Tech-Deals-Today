import * as functions from "firebase-functions";
import * as admin from "firebase-admin";
import * as cheerio from "cheerio";
import { RequestInfo, RequestInit } from "node-fetch";

const fetch = (url: RequestInfo, init?: RequestInit) =>
  import("node-fetch").then(({ default: fetch }) => fetch(url, init));

admin.initializeApp();
const db = admin.firestore();
//const productsColl = db.collection("Products");
const compare = (searchText: string, itemName: string) => {
  if (searchText.length < 2 || itemName.length < 2) {
    if (itemName.includes(searchText)) {
      return 1;
    }
    return 0;
  }
  let searchTextEveryTwo = new Map();
  for (let i = 0; i < searchText.length - 1; i++) {
    let everyTwo = searchText.substring(i, 2);
    let count = searchTextEveryTwo.has(everyTwo)
      ? searchTextEveryTwo.get(everyTwo) + 1
      : 1;
    searchTextEveryTwo.set(everyTwo, count);
  }
  let matches = 0;
  for (let i = 0; i < itemName.length - 1; i++) {
    let everyTwo = itemName.substring(i, 2);
    let count = searchTextEveryTwo.has(everyTwo)
      ? searchTextEveryTwo.get(everyTwo)
      : 0;
    if (count > 0) {
      searchTextEveryTwo.set(everyTwo, count - 1);
      matches += 2;
    }
  }
  //console.error(matches);
  return matches / (searchText.length + itemName.length - 2);
};
const extractNumbers = (str: string) => {
  let numbers: string = "";
  for (let j = 0; j < str.length; j++) {
    if (!isNaN(parseInt(str.substring(j, j + 1)))) {
      numbers += str.substring(j, j + 1);
    }
  }
  return numbers;
};
const compareProductTitles = (searchText: string, itemName: string) => {
  if (searchText.length < 2 || itemName.length < 2) {
    if (itemName.includes(searchText)) {
      return 1;
    }
    return 0;
  }
  let searchTextEveryTwo = new Map();
  let allWords = searchText.split(" ");
  allWords.forEach((word) => {
    searchTextEveryTwo.set(word, 1);
  });
  let matches = 0;
  let matchingItemWords = itemName.split(" ");
  for (let i = 0; i < matchingItemWords.length; i++) {
    let everyWord = matchingItemWords[i];
    let count = searchTextEveryTwo.has(everyWord)
      ? searchTextEveryTwo.get(everyWord)
      : 0;
    if (count > 0) {
      searchTextEveryTwo.set(everyWord, count);
      matches += 2;
    }
  }
  const searchTermNumbers = extractNumbers(searchText);
  const itemNameNumbers = extractNumbers(itemName);
  const numbersMatchVal = compare(searchTermNumbers, itemNameNumbers);
  //console.error(matches);
  if (numbersMatchVal < 0.75) {
    return 0;
  }
  return matches / (searchText.length + itemName.length - 2) + numbersMatchVal;
};
const filter = (txt: string, originalArray: any[]) => {
  let allItems: any[] = [];
  let comparisonValArr = [];
  originalArray.forEach((element) => {
    let comparisonVal = compare(txt.toLowerCase(), element.name.toLowerCase());
    if (comparisonVal > 0) {
      comparisonValArr.push(comparisonVal);
      allItems.push({ ...element, coefficient: comparisonVal });
    }
  });
  //console.error(allItems);
  return allItems.sort((a, b) => b.coefficient - a.coefficient);
};
const searchAlg = (txt: string, originalArray: any[]) => {
  if (txt.trim() === "") {
    console.error("HOLD UP.... WAIT A MINUTE");
    return originalArray;
  }
  let filteredItems = filter(txt.trim(), originalArray);
  return filteredItems;
};
exports.runScraper = functions
  .runWith({ timeoutSeconds: 540, memory: "2GB" })
  .pubsub.schedule("every 5 minutes")
  .onRun(async (context) => {
    await scraperMain().catch((e) => {
      fetch(
        "https://hooks.slack.com/services/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",
        { method: "POST", body: JSON.stringify({ text: e }) }
      );
    });
    return null;
  });
exports.scraperTester = functions
  .runWith({ timeoutSeconds: 540, memory: "2GB" })
  .https.onCall(async (data, context) => {
    scraperMain();
    return null;
  });
const filterBadDeals = (products: any[]) => {
  return products.filter((product) => {
    return (
      product[product?.bestEnum]?.allListings[
        product[product?.bestEnum]?.bestIndex
      ]?.price < product?.avgPrice
    );
  });
};
exports.putProducts = functions
  .runWith({ timeoutSeconds: 540, memory: "2GB" })
  .https.onCall(async (data, context) => {
    const batch = db.batch();
    let products: any[] = data.products;
    const UpdaterData: any = (
      await db.collection("Products").doc("Updater").get()
    ).data();
    products.forEach((product) => {
      const docRef = db.collection("Products").doc();
      UpdaterData?.allProducts.push({ id: docRef.id, name: product.name });
      batch.set(docRef, product);
    });
    // UpdaterData.nextProducts = UpdaterData.allProducts
    //   .slice(0, 2)
    //   .map(({ id }: { id: string }) => id);
    //console.error(UpdaterData);
    db.collection("Products")
      .doc("Updater")
      .update({ ...UpdaterData });
    batch.commit();
  });
exports.putDailyProducts = functions
  .runWith({ timeoutSeconds: 540, memory: "2GB" })
  .https.onCall((data, context) => {
    const batch = db.batch();
    let products: any[] = data.products;
    products.forEach((product) => {
      const docRef = db.collection("DailyProductData").doc(product.id);
      batch.set(docRef, product);
    });
    batch.commit();
  });
exports.searchForProduct = functions
  .runWith({ timeoutSeconds: 540, memory: "2GB" })
  .https.onCall(async (data, context) => {
    const productsBasic = (
      await db.collection("Products").doc("Updater").get()
    ).data()?.allProducts;
    //console.error(data.searchText === "");
    const filteredProducts = searchAlg(data.searchText, productsBasic);
    console.error(filteredProducts);
    const products = await db.getAll(
      ...filteredProducts
        .slice(0, filteredProducts.length < 21 ? filteredProducts.length : 20)
        .map(({ id }) => db.collection("DailyProductData").doc(id))
    );
    return {
      products: filterBadDeals(
        products.map((doc, index) => ({
          ...doc.data(),
          coefficient: filteredProducts[index].coefficient,
        }))
      ),
    };
  });
exports.getDailyProducts = functions
  .runWith({ timeoutSeconds: 540, memory: "2GB" })
  .https.onCall(async (data, context) => {
    const limit: number = data.limit;
    let productsParsed: any[] = [];
    try {
      const products = await db
        .collection("DailyProductData")
        .limit(limit)
        .get();
      if (products.empty) {
        console.error("AYO? WHERE ARE TODAY'S PRODUCTS!!??");
      }
      productsParsed = products.docs.map((doc) => doc.data());
    } catch (e) {
      console.error(e);
    }
    return {
      products: filterBadDeals(productsParsed),
    };
  });
exports.getAllProducts = functions
  .runWith({ timeoutSeconds: 540, memory: "2GB" })
  .https.onCall(async (data, context) => {
    const products = db.collection("Products");
    return {
      products: (await products.get()).docs.map((doc) => ({
        ...doc.data(),
        id: doc.id,
      })),
    };
  });
const siteEnums = {
  AMAZON: "amazon",
  BEST_BUY: "bestbuy",
  EBAY: "ebay",
  WALMART: "walmart",
  TARGET: "target",
};
const containsBannedWord = (title: string, words: string[]) => {
  for (let i = 0; i < words.length; i++) {
    if (title.includes(words[i])) {
      return true;
    }
  }
  return false;
};
const sliceWithWrapping = (arr: any[], start: number, numElements: number) => {
  let copy = [];
  for (let i = start; i < start + numElements; i++) {
    copy.push(arr[i % arr.length]);
  }
  return copy;
};
const scrapeSite = async (
  allProducts: FirebaseFirestore.DocumentData,
  baseUrl: string,
  firstHalfSiteUrl: string,
  secondHalfSiteUrl: string,
  productIdentifiers: any[],
  titleIdentifiers: string[],
  priceIdentifier: string,
  urlIdentifier: string,
  imageUrlIdentifier: string,
  siteEnum: string
) => {
  const htmlFound: any = { siteEnum };
  for (let i = 0; i < allProducts.length; i++) {
    const id = allProducts[i].id;
    // allProducts.forEach(({ doc }: { doc: { data: Function } }) => {
    const { name, bannedWords } = allProducts[i];
    htmlFound[id] = { avgPrice: -1, bestIndex: -1, allListings: [] };
    try {
      await fetch(
        firstHalfSiteUrl +
          encodeURIComponent(name).replace(/%20/g, "+") +
          secondHalfSiteUrl
      )
        .then(async (response) => {
          let html = await response.text();
          if (response.status === 200) {
            const $ = cheerio.load(html);
            productIdentifiers.forEach((productIdentifier) => {
              $(productIdentifier)
                .toArray()
                .splice(0, 6)
                .forEach((item, i) => {
                  let title = "";
                  let j = 0;
                  while (!title) {
                    title = $(item).find(titleIdentifiers[j]).text();
                    j++;
                  }
                  if (
                    siteEnum === siteEnums.EBAY &&
                    title.includes("NEW LISTING")
                  ) {
                    title = title.substring(11);
                  }
                  let lowerCaseTitle = title.toLowerCase();
                  if (
                    !containsBannedWord(lowerCaseTitle, bannedWords) &&
                    (lowerCaseTitle.includes(name) ||
                      compareProductTitles(name, lowerCaseTitle) > 1)
                  ) {
                    let price: string | undefined = $(item)
                      .find(priceIdentifier)
                      .text();
                    if (
                      siteEnum === siteEnums.WALMART &&
                      price.includes("From")
                    ) {
                      price = price.substring(6);
                    }
                    if (siteEnum === siteEnums.TARGET && price.includes("-")) {
                      price = "";
                    }
                    if (price?.includes("$")) {
                      price = price.substring(1);
                    }
                    if (price.includes(",")) {
                      price =
                        price.substring(0, price.indexOf(",")) +
                        price.substring(price.indexOf(",") + 1);
                    }
                    if (isNaN(parseFloat(price))) {
                      console.log(price);
                      price = undefined;
                    }
                    if (price && title) {
                      let url = $(item).find(urlIdentifier).attr().href;
                      let imageUrl = $(item)
                        .find(imageUrlIdentifier)
                        .attr().src;
                      if (
                        siteEnum === siteEnums.WALMART ||
                        siteEnum === siteEnums.AMAZON
                      ) {
                        url = baseUrl + url;
                        if (siteEnum === siteEnums.AMAZON) {
                          url =
                            url.substring(0, url.lastIndexOf("/") + 1) +
                            "?tag=yoyogogo-20";
                        }
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
            });
            let total = 0;
            let lowest =
              htmlFound[id].allListings.length > 0
                ? htmlFound[id].allListings[0].price
                : 1000000;
            let lowestIndex = htmlFound[id].allListings.length > 0 ? 0 : -1;
            htmlFound[id].allListings.forEach((listing: any, index: number) => {
              total += listing.price;
              if (listing.price < lowest) {
                lowest = listing.price;
                lowestIndex = index;
              }
            });
            htmlFound[id].bestIndex = lowestIndex;
            // console.log(htmlFound[id].allListings[lowestIndex].url);
            // console.log(htmlFound[id].allListings[lowestIndex].imageUrl);
            // console.log("\n");
            htmlFound[id].avgPrice =
              lowestIndex === -1
                ? -1
                : total / htmlFound[id].allListings.length;
          }
        })
        .catch((e) => {
          console.error(e);
        });
    } catch (e) {
      console.error(e);
    }
  }
  //console.error(htmlFound);
  return htmlFound;
};
// const getTargetProducts = async (allProducts: any[]) => {
//   let productsFound: any = { siteEnum: siteEnums.TARGET };
//   for (let i = 0; i < allProducts.length; i++) {
//     const doc = allProducts[i];
//     // allProducts.forEach(({ doc }: { doc: { data: Function } }) => {
//     const { name, bannedWords, id } = doc;
//     const nameArr = name.split(" ");
//     const adjustedName =
//       nameArr.length > 12
//         ? nameArr
//             .reduce((prev: string, curr: string) => {
//               return prev + curr + " ";
//             }, "")
//             .trim()
//         : name;
//     await fetch(
//       "https://api.redcircleapi.com/request?api_key=A73B328B79D842F297703F20A8D0F208&type=search&search_term=" +
//         encodeURIComponent(adjustedName).replace(/%20/g, "+")
//     ).then(async (response) => {
//       if (response.status === 200) {
//         const resJSON: any = await response.json();
//         // console.log(resJSON.search_results.map(({ product }) => product.title));
//         let total = 0;
//         let bestIndex = resJSON?.search_result ? 0 : -1;
//         let lowestPrice = resJSON?.search_result
//           ? resJSON?.search_result[0]?.offers?.primary?.price
//           : undefined;
//         let allListings = [];
//         if (resJSON?.search_result) {
//           console.log("TARGET: " + lowestPrice);
//           allListings = resJSON.search_results.map(
//             (
//               { product, offers }: { product: any; offers: any },
//               index: number
//             ) => {
//               console.log("TARGET: " + offers.primary.price);
//               if (
//                 !containsBannedWord(product.title.toLowerCase(), bannedWords) &&
//                 (product.title.toLowerCase().includes(name) ||
//                   compareProductTitles(name, product.title.toLowerCase()) > 1)
//               ) {
//                 total += offers.primary.price ? offers.primary.price : 0;
//                 if (lowestPrice > offers?.primary?.price) {
//                   bestIndex = index;
//                   lowestPrice = offers.primary.price;
//                 }
//                 return {
//                   title: product.title,
//                   price: offers.primary.price,
//                   url: product.link,
//                   imageUrl: product.main_image,
//                 };
//               }
//               return null;
//             }
//           );
//         }
//         productsFound[id] = {
//           avgPrice: allListings.length > 0 ? total / allListings.length : -1,
//           bestIndex,
//           allListings: allListings.filter((product: any) => product !== null),
//         };
//       }
//     });
//   }
//   return productsFound;
// };
const scraperMain = async () => {
  const batch = db.batch();
  const allProductsArrs: any = (
    await db.collection("Products").doc("Updater").get()
  ).data();
  const allProducts: any[] = (
    await db.getAll(
      ...allProductsArrs?.nextProducts.map((docId: string) =>
        db.collection("Products").doc(docId)
      )
    )
  ).map((doc) => ({ ...doc.data(), id: doc.id }));
  // console.time("loadingSpeed");
  //console.error(allProducts);
  let allSiteData = await Promise.all([
    scrapeSite(
      allProducts,
      "https://www.amazon.com",
      "https://www.amazon.com/s?k=",
      "",
      [
        "div.s-result-item.s-asin.sg-col-0-of-12.sg-col-16-of-20.sg-col.s-widget-spacing-small.sg-col-12-of-16",
        "div.sg-col-4-of-12.s-result-item.s-asin.sg-col-4-of-16.sg-col.s-widget-spacing-small.sg-col-4-of-20",
      ],
      [
        "span.a-size-medium.a-color-base.a-text-normal",
        "span.a-size-base-plus.a-color-base.a-text-normal",
      ],
      "span.a-offscreen",
      "a.a-link-normal.s-no-outline",
      "img.s-image",
      siteEnums.AMAZON
    ),
    // scrapeSite(
    //   allProducts,
    //   "https://www.bestbuy.com",
    //   "https://www.bestbuy.com/site/searchpage.jsp?st=",
    //   "",
    //   ["li.sku-item"],
    //   [
    //     "div > div > div.right-column > div.information > div:nth-child(2) > div.sku-title > h4 > a",
    //   ],
    //   "div > div > div.right-column > div.price-block > div.sku-list-item-price > div > div > div > div > div > div > div > div:nth-child(1) > div > div:nth-child(1) > div > span:nth-child(1)",
    //   "div > div > div.information > h4 > a",
    //   "div > div > a > img",
    //   siteEnums.BEST_BUY
    // ),
    scrapeSite(
      allProducts,
      "https://www.ebay.com",
      "https://www.ebay.com/sch/i.html?_nkw=",
      "&rt=nc&LH_BIN=1",
      ["li.s-item.s-item__pl-on-bottom.s-item--watch-at-corner"],
      [".s-item__title"],
      "span.s-item__price",
      "a.s-item__link",
      "img.s-item__image-img",
      siteEnums.EBAY
    ),
    scrapeSite(
      allProducts,
      "https://www.walmart.com",
      "https://www.walmart.com/search?q=",
      "",
      [
        "div.mb1.ph1.pa0-xl.bb.b--near-white.w-25",
        "div.mb1.ph1.pa0-xl.bb.b--near-white.w-25",
      ],
      ["span.f6.f5-l.normal.dark-gray.mb0.mt1.lh-title"],
      "div > div > div > div:nth-child(2) > div.flex.flex-wrap.justify-start.items-center.lh-title.mb2.mb1-m > div",
      "a.absolute.w-100.h-100.z-1",
      "img.absolute.top-0.left-0",
      siteEnums.WALMART
    ),
    // getTargetProducts(allProducts),
  ]);
  let overallProductData: any[] = [];
  allProducts.forEach((doc) => {
    const name = doc?.name;
    const id = doc?.id;
    overallProductData.push({
      name,
      id,
      avgPrice: -1,
      bestEnum: "",
    });
    let total = 0;
    let validSites = 0;
    let lowest =
      allSiteData[0][id].bestIndex > -1
        ? allSiteData[0][id].allListings[allSiteData[0][id].bestIndex].price
        : 1000000;
    let lowestEnum =
      allSiteData[0][id].bestIndex > -1
        ? allSiteData[0].siteEnum
        : allSiteData[1].siteEnum;
    allSiteData.forEach((siteData) => {
      overallProductData[overallProductData.length - 1][siteData.siteEnum] =
        siteData[id];
      if (siteData[id].avgPrice > 0) {
        total += siteData[id].avgPrice;
        validSites++;
      }
      if (
        siteData[id].bestIndex > -1 &&
        siteData[id].allListings[siteData[id].bestIndex].price < lowest
      ) {
        lowest = siteData[id].allListings[siteData[id].bestIndex].price;
        lowestEnum = siteData.siteEnum;
      }
    });
    overallProductData[overallProductData.length - 1].avgPrice =
      total / validSites;
    overallProductData[overallProductData.length - 1].bestEnum = lowestEnum;
    if (
      isNaN(
        parseFloat(overallProductData[overallProductData.length - 1].avgPrice)
      )
    ) {
      overallProductData.splice(overallProductData.length - 1, 1);
    } else {
      const docRef = db.collection("DailyProductData").doc(id);
      batch.set(docRef, overallProductData[overallProductData.length - 1]);
    }
  });
  allProductsArrs.nextProducts = sliceWithWrapping(
    allProductsArrs?.allProducts,
    allProductsArrs?.allProducts.findIndex(
      ({ id }: { id: string }) =>
        id ===
        allProductsArrs?.nextProducts[allProductsArrs?.nextProducts.length - 1]
    ),
    2
  ).map(({ id }) => id);
  // fetch(
  //   "https://hooks.slack.com/services/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",
  //   {
  //     method: "POST",
  //     body: JSON.stringify({ text: JSON.stringify(overallProductData) }),
  //   }
  // );
  db.collection("Products")
    .doc("Updater")
    .update({ ...allProductsArrs });
  // const today = new Date();
  // const docRef = db
  //   .collection("DailyProductData")
  //   .doc(
  //     today.getMonth() + 1 + "-" + today.getDate() + "-" + today.getFullYear()
  //   );
  // batch.set(docRef, {
  //   products: overallProductData.map(({ id, name }) => ({
  //     id,
  //     name,
  //   })),
  // });
  //console.error(overallProductData);
  batch.commit();
  // console.timeEnd("loadingSpeed");
  // console.log(overallProductData);
};
