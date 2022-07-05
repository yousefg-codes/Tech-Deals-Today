import { getAllProducts, uploadDailyProducts } from "./firebase";
import { main } from "./scraper-log-test";
const firebaseTest = async () => {
  let allProducts = await getAllProducts();
  let data = await main(allProducts.slice(0, 2));
  //console.log(data);
  //uploadDailyProducts(data);
};
firebaseTest();
