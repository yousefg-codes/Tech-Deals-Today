import { faSearch } from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { useEffect, useLayoutEffect, useState } from "react";
import "./App.scss";
import Product from "./components/Product";
import { useWindowSize } from "./utils/customHooks";
import {
  getDailyProducts,
  getSearchedProducts,
  loadMoreProducts,
  testScraper,
} from "./utils/firebase";

function App() {
  const [isLoading, setIsLoading] = useState(true);
  const [shownProducts, setShownProducts] = useState([]);
  const [searchText, setSearchText] = useState("");
  const [defaultProducts, setDefaultProducts] = useState([]);
  const [currentlyLoaded, setCurrentlyLoaded] = useState(0);
  const [isSearching, setIsSearching] = useState(false);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [width, height] = useWindowSize();
  const asyncUseEffect = async () => {
    const fetchedProducts = await getDailyProducts();
    setDefaultProducts(fetchedProducts);
    setCurrentlyLoaded(fetchedProducts.length);
    setShownProducts(fetchedProducts);
    setIsLoading(false);
  };
  const loadMore = async () => {
    console.log(currentlyLoaded);
    setIsLoadingMore(true);
    const fetchedProducts = await loadMoreProducts(currentlyLoaded);
    console.log(fetchedProducts.length);
    setCurrentlyLoaded(defaultProducts.length + fetchedProducts.length);
    setDefaultProducts(defaultProducts.concat(fetchedProducts));
    setShownProducts(defaultProducts.concat(fetchedProducts));
    setIsLoadingMore(false);
  };
  useEffect(() => {
    asyncUseEffect();
  }, []);
  const showLoadingProducts = () => {
    let loadingProducts = [];
    for (let i = 0; i < 30; i++) {
      loadingProducts.push(<Product isLoading />);
    }
    return loadingProducts;
  };
  if (window.origin.includes("top.techdeals.today")) {
    return <div></div>;
  }
  return (
    <div className="background-container background-white">
      <div className="w-100 d-flex flex-column align-items-center">
        <div className="my-4 w-100 center-child">
          <form
            className={`search-container ${
              width < 800 ? (width < 600 ? "w-100 mx-4" : "w-50") : "w-25"
            }`}
            id="searchBar"
            onSubmit={async (e) => {
              e.preventDefault();
              if (!searchText) {
                setIsSearching(false);
                setShownProducts(defaultProducts);
                return;
              }
              setIsSearching(true);
              setIsLoading(true);
              const products = await getSearchedProducts(searchText);
              console.log(products);
              setShownProducts(products);
              setIsLoading(false);
            }}
          >
            <button className="search-btn px-1" type="submit">
              <FontAwesomeIcon icon={faSearch} />
            </button>
            <input
              className="search-input"
              onChange={(e) => {
                setSearchText(e.target.value);
              }}
              placeholder="Search for a product..."
              type="text"
            />
          </form>
          {/* <button
            onClick={() => {
              testScraper();
            }}
          >
            Test Scraper
          </button> */}
        </div>
      </div>
      <div
        className={`w-100 d-flex ${
          width < 600 ? "flex-column" : "flex-row"
        } flex-wrap align-items-center`}
      >
        {isLoading
          ? showLoadingProducts()
          : shownProducts.map((data) => (
              <Product productData={data} isLoading={false} />
            ))}
      </div>
      <div className="w-100 center-child py-3">
        {!isSearching ? (
          isLoadingMore ? (
            <div className="dot-carousel"></div>
          ) : (
            <button
              onClick={() => {
                loadMore();
              }}
              className="background-white light-hover"
              style={{
                outline: "none",
                border: "none",
                color: "gray",
                fontSize: "1.2em",
              }}
            >
              <strong>Load More</strong>
            </button>
          )
        ) : null}
      </div>
    </div>
  );
}

export default App;
