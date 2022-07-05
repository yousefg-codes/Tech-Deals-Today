import { faArrowUpRightFromSquare } from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";

const Product = ({
  isLoading,
  productData,
}: {
  isLoading?: boolean;
  productData?: any;
}) => {
  //console.log(productData);
  let bestProduct = !productData
    ? null
    : productData[productData?.bestEnum]?.allListings[
        productData[productData?.bestEnum]?.bestIndex
      ];
  if (!bestProduct) {
    bestProduct = {
      url: "        ",
      imageUrl: "        ",
      price: "       ",
      title: "                             ",
    };
  }
  return (
    <div
      className={`tdt-product-container ${
        window.innerWidth < 600 ? "" : "ms-3"
      } d-flex flex-column align-items-center justify-content-between overflow-hidden px-2 py-2`}
    >
      <div
        className={`background-white px-2 py-2 w-100 center-child ${
          isLoading ? "gradient" : ""
        }`}
        style={{ height: "45%", borderRadius: "5px" }}
      >
        <img
          style={{
            objectFit: "contain",
            maxWidth: "100%",
          }}
          className="h-100"
          src={bestProduct.imageUrl}
        />
      </div>
      <div
        className="d-flex flex-column align-items-center justify-content-between h-100 mt-3 px-2 py-2 background-white"
        style={{ flex: 1, borderRadius: "5px", maxHeight: "55%" }}
      >
        <div
          className={`d-flex flex-column align-items-center w-100 ${
            isLoading ? "h-25" : ""
          }`}
        >
          <strong
            className={`${isLoading ? "gradient h-100" : ""}`}
            style={{
              fontSize: "1em",
              textAlign: "center",
              overflow: "hidden",
              wordWrap: "break-word",
              visibility: "visible",
              whiteSpace: "break-spaces",
              width: "100%",
              textOverflow: "ellipsis",
              WebkitLineClamp: 2,
            }}
          >
            {bestProduct.title.length > 100
              ? bestProduct.title.substring(0, 101) + "..."
              : bestProduct.title}
          </strong>
          <div
            className={`${isLoading ? "gradient w-100 h-100 mt-2" : ""}`}
            style={{ fontSize: "1.6em" }}
          >
            {!isLoading
              ? `$${Math.round(bestProduct.price * 100) / 100}`
              : "      "}
          </div>
        </div>
        <div
          className={`d-flex flex-row d-flex flex-column justify-content-center ${
            isLoading ? "h-50 w-100" : ""
          }`}
        >
          <div
            className={`d-flex flex-column align-items-center h-100 me-2 mb-2 ${
              isLoading ? "gradient w-100" : ""
            }`}
          >
            <div
              className={`tdt-product-price-percentage fw-bold ${
                isLoading ? "gradient" : ""
              }`}
              style={{ width: "fit-content" }}
            >
              {!isLoading
                ? "-" +
                  Math.round(
                    (100 - 100 * (bestProduct.price / productData.avgPrice)) *
                      100
                  ) /
                    100 +
                  "%"
                : "      "}
            </div>
            <div
              className={`${isLoading ? "gradient" : ""}`}
              style={{ fontSize: "1.1em" }}
            >
              {!isLoading
                ? `Avg. Price: $${Math.round(productData.avgPrice * 100) / 100}`
                : "             "}
            </div>
            <a
              href={bestProduct.url}
              target="_blank"
              className={`${isLoading ? "gradient" : ""}`}
              style={{ fontSize: "1.1em" }}
            >
              {!isLoading ? productData.bestEnum : "        "}
              {"  "}
              {!isLoading ? (
                <FontAwesomeIcon icon={faArrowUpRightFromSquare} />
              ) : null}
            </a>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Product;
