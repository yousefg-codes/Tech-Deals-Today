import { faSearch } from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { useEffect, useState } from "react";
import "./App.scss";
import Product from "./components/Product";
import {
  getDailyProducts,
  getSearchedProducts,
  testScraper,
} from "./utils/firebase";

function App() {
  const [isLoading, setIsLoading] = useState(true);
  const [shownProducts, setShownProducts] = useState([]);
  const [searchText, setSearchText] = useState("");
  const asyncUseEffect = async () => {
    const fetchedProducts = await getDailyProducts();
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
    <div className="background-container background-white">
      <div className="w-100 d-flex flex-column align-items-center">
        <div className="my-4 w-100 center-child">
          <div className="search-container w-25">
            <button
              className="search-btn"
              onClick={async () => {
                setIsLoading(true);
                const products = await getSearchedProducts(searchText);
                console.log(products);
                setShownProducts(products);
                setIsLoading(false);
              }}
            >
              <FontAwesomeIcon icon={faSearch} />
            </button>
            <input
              className="search-input"
              placeholder="Search for a product..."
              type="text"
            />
          </div>
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
