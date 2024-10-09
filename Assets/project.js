let products = []; // Define products as a global variable

const productsContainer = document.querySelector('.products');
const searchInput = document.getElementById('searchProduct');
const categoryFilter = document.getElementById('categoryFilter');

// Function to fetch and use the products data
async function loadProducts() {
    try {
        const response = await fetch('Assets/projects.json'); // Update the path to your products.json file
        products = await response.json(); // Update the global products variable
        filterProducts(); // Call filterProducts to display the initial set of products
    } catch (error) {
        console.error('Error loading products:', error);
    }
}

function displayProducts(productsArray) {
    productsContainer.innerHTML = "";
    if (productsArray.length === 0) {
        productsContainer.innerHTML = '<p class="nmessage">Material not found</p>';
        return;
    }
    productsArray.forEach(product => {
        const productElement = document.createElement('div');
        productElement.classList.add('product');
        productElement.innerHTML = `
            <img src="${product.imageURL}" alt="${product.name}">
            <h3>${product.name}</h3>
            <p>${product.description}</p>
        `;
        productElement.addEventListener('click', () => {
            window.open(product.link, '_blank');
        });
        productsContainer.appendChild(productElement);
    });
}

function filterProducts() {
    const selectedCategory = categoryFilter.value;
    let filteredProducts = products;

    if (selectedCategory !== 'all') {
        filteredProducts = products.filter(product => product.category.includes(selectedCategory));
    }
    filteredProducts = searchProducts(filteredProducts);
    displayProducts(filteredProducts);
}

function searchProducts(productsArray) {
    const searchText = searchInput.value.toLowerCase();
    return productsArray.filter(product => product.name.toLowerCase().includes(searchText));
}

categoryFilter.addEventListener('change', filterProducts);
searchInput.addEventListener('input', filterProducts);

// Initial display of all products
loadProducts();
