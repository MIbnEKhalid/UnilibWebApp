// Global state
const state = {
    currentFilters: {
        semester: 'Semester3',
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

// Get submit button if present
elements.submitBtn = document.getElementById('searchSubmit') || document.querySelector('.submit-btn');

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
    state.currentFilters.semester = urlParams.get('semester') || 'Semester3';
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
        // Trigger search when user presses Enter in the search input
        elements.searchInput.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                e.preventDefault();
                filterProducts(e);
            }
        });
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

    // Bind the submit button if present - some pages may inline a click handler
    if (elements.submitBtn) {
        elements.submitBtn.addEventListener('click', (e) => {
            e.preventDefault();
            filterProducts(e);
        });
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
function filterProducts(e) {
    // If called from event handlers that pass an event, prevent default action
    if (e && e.preventDefault) {
        e.preventDefault();
    }
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
    elements.semesterFilter.value = 'all';
    elements.categoryFilter.value = 'all';
    elements.searchInput.value = '';
    elements.clearBtn.style.display = 'none';
    state.currentFilters = {
        semester: 'all',
        category: 'all',
        search: ''
    };
    state.currentPage = 1;
    updateUrl();
};

// Download resource handler
window.downloadResource = function (driveLink) {
    try {
        // Check if it's a folder link
        const folderIdMatch = driveLink.match(/\/folders\/([a-zA-Z0-9_-]+)/);
        if (folderIdMatch) {
            // Open the original folder link in a new tab
            window.open(driveLink, '_blank');
            return;
        }

        // Check if it's a file link
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

// Share book handler
window.shareBook = function (bookId, bookName) {
    const bookUrl = `${window.location.origin}/book/${bookId}`;
    
    if (navigator.share) {
        // Use native Web Share API if available
        navigator.share({
            title: bookName,
            text: `Check out this book: ${bookName}`,
            url: bookUrl
        }).catch(error => {
            console.log('Error sharing:', error);
            fallbackShare(bookUrl, bookName);
        });
    } else {
        fallbackShare(bookUrl, bookName);
    }
};

// Fallback share function
function fallbackShare(url, title) {
    if (navigator.clipboard) {
        navigator.clipboard.writeText(url).then(() => {
            showSuccessMessage(`Link copied to clipboard: ${title}`);
        }).catch(() => {
            promptCopy(url);
        });
    } else {
        promptCopy(url);
    }
}

// Prompt user to copy manually
function promptCopy(url) {
    const textArea = document.createElement('textarea');
    textArea.value = url;
    document.body.appendChild(textArea);
    textArea.select();
    try {
        document.execCommand('copy');
        showSuccessMessage('Link copied to clipboard!');
    } catch (err) {
        console.error('Failed to copy: ', err);
        showError('Failed to copy link. Please copy manually: ' + url);
    }
    document.body.removeChild(textArea);
}

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

// Show success message
function showSuccessMessage(message) {
    const successElement = document.createElement("div");
    successElement.classList.add("notification", "is-success");
    successElement.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        background: var(--success);
        color: white;
        padding: 1rem 2rem;
        border-radius: 8px;
        box-shadow: 0 4px 20px rgba(0, 0, 0, 0.3);
        z-index: 10000;
        animation: slideInRight 0.3s ease;
    `;
    successElement.innerHTML = `
        <div style="display: flex; align-items: center; gap: 0.5rem;">
            <i class="fas fa-check-circle"></i>
            <span>${message}</span>
            <button onclick="this.parentElement.parentElement.remove()" style="background: none; border: none; color: white; font-size: 1.2rem; cursor: pointer; margin-left: 1rem;">&times;</button>
        </div>
    `;
    document.body.appendChild(successElement);
    setTimeout(() => {
        if (successElement.parentNode) {
            successElement.remove();
        }
    }, 5000);
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