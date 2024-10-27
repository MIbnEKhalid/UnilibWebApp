/*let products = []; // Define products as a global variable

const productsContainer = document.querySelector('.products');
const searchInput = document.getElementById('searchProduct');
const categoryFilter = document.getElementById('categoryFilter');

// Function to fetch and use the products data
async function loadProducts() {
    try {
        //const response = await fetch('https://raw.githubusercontent.com/MIbnEKhalid/Unilib.MIbnEKhalid.github.io/JSON/projects.json');
        const response = await fetch('Assets/projects.json');  
        products = await response.json();  
        filterProducts();  
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

    // Perform search filtering
    filteredProducts = searchProducts(filteredProducts);

    // Display the filtered products
    displayProducts(filteredProducts);
}

function searchProducts(productsArray) {
    const searchText = searchInput.value.toLowerCase();
    return productsArray.filter(product => product.name.toLowerCase().includes(searchText));
}

// Event listeners for category filter and search input
categoryFilter.addEventListener('change', filterProducts);
searchInput.addEventListener('input', filterProducts);

// Initial display of all products
loadProducts();
*/

let products = [];
const productsContainer = document.querySelector('.products');
const searchInput = document.getElementById('searchProduct');
const categoryFilter = document.getElementById('categoryFilter');
async function loadProducts() {
    try {
        const response = await fetch('https://raw.githubusercontent.com/MIbnEKhalid/Unilib.MIbnEKhalid.github.io/edit/books.yaml');
        // const response = await fetch('Assets/projects.yaml');
        const text = await response.text();
        products = jsyaml.load(text);  
        filterProducts();  
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
loadProducts();













fetch('https://raw.githubusercontent.com/MIbnEKhalid/Unilib.MIbnEKhalid.github.io/edit/assigmentsNquiz.yaml')
        .then(response => response.text()) // Fetch the YAML as text
        .then(yamlText => {
            // Parse the YAML text into a JavaScript object
            const data = jsyaml.load(yamlText); // Requires jsyaml library
    
            const detailsContainer = document.getElementById('detailsContainer');
            detailsContainer.innerHTML = '';  // Clear any existing content 
    
            data.forEach(item => {
                const detailsDiv = document.createElement('div');
                detailsDiv.classList.add('details');
                detailsDiv.style.minWidth = '100%';
                detailsDiv.style.width = '100%';
    
                detailsDiv.innerHTML = `
                <div class="date-box">
                    <span id="issueDate">${item.issueDate}</span>
                    <span id="dueDate">${item.dueDate}</span>
                </div>
                <div class="assignment-info">
                    <span><strong>Subject:</strong> ${item.subject}</span><br>
                    <span><strong>${item.type}:</strong> ${item.description}</span>
                </div>
            `;
                detailsContainer.appendChild(detailsDiv);
            });
        })
        .catch(error => console.error('Error fetching data:', error));
