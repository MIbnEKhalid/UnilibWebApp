let products = [];
const productsContainer = document.querySelector(".products");
const searchInput = document.getElementById("searchProduct");
const categoryFilter = document.getElementById("categoryFilter");

async function loadProducts() {
  try {
    const response = await fetch('Assets/books.json');
    products = await response.json(); // Parse the JSON response directly
    filterProducts();
  } catch (error) {
    console.error("Error loading products:", error);
  }
}

function displayProducts(productsArray) {
  productsContainer.innerHTML = "";
  if (productsArray.length === 0) {
    productsContainer.innerHTML = '<p class="nmessage">Material not found</p>';
    return;
  }
  productsArray.forEach((product) => {
    const productElement = document.createElement("a");
    productElement.classList.add("product", "linked");
    productElement.id = product.id;
    productElement.href = product.link;
    productElement.innerHTML = `
           <img src="Assets/Images/BookCovers/${product.imageURL}" alt="${product.name}">
           <h3>${product.name}</h3>
           <p>${product.description}</p>
        `;
    productsContainer.appendChild(productElement);
  });
}

function filterProducts() {
  const selectedCategory = categoryFilter.value;
  let filteredProducts = products;
  if (selectedCategory !== "all") {
    filteredProducts = products.filter((product) =>
      product.category.includes(selectedCategory)
    );
  }
  filteredProducts = searchProducts(filteredProducts);
  displayProducts(filteredProducts);
}

function searchProducts(productsArray) {
  const searchText = searchInput.value.toLowerCase();
  return productsArray.filter((product) =>
    product.name.toLowerCase().includes(searchText)
  );
}

categoryFilter.addEventListener("change", filterProducts);
searchInput.addEventListener("input", filterProducts);

loadProducts();

fetch("Assets/assigmentsNquiz.json")
  .then((response) => response.json()) // Fetch the JSON data
  .then((data) => {
    const detailsContainer = document.getElementById("detailsContainer");
    const noAss = document.getElementById("noAss");

    detailsContainer.innerHTML = ""; // Clear any existing content

    // Get the current date without the time component
    const currentDate = new Date();
    currentDate.setHours(0, 0, 0, 0); // Set time to midnight for accurate comparison

    let activeItems = 0;

    data.forEach((item) => {
      const dueDate = new Date(item.dueDate);
      dueDate.setHours(0, 0, 0, 0); // Strip time for comparison

      // Check if the dueDate is today or in the future
      if (dueDate >= currentDate) {
        activeItems++;

        const detailsDiv = document.createElement("div");
        detailsDiv.classList.add("details");
        detailsDiv.id = `${item.id}`;
        detailsDiv.style.minWidth = "100%";
        detailsDiv.style.width = "100%";

        // Truncate long descriptions
        const shortDescription = item.description.substring(0, 100);
        const isTruncated = item.description.length > 100;

        detailsDiv.innerHTML = `
                    <div class="date-box">
                        <span id="issueDate">${item.issueDate}</span>
                        <span id="dueDate">${item.dueDate}</span>
                    </div>
                    <div class="assignment-info">
                        <span>
                            <strong>${item.subject}:</strong>
                            <span class="description">${shortDescription}</span>
                              ${
                                isTruncated
                                  ? `<span class="see-more">...</span><button class="toggle-more-inline">+ See More</button>`
                                  : ""
                              }
                            </span>
                    </div>
                `;

        detailsContainer.appendChild(detailsDiv);

        if (isTruncated) {
          const toggleButton = detailsDiv.querySelector(".toggle-more-inline");
          const descriptionSpan = detailsDiv.querySelector(".description");
          const seeMoreSpan = detailsDiv.querySelector(".see-more");

          toggleButton.addEventListener("click", () => {
            if (descriptionSpan.textContent === shortDescription) {
              descriptionSpan.textContent = item.description;
              seeMoreSpan.style.display = "none";
              toggleButton.textContent = "- See Less";
            } else {
              descriptionSpan.textContent = shortDescription;
              seeMoreSpan.style.display = "inline";
              toggleButton.textContent = "+ See More";
            }
          });
        }
      }
    });

    // Handle cases where no active items exist
    if (activeItems === 0) {
      detailsContainer.style.display = "none";
      noAss.style.display = "block";
      document.getElementById("toggleButton").style.display = "none";
    } else {
      detailsContainer.style.display = "block";
      noAss.style.display = "none";
      document.getElementById("toggleButton").style.display = "block";
    }
  })
  .catch((error) => console.error("Error fetching data:", error));
