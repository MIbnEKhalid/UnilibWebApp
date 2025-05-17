// Global state with enhanced caching and pagination
const state = {
  products: [],
  currentPage: 1,
  itemsPerPage: 12,
  totalPages: 1,
  totalItems: 0,
  currentFilters: {
    semester: '',
    category: 'all',
    search: ''
  },
  isLoading: false,
  cache: new Map(), // Simple in-memory cache
  lastRequestTime: 0,
  abortController: null
};

// DOM elements
const elements = {
  productsContainer: document.querySelector(".products"),
  searchInput: document.getElementById("searchProduct"),
  categoryFilter: document.getElementById("categoryFilter"),
  semesterFilter: document.getElementById("semesterFilter"),
  spinner: document.getElementById('spinner'),
  clearBtn: document.getElementById("clearSearch"),
  pagination: document.getElementById("pagination"),
  paginationInfo: document.getElementById("paginationInfo")
};

// Initialize the application
document.addEventListener("DOMContentLoaded", () => {
  parseUrlParameters();
  setupEventListeners();
  loadProducts();
});

// Parse URL parameters and set initial state
function parseUrlParameters() {
  const urlParams = new URLSearchParams(window.location.search);
  
  state.currentPage = parseInt(urlParams.get('page')) || 1;
  state.currentFilters.semester = urlParams.get('semester') || '';
  state.currentFilters.category = urlParams.get('category') || 'all';
  state.currentFilters.search = urlParams.get('search') || '';
  
  // Update UI to reflect URL parameters
  if (state.currentFilters.semester) {
    elements.semesterFilter.value = state.currentFilters.semester;
  }
  if (state.currentFilters.category) {
    elements.categoryFilter.value = state.currentFilters.category;
  }
  if (state.currentFilters.search) {
    elements.searchInput.value = state.currentFilters.search;
    elements.clearBtn.style.display = 'block';
  }
}

// Update URL without reloading the page
function updateUrl() {
  const urlParams = new URLSearchParams();
  
  if (state.currentPage > 1) urlParams.set('page', state.currentPage);
  if (state.currentFilters.semester) urlParams.set('semester', state.currentFilters.semester);
  if (state.currentFilters.category !== 'all') urlParams.set('category', state.currentFilters.category);
  if (state.currentFilters.search) urlParams.set('search', state.currentFilters.search);
  
  const newUrl = window.location.pathname + (urlParams.toString() ? `?${urlParams.toString()}` : '');
  window.history.pushState({}, '', newUrl);
}

// Setup all event listeners
function setupEventListeners() {
  // Filter events
  elements.searchInput.addEventListener("input", debounce(filterProducts, 500));
  elements.categoryFilter.addEventListener("change", filterProducts);
  elements.semesterFilter.addEventListener("change", filterProducts);

  // Clear search
  elements.clearBtn.addEventListener("click", () => {
    elements.searchInput.value = '';
    elements.clearBtn.style.display = 'none';
    state.currentFilters.search = '';
    filterProducts();
  });

  // Handle browser back/forward navigation
  window.addEventListener('popstate', () => {
    parseUrlParameters();
    loadProducts();
  });

  // Lazy load images when they become visible
  setupLazyLoadingObserver();
}

// Intersection Observer for lazy loading images
function setupLazyLoadingObserver() {
  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        const img = entry.target;
        if (img.dataset.src) {
          img.src = img.dataset.src;
          img.removeAttribute('data-src');
        }
        observer.unobserve(img);
      }
    });
  }, {
    rootMargin: '200px 0px',
    threshold: 0.01
  });

  // We'll observe images when they're added to DOM in renderProducts()
}

// Enhanced loadProducts with caching and abort control
async function loadProducts() {
  if (state.isLoading) return;
  
  // Abort any pending request
  if (state.abortController) {
    state.abortController.abort();
  }
  
  // Create cache key
  const cacheKey = JSON.stringify({
    page: state.currentPage,
    semester: state.currentFilters.semester,
    category: state.currentFilters.category,
    search: state.currentFilters.search
  });
  
  // Check cache first
  if (state.cache.has(cacheKey)) {
    const cachedData = state.cache.get(cacheKey);
    state.products = cachedData.data;
    state.totalItems = cachedData.pagination.total;
    state.totalPages = cachedData.pagination.pages;
    renderProducts();
    renderPagination();
    return;
  }
  
  // Rate limiting - don't make requests too frequently
  const now = Date.now();
  if (now - state.lastRequestTime < 300) { // 300ms debounce
    return;
  }
  state.lastRequestTime = now;
  
  try {
    state.isLoading = true;
    elements.spinner.style.display = 'block';
    elements.productsContainer.innerHTML = '';
    
    const params = new URLSearchParams({
      page: state.currentPage,
      limit: state.itemsPerPage,
      ...(state.currentFilters.semester && { semester: state.currentFilters.semester }),
      ...(state.currentFilters.category !== 'all' && { category: state.currentFilters.category }),
      ...(state.currentFilters.search && { search: state.currentFilters.search })
    });
    
    // Set up abort controller for fetch
    state.abortController = new AbortController();
    const timeoutId = setTimeout(() => state.abortController.abort(), 8000);
    
    const response = await fetch(`/api/Unilib/Book?${params.toString()}`, {
      signal: state.abortController.signal
    });
    
    clearTimeout(timeoutId);
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    const data = await response.json();
    
    // Update cache
    state.cache.set(cacheKey, data);
    
    // Keep cache size manageable
    if (state.cache.size > 20) {
      const firstKey = state.cache.keys().next().value;
      state.cache.delete(firstKey);
    }
    
    state.products = data.data || [];
    state.totalItems = data.pagination?.total || 0;
    state.totalPages = data.pagination?.pages || 1;
    
    renderProducts();
    renderPagination();
    
    // Prefetch next page if likely to be needed
    if (state.currentPage < state.totalPages) {
      const nextPageKey = JSON.stringify({
        page: state.currentPage + 1,
        ...state.currentFilters
      });
      
      if (!state.cache.has(nextPageKey)) {
        setTimeout(() => prefetchPage(state.currentPage + 1), 1000);
      }
    }
  } catch (error) {
    if (error.name !== 'AbortError') {
      console.error("Error loading products:", error);
      showError("Failed to load course materials. Please try again later.");
    }
  } finally {
    state.isLoading = false;
    state.abortController = null;
    elements.spinner.style.display = 'none';
  }
}

// Prefetch function for next page
async function prefetchPage(page) {
  const cacheKey = JSON.stringify({
    page,
    semester: state.currentFilters.semester,
    category: state.currentFilters.category,
    search: state.currentFilters.search
  });
  
  if (state.cache.has(cacheKey)) return;
  
  try {
    const params = new URLSearchParams({
      page,
      limit: state.itemsPerPage,
      ...(state.currentFilters.semester && { semester: state.currentFilters.semester }),
      ...(state.currentFilters.category !== 'all' && { category: state.currentFilters.category }),
      ...(state.currentFilters.search && { search: state.currentFilters.search })
    });
    
    const response = await fetch(`/api/Unilib/Book?${params.toString()}`);
    const data = await response.json();
    state.cache.set(cacheKey, data);
  } catch (error) {
    console.error("Prefetch failed:", error);
  }
}

// Filter products based on current filters
function filterProducts() {
  state.currentPage = 1; // Reset to first page when filters change
  state.currentFilters = {
    semester: elements.semesterFilter.value,
    category: elements.categoryFilter.value,
    search: elements.searchInput.value.toLowerCase()
  };
  
  // Show/hide clear button
  elements.clearBtn.style.display = state.currentFilters.search.length > 0 ? 'block' : 'none';
  
  updateUrl();
  loadProducts();
}

// Render product cards
function renderProducts() {
  elements.productsContainer.innerHTML = '';

  if (state.products.length === 0) {
    elements.productsContainer.style.display = 'flex';
    elements.productsContainer.innerHTML = `
      <div class="no-results">
        <i class="fas fa-book-open" style="font-size: 3rem; margin-bottom: 1rem; color: var(--text-secondary);"></i>
        <p style="color: var(--text-secondary); margin-bottom: 1.5rem;">No materials found matching your criteria</p>
        <button class="btn btn-save" onclick="resetFilters()" style="margin: 0 auto;">
          <i class="fas fa-filter"></i> Reset Filters
        </button>
      </div>
    `;
    return;
  } else{
    elements.productsContainer.style.display = 'grid';
  }

  const fragment = document.createDocumentFragment();
  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        const img = entry.target;
        if (img.dataset.src) {
          img.src = img.dataset.src;
          img.removeAttribute('data-src');
        }
        observer.unobserve(img);
      }
    });
  }, {
    rootMargin: '200px 0px',
    threshold: 0.01
  });

  state.products.forEach(product => {
    const productElement = createProductCard(product);
    fragment.appendChild(productElement);
  });

  elements.productsContainer.appendChild(fragment);
  
  // Observe all lazy-loaded images
  document.querySelectorAll('img[data-src]').forEach(img => {
    observer.observe(img);
  });
}

// Create individual product card
function createProductCard(product) {
  const card = document.createElement("article");
  card.classList.add("book-card", "linked");
  card.id = product.id;
  card.setAttribute('data-id', product.id);

  let badge = '';
  if (product.main) {
    badge = `<div class="badge" aria-label="Main resource">Main</div>`;
  }

  card.innerHTML = `
    ${badge}
    <a href="${product.link}" aria-label="${product.name}" target="_blank" rel="noopener noreferrer"> 
      <img data-src="${product.imageURL}" alt="Cover of ${product.name}" loading="lazy" class="lazy-load">
    </a>
    <div class="Bdetails">
      <h3>${product.name}</h3>
      <p>${product.description || 'No description available'}</p>
    </div>
    <div class="actions">
      <a href="${product.link}" class="btn btn-save" aria-label="View ${product.name}" target="_blank" rel="noopener noreferrer">
        <i class="fas fa-eye" aria-hidden="true"></i> View
      </a>
      <button onclick="downloadResource('${product.link}')" class="btn btn-save" aria-label="Download ${product.name}">
        <i class="fas fa-download" aria-hidden="true"></i> Download
      </button>
    </div>
  `;

  return card;
}

// Render pagination controls
function renderPagination() {
  elements.pagination.innerHTML = '';
  
  if (state.totalPages <= 1) {
    elements.paginationInfo.textContent = `Showing ${state.totalItems} item${state.totalItems !== 1 ? 's' : ''}`;
    return;
  }
  
  // Previous button
  const prevButton = document.createElement('button');
  prevButton.innerHTML = '<i class="fas fa-chevron-left"></i>';
  prevButton.disabled = state.currentPage === 1;
  prevButton.title = 'Previous page';
  prevButton.addEventListener('click', () => {
    if (state.currentPage > 1) {
      state.currentPage--;
      updateUrl();
      loadProducts();
      scrollToResults();
    }
  });
  elements.pagination.appendChild(prevButton);
  
  // Page buttons
  const maxVisiblePages = 5;
  let startPage = Math.max(1, state.currentPage - Math.floor(maxVisiblePages / 2));
  let endPage = Math.min(state.totalPages, startPage + maxVisiblePages - 1);
  
  if (endPage - startPage + 1 < maxVisiblePages) {
    startPage = Math.max(1, endPage - maxVisiblePages + 1);
  }
  
  if (startPage > 1) {
    const firstButton = document.createElement('button');
    firstButton.textContent = '1';
    firstButton.title = 'First page';
    firstButton.addEventListener('click', () => {
      state.currentPage = 1;
      updateUrl();
      loadProducts();
      scrollToResults();
    });
    elements.pagination.appendChild(firstButton);
    
    if (startPage > 2) {
      const ellipsis = document.createElement('span');
      ellipsis.textContent = '...';
      ellipsis.style.padding = '0 10px';
      ellipsis.style.color = 'var(--text-secondary)';
      elements.pagination.appendChild(ellipsis);
    }
  }
  
  for (let i = startPage; i <= endPage; i++) {
    const pageButton = document.createElement('button');
    pageButton.textContent = i;
    pageButton.title = `Page ${i}`;
    if (i === state.currentPage) {
      pageButton.classList.add('active');
      pageButton.disabled = true;
    }
    pageButton.addEventListener('click', () => {
      state.currentPage = i;
      updateUrl();
      loadProducts();
      scrollToResults();
    });
    elements.pagination.appendChild(pageButton);
  }
  
  if (endPage < state.totalPages) {
    if (endPage < state.totalPages - 1) {
      const ellipsis = document.createElement('span');
      ellipsis.textContent = '...';
      ellipsis.style.padding = '0 10px';
      ellipsis.style.color = 'var(--text-secondary)';
      elements.pagination.appendChild(ellipsis);
    }
    
    const lastButton = document.createElement('button');
    lastButton.textContent = state.totalPages;
    lastButton.title = 'Last page';
    lastButton.addEventListener('click', () => {
      state.currentPage = state.totalPages;
      updateUrl();
      loadProducts();
      scrollToResults();
    });
    elements.pagination.appendChild(lastButton);
  }
  
  // Next button
  const nextButton = document.createElement('button');
  nextButton.innerHTML = '<i class="fas fa-chevron-right"></i>';
  nextButton.disabled = state.currentPage === state.totalPages;
  nextButton.title = 'Next page';
  nextButton.addEventListener('click', () => {
    if (state.currentPage < state.totalPages) {
      state.currentPage++;
      updateUrl();
      loadProducts();
      scrollToResults();
    }
  });
  elements.pagination.appendChild(nextButton);
  
  // Pagination info
  const startItem = ((state.currentPage - 1) * state.itemsPerPage) + 1;
  const endItem = Math.min(state.currentPage * state.itemsPerPage, state.totalItems);
  elements.paginationInfo.textContent = `Showing ${startItem}-${endItem} of ${state.totalItems} item${state.totalItems !== 1 ? 's' : ''}`;
}

// Helper function to scroll to results
function scrollToResults() {
  const resultsSection = document.getElementById('books');
  if (resultsSection) {
    const headerHeight = document.querySelector('header')?.offsetHeight || 0;
    window.scrollTo({
      top: resultsSection.offsetTop - headerHeight - 20,
      behavior: 'smooth'
    });
  }
}

// Download resource handler
function downloadResource(driveLink) {
  try {
    const fileIdMatch = driveLink.match(/\/d\/([a-zA-Z0-9_-]+)/) || driveLink.match(/id=([a-zA-Z0-9_-]+)/);
    const fileId = fileIdMatch ? fileIdMatch[1] : null;
    if (fileId) {
      window.open(`https://drive.usercontent.google.com/uc?id=${fileId}&export=download`, '_blank');
    } else {
      console.error("Invalid Google Drive link:", driveLink);
      showError("Invalid download link. Please try viewing the resource first.");
    }
  } catch (error) {
    console.error("Download error:", error);
    showError("Failed to initiate download. Please try again.");
  }
}

// Reset all filters
window.resetFilters = function() {
  elements.semesterFilter.value = 'Semester2';
  elements.categoryFilter.value = 'all';
  elements.searchInput.value = '';
  elements.clearBtn.style.display = 'none';
  state.currentFilters = {
    semester: 'Semester2',
    category: 'all',
    search: ''
  };
  state.currentPage = 1;
  updateUrl();
  loadProducts();
};

// Show error message
function showError(message) {
  const errorElement = document.createElement("div");
  errorElement.classList.add("notification", "is-error");
  errorElement.innerHTML = `
    <button class="delete" onclick="this.parentElement.remove()"></button>
    ${message}
  `;
  document.querySelector(".not").appendChild(errorElement);
  setTimeout(() => errorElement.remove(), 5000);
}

// Debounce function for search input
function debounce(func, wait) {
  let timeout;
  return function() {
    const context = this, args = arguments;
    clearTimeout(timeout);
    timeout = setTimeout(() => func.apply(context, args), wait);
  };
}

// Make downloadResource available globally
window.downloadResource = downloadResource;