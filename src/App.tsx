import { useEffect, useState } from "react";
import "./App.scss";
import Product from "./components/Product";
import { getProducts, testScraper } from "./utils/firebase";

function App() {
  const [isLoading, setIsLoading] = useState(true);
  const [shownProducts, setShownProducts] = useState([]);
  const asyncUseEffect = async () => {
    const fetchedProducts = await getProducts();
    setShownProducts(fetchedProducts);
  };
  useEffect(() => {
    asyncUseEffect();
    setIsLoading(false);
  }, []);
  const showLoadingProducts = () => {
    let loadingProducts = [];
    for (let i = 0; i < 10; i++) {
      loadingProducts.push(<Product isLoading />);
    }
    return loadingProducts;
  };
  return (
    <div className="background-container tdt-light-gray-bg">
      <div className="w-100 d-flex flex-column align-items-center">
        <div className="">
          <input />
          <button
            onClick={() => {
              testScraper();
            }}
          >
            Test Scraper
          </button>
        </div>
      </div>
      <div className="w-100 d-flex flex-row flex-wrap align-items-center">
        {isLoading && shownProducts.length === 0
          ? showLoadingProducts()
          : shownProducts.map((data) => (
              <Product productData={data} isLoading={false} />
            ))}
      </div>
    </div>
  );
}

export default App;
