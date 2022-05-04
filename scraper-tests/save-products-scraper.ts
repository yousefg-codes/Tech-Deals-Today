import fetch from "node-fetch";
import * as cheerio from "cheerio";
import { upload } from "./firebase";
import { search } from "./scraper-log-test";

const siteEnums = {
  AMAZON: "amazon",
  BEST_BUY: "bestbuy",
  EBAY: "ebay",
  WALMART: "walmart",
  TARGET: "target",
};
const compare = (searchText, itemName) => {
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
// const filter = (txt, originalArray, comparisonArray) => {
//   let allItems = [];
//   let data = comparisonArray;
//   let comparisonValArr = [];
//   var index = 0;
//   for (var i = 0; i < data.length; i++) {
//     let comparisonVal = compare(
//       txt.toLowerCase(),
//       data[i].name.toLowerCase() +
//         (data[i].description ? " " + data[i].description.toLowerCase() : "")
//     );
//     if (comparisonVal > 0) {
//       comparisonValArr.push(comparisonVal);
//       allItems[index] = { ...originalArray[i], coefficient: comparisonVal };
//       index++;
//     }
//   }
//   return allItems.sort((a, b) => b.coefficient - a.coefficient);
// };
// const searchAlg = (txt, originalArray, comparisonArray) => {
//   if (txt.trim() === "") {
//     return originalArray;
//   }
//   let filteredItems = filter(txt.trim(), originalArray, comparisonArray);
//   return filteredItems;
// };
const containsBannedWord = (title: string, words: string[]) => {
  for (let i = 0; i < words.length; i++) {
    if (title.includes(words[i])) {
      return true;
    }
  }
  return false;
};
const doesNotContainProduct = (product: string, allProducts: any[]) => {
  for (let i = 0; i < allProducts.length; i++) {
    const { name } = allProducts[i];
    if (compare(name, product) > 0.5) {
      return false;
    }
  }
  return true;
};

export const scrapeSite = async (
  baseBannedWords: string[],
  nameWords: string[],
  baseUrl: string,
  firstHalfSiteUrl: string,
  secondHalfSiteUrl: string,
  productIdentifiers: string[],
  titleIdentifiers: string[],
  nextPageIdentifier: string,
  siteEnum: string
) => {
  let htmlFound = [];
  for (let k = 0; k < nameWords.length; k++) {
    const nameArr = nameWords[k].split(" ");
    let response = await fetch(
      firstHalfSiteUrl +
        nameArr.reduce((prev, curr) => {
          return prev === "" ? curr : prev + "+" + curr;
        }, "") +
        secondHalfSiteUrl
    );
    for (let i = 0; i < 3; i++) {
      let html = await response.text();
      console.log(html);
      if (response.status === 200) {
        const $ = cheerio.load(html);
        productIdentifiers.forEach((productIdentifier) => {
          $(productIdentifier).each((i, item) => {
            let title = "";
            let j = 0;
            while (!title) {
              title = $(item).find(titleIdentifiers[j]).text();
              j++;
            }
            if (siteEnum === siteEnums.EBAY && title.includes("NEW LISTING")) {
              title = title.substring(11);
            }
            let lowerCaseTitle = title.toLowerCase();
            if (
              !containsBannedWord(lowerCaseTitle, baseBannedWords) &&
              doesNotContainProduct(lowerCaseTitle, htmlFound)
            ) {
              htmlFound.push({
                name: lowerCaseTitle,
                bannedWords: baseBannedWords,
              });
            }
          });
        });
        response = await fetch(baseUrl + $(nextPageIdentifier).attr("href"));
      }
    }
  }
  //console.log(htmlFound);
  upload(htmlFound);
  return htmlFound;
};

const main = async () => {
  // const baseBannedWords = [
  //   "case",
  //   "cover",
  //   "muffle",
  //   "filter",
  //   "fluff",
  //   "holder",
  //   "mount",
  //   "strap",
  // ];
  // scrapeSite(
  //   baseBannedWords,
  //   ["keyboards", "mouse", "smart phone", "laptop"],
  //   "https://www.amazon.com",
  //   "https://www.amazon.com/s?k=",
  //   "",
  //   [
  //     "div.s-result-item.s-asin.sg-col-0-of-12.sg-col-16-of-20.sg-col.s-widget-spacing-small.sg-col-12-of-16",
  //     "div.sg-col-4-of-12.s-result-item.s-asin.sg-col-4-of-16.sg-col.s-widget-spacing-small.sg-col-4-of-20",
  //   ],
  //   [
  //     "span.a-size-medium.a-color-base.a-text-normal",
  //     "span.a-size-base-plus.a-color-base.a-text-normal",
  //   ],
  //   "a.s-pagination-item.s-pagination-next.s-pagination-button.s-pagination-separator",
  //   siteEnums.AMAZON
  // );
  search("Logitech");
};
main();
