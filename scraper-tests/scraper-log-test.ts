import fetch from "node-fetch";
import * as cheerio from "cheerio";
import { getProducts, putDailyDoc } from "./firebase";
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
  return matches / (searchText.length + itemName.length - 2);
};
const filter = (txt: string, originalArray: any[]) => {
  let allItems: any[] = [];
  let comparisonValArr = [];
  originalArray.forEach((element) => {
    let comparisonVal = compare(txt.toLowerCase(), element.name.toLowerCase());
    if (comparisonVal > 0.1) {
      comparisonValArr.push(comparisonVal);
      allItems.push({ ...element, coefficient: comparisonVal });
    }
  });
  console.error(allItems);
  return allItems.sort((a, b) => b.coefficient - a.coefficient);
};
const searchAlg = (txt: string, originalArray: any[]) => {
  if (txt.trim() === "") {
    return originalArray;
  }
  let filteredItems = filter(txt.trim(), originalArray);
  return filteredItems;
};
const containsBannedWord = (title, words) => {
  for (let i = 0; i < words.length; i++) {
    if (title.includes(words[i])) {
      return true;
    }
  }
  return false;
};
export const search = async (searchText) => {
  const productsBasic = await getProducts();
  const products = searchAlg(searchText, productsBasic);
  console.log(products);
};
export const scrapeSite = async (
  allProducts,
  baseUrl,
  firstHalfSiteUrl,
  secondHalfSiteUrl,
  productIdentifiers,
  titleIdentifiers,
  priceIdentifier,
  urlIdentifier,
  imageUrlIdentifier,
  siteEnum
) => {
  const htmlFound = { siteEnum };
  for (let i = 0; i < allProducts.length; i++) {
    const doc = allProducts[i];
    // allProducts.forEach(({ doc }: { doc: { data: Function } }) => {
    const { name, bannedWords, id } = doc;
    const nameWords = name.split(" ");
    htmlFound[id] = { avgPrice: -1, bestIndex: -1, allListings: [] };
    await fetch(
      firstHalfSiteUrl +
        encodeURIComponent(name).replace(/%20/g, "+") +
        secondHalfSiteUrl
    ).then(async (response) => {
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
              //console.log(title + " " + siteEnum);
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
                  compare(name, lowerCaseTitle) > 0.4)
              ) {
                let price = $(item).find(priceIdentifier).text();
                if (siteEnum === siteEnums.WALMART && price.includes("From")) {
                  price = price.substring(6);
                }
                if (siteEnum === siteEnums.TARGET && price.includes("-")) {
                  price = "";
                }
                if (price.includes("$")) {
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
        // console.log(
        //   siteEnum === siteEnums.AMAZON && id === "ivone"
        //     ? htmlFound[id].allListings
        //     : ""
        // );
        let total = 0;
        let lowest =
          htmlFound[id].allListings.length > 0
            ? htmlFound[id].allListings[0].price
            : 1000000;
        let lowestIndex = htmlFound[id].allListings.length > 0 ? 0 : -1;
        htmlFound[id].allListings.forEach((listing, index) => {
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
          lowestIndex === -1 ? -1 : total / htmlFound[id].allListings.length;
      }
    });
  }
  //console.log(htmlFound);
  return htmlFound;
};

export const main = async (allProducts?) => {
  if (!allProducts) {
    allProducts = [
      {
        id: "airbods",
        name: "airpods pro",
        bannedWords: ["case", "right", "left"],
      },
      {
        id: "ivone",
        name: "snowball mic",
        bannedWords: ["case"],
      },
    ];
  }
  console.time("loadingSpeed");
  let data = await Promise.all([
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
      ["li.s-item.s-item__pl-on-bottom.s-item--watch-at-corner"],
      [".s-item__title"],
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
  ]);
  let overallProductData = [];
  allProducts.forEach(({ id, name }) => {
    overallProductData.push({
      name,
      id,
      avgPrice: -1,
      bestEnum: "",
    });
    let total = 0;
    let validSites = 0;
    let lowest =
      data[0][id].bestIndex > -1
        ? data[0][id].allListings[data[0][id].bestIndex].price
        : 1000000;
    let lowestEnum =
      data[0][id].bestIndex > -1 ? data[0].siteEnum : data[1].siteEnum;
    data.forEach((siteData) => {
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
    }
  });
  console.timeEnd("loadingSpeed");
  let today = new Date();
  putDailyDoc(
    { products: allProducts },
    today.getMonth() +
      1 +
      "-" +
      (today.getDate() + 1) +
      "-" +
      today.getFullYear()
  );
  //console.log(overallProductData);
  //   scrapeSite(
  //     "https://www.target.com/s?searchTerm=",
  //     "",
  //     "div.styles__StyledCol-sc-ct8kx6-0.ebNJlV",
  //     "a.Link__StyledLink-sc-4b9qcv-0.styles__StyledTitleLink-sc-h3r0um-1.csEnsr.dAyBrL.h-display-block.h-text-bold.h-text-bs",
  //     "div > section > div > div:nth-child(2) > div > div > div:nth-child(2) > div > div > div:nth-child(2) > div:nth-child(1) > div.h-padding-r-tiny > div > span",
  //     siteEnums.TARGET
  //   );
  return overallProductData;
};
//main();
