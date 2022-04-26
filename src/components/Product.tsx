import { faArrowUpRightFromSquare } from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";

const Product = ({
  isLoading,
  productData,
}: {
  isLoading?: boolean;
  productData?: any;
}) => {
  console.log(productData);
  if (isLoading) {
    return (
      <div className="tdt-product-container  d-flex flex-row align-items-center justify-content-between  overflow-hidden mx-3">
        <div
          style={{ objectFit: "contain", width: "30%" }}
          className="gradient h-100"
        />
        <div className="h-100 ms-2 mt-3" style={{ flex: 1 }}>
          <div
            className="gradient"
            style={{ height: "10%", width: "90%", borderRadius: "3px" }}
          ></div>
          <div
            className="gradient mt-2"
            style={{ height: "25%", width: "10%", borderRadius: "3px" }}
          ></div>
          <div className="d-flex flex-row justify-content-end h-50">
            <div className="h-100 ms-5 ps-5 mb-2 w-50">
              <div
                className="gradient mb-2"
                style={{ height: "30%", width: "40%", borderRadius: "3px" }}
              ></div>
              <div
                className="gradient"
                style={{ height: "20%", width: "50%", borderRadius: "3px" }}
              ></div>
              <div
                className="gradient mt-2"
                style={{ height: "20%", width: "30%", borderRadius: "3px" }}
              ></div>
            </div>
          </div>
        </div>
      </div>
    );
  }
  const bestProduct =
    productData[productData.bestEnum][productData.id].allListings[
      productData[productData.bestEnum][productData.id].bestIndex
    ];
  return (
    <div className="tdt-product-container d-flex flex-row align-items-center justify-content-between overflow-hidden">
      <img
        style={{ objectFit: "contain" }}
        className="h-100"
        src={bestProduct.imageUrl}
      />
      <div className="h-100 ms-2 mt-3" style={{ flex: 1 }}>
        <strong style={{ fontSize: "1.1em" }}>{bestProduct.title}</strong>
        <div style={{ fontSize: "1.6em" }}>
          ${Math.round(bestProduct.price * 100) / 100}
        </div>
        <div className="d-flex flex-row justify-content-end">
          <div className="h-100 me-2 mb-2">
            <div
              className="tdt-product-price-percentage-outer"
              style={{ width: "fit-content" }}
            >
              <div
                className="inner fw-bold px-2 py-2 center-child"
                style={{ width: "fit-content", fontSize: "1.1em" }}
              >
                -
                {Math.round(
                  (100 - 100 * (bestProduct.price / productData.avgPrice)) * 100
                ) / 100}
                %
              </div>
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
