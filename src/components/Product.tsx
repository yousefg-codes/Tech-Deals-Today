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
  if (isLoading) {
    return (
      <div className="tdt-product-container d-flex flex-row align-items-center justify-content-between overflow-hidden"></div>
    );
  }
  const bestProduct =
    productData[productData?.bestEnum].allListings[
      productData[productData?.bestEnum].bestIndex
    ];
  if (!bestProduct) {
    return <div></div>;
  }
  return (
    <div className="tdt-product-container ms-3 d-flex flex-column align-items-center justify-content-between overflow-hidden px-2 py-2 ">
      <div
        className="background-white px-2 py-2 w-100 center-child"
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
        <div className="d-flex flex-column align-items-center w-100">
          <strong
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
          <div style={{ fontSize: "1.6em" }}>
            ${Math.round(bestProduct.price * 100) / 100}
          </div>
        </div>
        <div className="d-flex flex-row d-flex flex-column justify-content-center">
          <div className="d-flex flex-column align-items-center h-100 me-2 mb-2">
            <div
              className="tdt-product-price-percentage fw-bold"
              style={{ width: "fit-content" }}
            >
              -
              {Math.round(
                (100 - 100 * (bestProduct.price / productData.avgPrice)) * 100
              ) / 100}
              %
            </div>
            <div style={{ fontSize: "1.1em" }}>
              Avg. Price: ${Math.round(productData.avgPrice * 100) / 100}
            </div>
            <a
              href={bestProduct.url}
              target="_blank"
              style={{ fontSize: "1.1em" }}
            >
              {productData.bestEnum}
              {"  "}
              <FontAwesomeIcon icon={faArrowUpRightFromSquare} />
            </a>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Product;
