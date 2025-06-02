// Global state
const state = {
    currentFilters: {
        semester: 'Semester2',
        category: 'all',
        search: ''
    },
    currentPage: 1
};

// DOM elements
const elements = {
    searchInput: document.getElementById("searchProduct"),
    categoryFilter: document.getElementById("categoryFilter"),
    semesterFilter: document.getElementById("semesterFilter"),
    clearBtn: document.getElementById("clearSearch")
};

// Initialize the application
document.addEventListener("DOMContentLoaded", () => {
    parseUrlParameters();
    setupEventListeners();
    setupLazyLoadingObserver();
});

// Parse URL parameters and set initial state
function parseUrlParameters() {
    const urlParams = new URLSearchParams(window.location.search);

    state.currentPage = parseInt(urlParams.get('page')) || 1;
    state.currentFilters.semester = urlParams.get('semester') || 'Semester2';
    state.currentFilters.category = urlParams.get('category') || 'all';
    state.currentFilters.search = urlParams.get('search') || '';

    // Update UI to reflect URL parameters
    if (state.currentFilters.semester && elements.semesterFilter) {
        elements.semesterFilter.value = state.currentFilters.semester;
    }
    if (state.currentFilters.category && elements.categoryFilter) {
        elements.categoryFilter.value = state.currentFilters.category;
    }
    if (state.currentFilters.search && elements.searchInput) {
        elements.searchInput.value = state.currentFilters.search;
        elements.clearBtn.style.display = state.currentFilters.search ? 'block' : 'none';
    }
}

// Update URL and reload page
function updateUrl() {
    const urlParams = new URLSearchParams();

    if (state.currentPage > 1) urlParams.set('page', state.currentPage);
    if (state.currentFilters.semester) urlParams.set('semester', state.currentFilters.semester);
    if (state.currentFilters.category !== 'all') urlParams.set('category', state.currentFilters.category);
    if (state.currentFilters.search) urlParams.set('search', state.currentFilters.search);

    const newUrl = `${window.location.pathname}?${urlParams.toString()}`;
    window.location.href = newUrl; // Reload page with new URL
}

// Setup event listeners
function setupEventListeners() {
    if (elements.searchInput) {
        elements.searchInput.addEventListener("input", debounce(filterProducts, 500));
    }
    if (elements.categoryFilter) {
        elements.categoryFilter.addEventListener("change", filterProducts);
    }
    if (elements.semesterFilter) {
        elements.semesterFilter.addEventListener("change", filterProducts);
    }
    if (elements.clearBtn) {
        elements.clearBtn.addEventListener("click", clearSearch);
    }

    // Handle browser back/forward navigation
    window.addEventListener('popstate', () => {
        parseUrlParameters();
        window.location.reload(); // Reload to reflect URL changes
    });
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

    document.querySelectorAll('img[data-src]').forEach(img => {
        observer.observe(img);
    });
}

// Filter products
function filterProducts() {
    state.currentPage = 1; // Reset to first page
    state.currentFilters.semester = elements.semesterFilter.value;
    state.currentFilters.category = elements.categoryFilter.value;
    state.currentFilters.search = elements.searchInput.value.toLowerCase();

    elements.clearBtn.style.display = state.currentFilters.search.length > 0 ? 'block' : 'none';
    updateUrl();
}

// Clear search
function clearSearch() {
    elements.searchInput.value = '';
    elements.clearBtn.style.display = 'none';
    state.currentFilters.search = '';
    filterProducts();
}

// Go to specific page
window.goToPage = function (page) {
    state.currentPage = page;
    updateUrl();
    scrollToResults();
};

// Reset filters
window.resetFilters = function () {
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
};

// Download resource handler
window.downloadResource = function (driveLink) {
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

// Debounce function
function debounce(func, wait) {
    let timeout;
    return function () {
        clearTimeout(timeout);
        timeout = setTimeout(() => func.apply(this, arguments), wait);
    };
}

// Scroll to results
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