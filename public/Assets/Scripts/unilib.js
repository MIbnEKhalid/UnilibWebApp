/**
 * Unilib - Academic Interactive Catalog & Client Engine
 * Core utilities: Grid/List Switcher, Semester Tabs, Quick View Modal, Toast, Sharing, and Filter Sync
 */

// Global Application State
const state = {
  currentFilters: {
    semester: window.DEFAULT_SEMESTER || 'Semester 1',
    category: 'all',
    search: ''
  },
  currentPage: 1,
  viewMode: localStorage.getItem('unilib_view_mode') || 'grid'
};

// DOM Elements Cache
const elements = {
  get searchInput() { return document.getElementById("searchProduct"); },
  get categoryFilter() { return document.getElementById("categoryFilter"); },
  get clearBtn() { return document.getElementById("clearSearch"); },
  get submitBtn() { return document.getElementById("searchSubmit") || document.querySelector(".submit-btn"); },
  get catalogContainer() { return document.getElementById("catalogContainer"); },
  get quickViewModal() { return document.getElementById("quickViewBackdrop"); }
};

// Initialize Engine on DOM Ready
document.addEventListener("DOMContentLoaded", () => {
  parseUrlParameters();
  initViewMode();
  setupEventListeners();
  initChapterSearch();
  initHeaderAndScroll();
});

// Parse URL Parameters & Sync with UI
function parseUrlParameters() {
  const urlParams = new URLSearchParams(window.location.search);
  const defSem = window.DEFAULT_SEMESTER || 'Semester 1';

  state.currentPage = parseInt(urlParams.get('page'), 10) || 1;
  const semesterParam = urlParams.get('semester');
  state.currentFilters.semester = semesterParam 
    ? (semesterParam.includes(',') ? semesterParam.split(',').map(s => s.trim()) : semesterParam) 
    : defSem;
  state.currentFilters.category = urlParams.get('category') || 'all';
  state.currentFilters.search = urlParams.get('search') || '';

  // Sync Semester Tabstrip
  const activeSem = Array.isArray(state.currentFilters.semester) ? state.currentFilters.semester[0] : state.currentFilters.semester;
  const normActive = normalizeSemesterStr(activeSem);
  document.querySelectorAll('.semester-tab').forEach(tab => {
    const tabVal = tab.dataset.semester;
    const normTab = normalizeSemesterStr(tabVal);
    tab.classList.toggle('active', normTab === normActive || (tabVal === 'all' && (normActive === 'all' || !normActive)));
  });

  if (elements.categoryFilter) elements.categoryFilter.value = state.currentFilters.category;
  if (elements.searchInput && state.currentFilters.search) {
    elements.searchInput.value = state.currentFilters.search;
    if (elements.clearBtn) elements.clearBtn.style.display = 'flex';
  }
}

function normalizeSemesterStr(str) {
  return str ? String(str).toLowerCase().replace(/\s+/g, '') : '';
}

// Layout Switcher: Grid vs Table/List View
function initViewMode() {
  setViewMode(state.viewMode, false);
}

window.setViewMode = function(mode, save = true) {
  state.viewMode = mode;
  if (save) localStorage.setItem('unilib_view_mode', mode);

  const container = document.getElementById("catalogContainer");
  if (container) {
    container.classList.remove('view-grid', 'view-list');
    container.classList.add(mode === 'list' ? 'view-list' : 'view-grid');
  }

  const gridBtn = document.getElementById("viewGridBtn");
  const listBtn = document.getElementById("viewListBtn");
  if (gridBtn && listBtn) {
    const isList = mode === 'list';
    listBtn.classList.toggle('bg-[#f0f4f9]', isList);
    listBtn.classList.toggle('text-[#162e4a]', isList);
    listBtn.classList.toggle('border-[#bad0e4]', isList);
    listBtn.classList.toggle('text-stone-500', !isList);
    listBtn.classList.toggle('border-transparent', !isList);

    gridBtn.classList.toggle('bg-[#f0f4f9]', !isList);
    gridBtn.classList.toggle('text-[#162e4a]', !isList);
    gridBtn.classList.toggle('border-[#bad0e4]', !isList);
    gridBtn.classList.toggle('text-stone-500', isList);
    gridBtn.classList.toggle('border-transparent', isList);
  }
};

// Semester Tabstrip 1-Click Selection
window.selectSemesterTab = function(semesterValue) {
  state.currentFilters.semester = semesterValue;
  state.currentPage = 1;
  if (elements.categoryFilter) state.currentFilters.category = elements.categoryFilter.value;
  if (elements.searchInput) state.currentFilters.search = elements.searchInput.value.toLowerCase().trim();
  updateUrl();
};

// URL Navigation Handler
function updateUrl() {
  const urlParams = new URLSearchParams();
  if (state.currentPage > 1) urlParams.set('page', state.currentPage);
  if (state.currentFilters.semester) {
    const semVal = Array.isArray(state.currentFilters.semester) 
      ? state.currentFilters.semester.join(',') 
      : state.currentFilters.semester;
    urlParams.set('semester', semVal);
  }
  if (state.currentFilters.category && state.currentFilters.category !== 'all') {
    urlParams.set('category', state.currentFilters.category);
  }
  if (state.currentFilters.search) {
    urlParams.set('search', state.currentFilters.search);
  }

  const queryString = urlParams.toString();
  window.location.href = `${window.location.pathname}${queryString ? '?' + queryString : ''}`;
}

// Setup Event Listeners
function setupEventListeners() {
  const sInput = elements.searchInput;
  if (sInput) {
    sInput.addEventListener("input", debounce(filterProducts, 350));
    sInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        filterProducts(e);
      }
    });
  }

  if (elements.categoryFilter) {
    elements.categoryFilter.addEventListener("change", filterProducts);
  }

  if (elements.clearBtn) {
    elements.clearBtn.addEventListener("click", clearSearch);
  }

  if (elements.submitBtn) {
    elements.submitBtn.addEventListener('click', (e) => {
      e.preventDefault();
      filterProducts(e);
    });
  }

  // Keyboard shortcut '/' to focus search bar, 'Escape' to close modal
  document.addEventListener('keydown', (e) => {
    if (e.key === '/' && document.activeElement !== elements.searchInput && !['INPUT', 'TEXTAREA', 'SELECT'].includes(document.activeElement.tagName)) {
      e.preventDefault();
      if (elements.searchInput) {
        elements.searchInput.focus();
        elements.searchInput.select();
      }
    }
    if (e.key === 'Escape') {
      closeQuickView();
    }
  });

  window.addEventListener('popstate', () => {
    parseUrlParameters();
    window.location.reload();
  });
}

// Filter Products Handler
window.filterProducts = function(e) {
  if (e && e.preventDefault) e.preventDefault();
  state.currentPage = 1;

  if (elements.categoryFilter) state.currentFilters.category = elements.categoryFilter.value;
  if (elements.searchInput) {
    state.currentFilters.search = elements.searchInput.value.toLowerCase().trim();
    if (elements.clearBtn) {
      elements.clearBtn.style.display = state.currentFilters.search.length > 0 ? 'flex' : 'none';
    }
  }

  updateUrl();
};

// Clear Search Input
window.clearSearch = function() {
  if (elements.searchInput) {
    elements.searchInput.value = '';
    state.currentFilters.search = '';
  }
  if (elements.clearBtn) elements.clearBtn.style.display = 'none';
  filterProducts();
};

window.goToPage = function(page) {
  state.currentPage = page;
  updateUrl();
};

window.resetFilters = function() {
  if (elements.categoryFilter) elements.categoryFilter.value = 'all';
  if (elements.searchInput) elements.searchInput.value = '';
  if (elements.clearBtn) elements.clearBtn.style.display = 'none';
  state.currentFilters = { semester: 'all', category: 'all', search: '' };
  state.currentPage = 1;
  updateUrl();
};

// Semester Badge Formatter Utility
window.formatSemesterBadge = function(sem) {
  if (!sem) return '';
  let arr = sem;
  if (typeof sem === 'string') {
    if (sem.toLowerCase() === 'all') return 'All Semesters';
    try {
      const p = JSON.parse(sem);
      arr = Array.isArray(p) ? p : sem.split(',').map(s => s.trim()).filter(Boolean);
    } catch {
      arr = sem.split(',').map(s => s.trim()).filter(Boolean);
    }
  }
  if (!Array.isArray(arr) || arr.length === 0) return sem || '';
  if (arr.some(s => String(s).toLowerCase() === 'all') || arr.length >= 8) return 'All Semesters';

  const nums = arr
    .map(s => {
      const m = String(s).match(/\d+/);
      return m ? parseInt(m[0], 10) : null;
    })
    .filter(n => n !== null && !isNaN(n))
    .sort((a, b) => a - b);

  if (nums.length === 0) return Array.isArray(arr) ? arr.join(', ') : String(arr);

  const ranges = [];
  let start = nums[0];
  let prev = nums[0];

  for (let i = 1; i < nums.length; i++) {
    const curr = nums[i];
    if (curr === prev + 1) {
      prev = curr;
    } else {
      ranges.push(start === prev ? String(start) : prev === start + 1 ? `${start}, ${prev}` : `${start}–${prev}`);
      start = prev = curr;
    }
  }
  ranges.push(start === prev ? String(start) : prev === start + 1 ? `${start}, ${prev}` : `${start}–${prev}`);
  return `Sem ${ranges.join(', ')}`;
};

// Quick-View Modal
window.openQuickView = function(bookId, name, description, imageURL, link, category, semester, views) {
  const modalBackdrop = document.getElementById("quickViewBackdrop");
  if (!modalBackdrop) return;

  const qvTitle = document.getElementById("qvTitle");
  const qvDesc = document.getElementById("qvDescription");
  const qvCover = document.getElementById("qvCover");
  const qvCategory = document.getElementById("qvCategory");
  const qvSemester = document.getElementById("qvSemester");
  const qvViews = document.getElementById("qvViews");
  const qvReadLink = document.getElementById("qvReadLink");
  const qvDownloadBtn = document.getElementById("qvDownloadBtn");
  const qvFullPageLink = document.getElementById("qvFullPageLink");
  const qvCoverBlur = document.getElementById("qvCoverBlur");

  const coverSrc = imageURL || '/BookCovers/BookCover_Template.webp';

  if (qvTitle) qvTitle.textContent = name;
  if (qvDesc) qvDesc.textContent = description;
  if (qvCover) qvCover.src = coverSrc;
  if (qvCoverBlur) qvCoverBlur.style.backgroundImage = `url('${coverSrc}')`;
  if (qvCategory) qvCategory.textContent = category || 'CourseBooks';
  if (qvSemester) qvSemester.textContent = formatSemesterBadge(semester);
  if (qvViews) qvViews.textContent = `${views || 0} views`;

  if (qvReadLink) qvReadLink.onclick = () => trackView(bookId, link);
  if (qvDownloadBtn) qvDownloadBtn.onclick = () => downloadResource(link, bookId);
  if (qvFullPageLink) qvFullPageLink.href = `/book/${bookId}`;

  modalBackdrop.style.display = 'flex';
  document.body.style.overflow = 'hidden';
};

window.closeQuickView = function() {
  const modalBackdrop = document.getElementById("quickViewBackdrop");
  if (modalBackdrop) {
    modalBackdrop.style.display = 'none';
    document.body.style.overflow = '';
  }
};

// Citation & Sharing
window.copyCitation = function(title, description, bookId) {
  const url = `${window.location.origin}/book/${bookId}`;
  copyToClipboard(`"${title}" - ${description}. Available online at Unilib: ${url}`, "Academic citation copied to clipboard!");
};

window.shareBook = function(bookId, bookName) {
  const bookUrl = `${window.location.origin}/book/${bookId}`;
  if (navigator.share) {
    navigator.share({
      title: bookName,
      text: `Course material on Unilib: "${bookName}"`,
      url: bookUrl
    }).catch(() => copyToClipboard(bookUrl, `Link copied for "${bookName}"!`));
  } else {
    copyToClipboard(bookUrl, `Link copied for "${bookName}"!`);
  }
};

function copyToClipboard(text, message) {
  if (navigator.clipboard && window.isSecureContext) {
    navigator.clipboard.writeText(text)
      .then(() => showToast(message || "Copied to clipboard!", "success"))
      .catch(() => fallbackPromptCopy(text));
  } else {
    fallbackPromptCopy(text);
  }
}

function fallbackPromptCopy(text) {
  const textArea = document.createElement('textarea');
  textArea.value = text;
  textArea.style.position = 'fixed';
  textArea.style.opacity = '0';
  document.body.appendChild(textArea);
  textArea.focus();
  textArea.select();
  try {
    document.execCommand('copy');
    showToast('Copied to clipboard!', 'success');
  } catch {
    prompt('Copy this text:', text);
  }
  document.body.removeChild(textArea);
}

// In-book chapter search
function initChapterSearch() {
  const chapterSearchInput = document.getElementById("chapterSearchInput");
  if (chapterSearchInput) {
    chapterSearchInput.addEventListener("input", (e) => {
      const q = e.target.value.toLowerCase().trim();
      document.querySelectorAll(".chapter-row-item").forEach(row => {
        const title = (row.querySelector(".chapter-title")?.textContent || '').toLowerCase();
        row.style.display = title.includes(q) ? 'flex' : 'none';
      });
    });
  }
}

// Tracking & Downloads
async function postTrack(endpoint) {
  try {
    await fetch(endpoint, { method: 'POST', headers: { 'Content-Type': 'application/json' } });
  } catch (err) {
    console.warn('Track error:', err);
  }
}

window.trackView = function(bookId, originalUrl) {
  postTrack(`/api/book/${bookId}/view`);
  window.open(originalUrl, '_blank');
};

window.downloadResource = function(driveLink, bookId = null) {
  try {
    if (bookId) postTrack(`/api/book/${bookId}/download`);

    const folderIdMatch = driveLink.match(/\/folders\/([a-zA-Z0-9_-]+)/);
    if (folderIdMatch) {
      window.open(driveLink, '_blank');
      return;
    }

    const fileIdMatch = driveLink.match(/\/d\/([a-zA-Z0-9_-]+)/) || driveLink.match(/id=([a-zA-Z0-9_-]+)/);
    const fileId = fileIdMatch ? fileIdMatch[1] : null;

    window.open(fileId ? `https://drive.usercontent.google.com/uc?id=${fileId}&export=download` : driveLink, '_blank');
    showToast("Starting download...", "info");
  } catch (err) {
    console.error("Download error:", err);
    showToast("Failed to initiate download.", "error");
  }
};

// Global Toast Notification Manager
window.showToast = function(message, type = 'info') {
  let toastContainer = document.getElementById('toastContainer');
  if (!toastContainer) {
    toastContainer = document.createElement('div');
    toastContainer.id = 'toastContainer';
    toastContainer.className = 'fixed top-4 right-4 z-[9999] flex flex-col gap-2 pointer-events-none max-w-sm w-full px-3';
    document.body.appendChild(toastContainer);
  }

  const icons = {
    success: '<i class="fas fa-check-circle text-emerald-600 text-sm"></i>',
    error: '<i class="fas fa-exclamation-circle text-rose-600 text-sm"></i>',
    info: '<i class="fas fa-info-circle text-blue-600 text-sm"></i>'
  };

  const borders = {
    success: 'border-emerald-200 text-slate-800',
    error: 'border-rose-200 text-slate-800',
    info: 'border-slate-200 text-slate-800 shadow-slate-200'
  };

  const toast = document.createElement('div');
  toast.className = `pointer-events-auto flex items-center gap-2.5 p-3.5 rounded-lg shadow-lg border text-sm font-medium transition-all duration-200 transform translate-x-full opacity-0 bg-white ${borders[type] || borders.info}`;
  toast.innerHTML = `
    <div class="flex-shrink-0">${icons[type] || icons.info}</div>
    <div class="flex-1 text-xs sm:text-sm font-medium leading-tight">${message}</div>
    <button type="button" class="text-slate-400 hover:text-slate-700 transition-colors p-1" aria-label="Close">
      <i class="fas fa-times text-xs"></i>
    </button>
  `;

  toastContainer.appendChild(toast);
  requestAnimationFrame(() => {
    toast.classList.remove('translate-x-full', 'opacity-0');
    toast.classList.add('translate-x-0', 'opacity-100');
  });

  const dismiss = () => {
    toast.classList.remove('translate-x-0', 'opacity-100');
    toast.classList.add('translate-x-full', 'opacity-0');
    setTimeout(() => { if (toast.parentNode) toast.parentNode.removeChild(toast); }, 200);
  };

  toast.querySelector('button').addEventListener('click', dismiss);
  setTimeout(dismiss, 4000);
};

window.showSuccessMessage = (msg) => showToast(msg, 'success');
window.showError = (msg) => showToast(msg, 'error');

// Header Mobile Toggle & Scroll to Top
function initHeaderAndScroll() {
  const mobileToggle = document.getElementById('mobileMenuToggle');
  const mobileDrawer = document.getElementById('mobileDrawer');
  const menuIcon = document.getElementById('menuIcon');

  if (mobileToggle && mobileDrawer) {
    mobileToggle.addEventListener('click', () => {
      const isHidden = mobileDrawer.classList.contains('hidden');
      mobileDrawer.classList.toggle('hidden', !isHidden);
      if (menuIcon) menuIcon.className = isHidden ? 'fas fa-times text-sm' : 'fas fa-bars text-sm';
    });
  }

  const scrollBtn = document.getElementById('scrollToTopBtn');
  if (scrollBtn) {
    window.addEventListener('scroll', () => {
      const show = window.scrollY > 200;
      scrollBtn.classList.toggle('opacity-100', show);
      scrollBtn.classList.toggle('pointer-events-auto', show);
      scrollBtn.classList.toggle('translate-y-0', show);
      scrollBtn.classList.toggle('opacity-0', !show);
      scrollBtn.classList.toggle('pointer-events-none', !show);
      scrollBtn.classList.toggle('translate-y-3', !show);
    });

    scrollBtn.addEventListener('click', () => window.scrollTo({ top: 0, behavior: 'smooth' }));
  }
}

// Shared Subject Filtering Engine for Materials & Admin
window.initSubjectFilterEngine = function({
  containerSelector = '#subjects-view',
  cardSelector = '.subject-card',
  tabsContainerSelector = '#subjectSemesterTabs',
  searchInputId = 'subjectSearch',
  searchClearId = 'subjectSearchClear',
  counterId = 'subjectVisibleCount',
  noResultsId = 'noSubjectsFiltered',
  defaultSemester = window.DEFAULT_SEMESTER || 'Semester 1'
} = {}) {
  const urlParams = new URLSearchParams(window.location.search);
  let activeSemester = urlParams.get('semester') || defaultSemester;

  function filter() {
    const searchInput = document.getElementById(searchInputId);
    const searchClear = document.getElementById(searchClearId);
    const q = searchInput ? searchInput.value.trim().toLowerCase() : '';
    const normActive = normalizeSemesterStr(activeSemester);
    let visibleCount = 0;

    document.querySelectorAll(cardSelector).forEach(card => {
      const title = (card.querySelector('.subject-title')?.textContent || '').toLowerCase();
      const courseId = (card.dataset.courseid || '').toLowerCase();
      const sem = card.dataset.semester || 'Semester 1';
      const normCardSem = normalizeSemesterStr(sem);

      const matchSearch = !q || title.includes(q) || courseId.includes(q);
      const matchSemester = normActive === 'all' || normCardSem === normActive;
      const isVisible = matchSearch && matchSemester;

      card.style.display = isVisible ? '' : 'none';
      if (isVisible) visibleCount++;
    });

    if (searchClear) searchClear.style.display = q ? 'flex' : 'none';
    const counter = document.getElementById(counterId);
    if (counter) counter.textContent = visibleCount;
    const noResults = document.getElementById(noResultsId);
    if (noResults) noResults.style.display = visibleCount === 0 ? 'block' : 'none';
  }

  function setSemester(sem, updateUrl = true) {
    activeSemester = sem;
    const normActive = normalizeSemesterStr(activeSemester);

    document.querySelectorAll(`${tabsContainerSelector} .semester-tab`).forEach(tab => {
      const tabSem = tab.dataset.semester;
      const normTab = normalizeSemesterStr(tabSem);
      tab.classList.toggle('active', normTab === normActive || (tabSem === 'all' && normActive === 'all'));
    });

    if (updateUrl && window.history && window.history.replaceState) {
      const url = new URL(window.location);
      if (normActive === 'all') url.searchParams.delete('semester');
      else url.searchParams.set('semester', activeSemester);
      window.history.replaceState({}, '', url);
    }

    filter();
  }

  setSemester(activeSemester, false);

  const searchInput = document.getElementById(searchInputId);
  const searchClear = document.getElementById(searchClearId);
  if (searchInput) searchInput.addEventListener('input', filter);
  if (searchClear) searchClear.addEventListener('click', () => {
    searchInput.value = '';
    filter();
  });

  return { filter, setSemester };
};

function debounce(func, wait) {
  let timeout;
  return function(...args) {
    clearTimeout(timeout);
    timeout = setTimeout(() => func.apply(this, args), wait);
  };
}