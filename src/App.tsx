import "./App.scss";
import Product from "./components/Product";
import { testScraper } from "./utils/firebase";

function App() {
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
      <div className="w-100 d-flex flex-column align-items-center">
        <Product />
        <Product />
        <Product />
        <Product />
      </div>
    </div>
  );
}

export default App;
