/**
 * Unilib Clean & Intuitive PDF Chapter Slicer
 * Simple 2-click flow: click Start, click End. No clutter.
 */
(function () {
  const PDFJS_CDN_URL = "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js";
  const PDFJS_WORKER_URL = "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js";

  let pdfJsLoadPromise = null;

  function ensurePdfJsLoaded() {
    if (window.pdfjsLib) {
      window.pdfjsLib.GlobalWorkerOptions.workerSrc = PDFJS_WORKER_URL;
      return Promise.resolve(window.pdfjsLib);
    }
    if (pdfJsLoadPromise) return pdfJsLoadPromise;

    pdfJsLoadPromise = new Promise((resolve, reject) => {
      const script = document.createElement("script");
      script.src = PDFJS_CDN_URL;
      script.async = true;
      script.onload = () => {
        if (window.pdfjsLib) {
          window.pdfjsLib.GlobalWorkerOptions.workerSrc = PDFJS_WORKER_URL;
          resolve(window.pdfjsLib);
        } else {
          reject(new Error("PDF.js loaded but pdfjsLib global was not found."));
        }
      };
      script.onerror = () => reject(new Error("Failed to load PDF.js from CDN."));
      document.head.appendChild(script);
    });

    return pdfJsLoadPromise;
  }

  function escapeHtml(str) {
    return String(str || "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  class UnilibPdfSlicer {
    constructor(options) {
      this.root = typeof options.root === "string" ? document.querySelector(options.root) : options.root;
      if (!this.root) return;

      this.resourceId = options.resourceId || null;
      this.pdfUrl = options.pdfUrl || null;
      this.pdfInfoUrl = options.pdfInfoUrl || null;
      this.onChange = typeof options.onChange === "function" ? options.onChange : null;

      this.slices = [];
      this.activeSliceIndex = 0;
      this.targetStep = "start"; // "start" or "end"
      this.pageCount = 0;
      this.pdfDoc = null;
      this.cardSize = options.defaultCardSize || "medium";
      this.renderedPages = new Set();
      this.renderingPages = new Map();
      this.inspectModalPage = 1;

      this.cacheElements();
      this.bindEvents();
      this.initSlices(options.initialSlices || []);

      if (this.pdfUrl || this.pdfInfoUrl) {
        this.loadPdf(this.pdfUrl, this.pdfInfoUrl);
      }
    }

    cacheElements() {
      this.elSliceList = this.root.querySelector("[data-slicer-slice-list]");
      this.elPageGrid = this.root.querySelector("[data-slicer-page-grid]");
      this.elPageCount = this.root.querySelector("[data-slicer-page-count]");
      this.elLoading = this.root.querySelector("[data-slicer-loading]");
      this.elLoadingText = this.root.querySelector("[data-slicer-loading-text]");
      this.elAddSlice = this.root.querySelector("[data-slicer-add-slice]");
      this.elAddNext = this.root.querySelector("[data-slicer-add-next]");
      this.elSizeSelect = this.root.querySelector("[data-slicer-size-select]");

      // Active Chapter Control Bar Elements
      this.elActiveTitle = document.getElementById("slicerActiveTitleInput");
      this.elActiveDrive = document.getElementById("slicerActiveDriveInput");
      this.elBtnPickStart = document.getElementById("slicerBtnPickStart");
      this.elValStart = document.getElementById("slicerValStart");
      this.elBtnPickEnd = document.getElementById("slicerBtnPickEnd");
      this.elValEnd = document.getElementById("slicerValEnd");
      this.elValSpan = document.getElementById("slicerValSpan");
      this.elStatusHint = document.getElementById("slicerActiveStatusHint");

      // Zoom Modal Elements
      this.elModal = document.getElementById("slicerInspectModal");
      this.elModalCanvas = document.getElementById("slicerInspectCanvas");
      this.elModalTitle = document.getElementById("slicerInspectTitle");
      this.elModalPrev = document.getElementById("slicerInspectPrev");
      this.elModalNext = document.getElementById("slicerInspectNext");
      this.elModalSetStart = document.getElementById("slicerInspectSetStart");
      this.elModalSetEnd = document.getElementById("slicerInspectSetEnd");
      this.elModalClose = document.getElementById("slicerInspectClose");
    }

    bindEvents() {
      if (this.elAddSlice) {
        this.elAddSlice.addEventListener("click", () => this.addChapter(false));
      }
      if (this.elAddNext) {
        this.elAddNext.addEventListener("click", () => this.addChapter(true));
      }

      if (this.elBtnPickStart) {
        this.elBtnPickStart.addEventListener("click", () => {
          this.targetStep = "start";
          this.updateActiveBar();
        });
      }

      if (this.elBtnPickEnd) {
        this.elBtnPickEnd.addEventListener("click", () => {
          this.targetStep = "end";
          this.updateActiveBar();
        });
      }

      if (this.elActiveTitle) {
        this.elActiveTitle.addEventListener("input", (e) => {
          const active = this.getActiveSlice();
          if (active) {
            active.title = e.target.value;
            this.renderSidebar();
            if (this.onChange) this.onChange(this.getSlices());
          }
        });
      }

      if (this.elActiveDrive) {
        this.elActiveDrive.addEventListener("input", (e) => {
          const active = this.getActiveSlice();
          if (active) {
            active.drive_url = e.target.value.trim() || null;
            if (this.onChange) this.onChange(this.getSlices());
          }
        });
      }

      if (this.elSizeSelect) {
        this.elSizeSelect.addEventListener("change", (e) => {
          this.setCardSize(e.target.value);
        });
      }

      // Modal Events
      if (this.elModal) {
        if (this.elModalClose) {
          this.elModalClose.addEventListener("click", () => this.closeModal());
        }
        this.elModal.addEventListener("click", (e) => {
          if (e.target === this.elModal) this.closeModal();
        });
        if (this.elModalPrev) {
          this.elModalPrev.addEventListener("click", () => {
            if (this.inspectModalPage > 1) this.openModal(this.inspectModalPage - 1);
          });
        }
        if (this.elModalNext) {
          this.elModalNext.addEventListener("click", () => {
            if (this.inspectModalPage < this.pageCount) this.openModal(this.inspectModalPage + 1);
          });
        }
        if (this.elModalSetStart) {
          this.elModalSetStart.addEventListener("click", () => {
            this.assignPage(this.inspectModalPage, "start");
            this.updateModalTitle();
          });
        }
        if (this.elModalSetEnd) {
          this.elModalSetEnd.addEventListener("click", () => {
            this.assignPage(this.inspectModalPage, "end");
            this.updateModalTitle();
          });
        }
      }
    }

    initSlices(initialSlices) {
      if (Array.isArray(initialSlices) && initialSlices.length > 0) {
        this.slices = initialSlices.map((s, idx) => {
          const start = Math.max(1, parseInt(s.start_page || s.startPage || 1, 10) || 1);
          const end = Math.max(start, parseInt(s.end_page || s.endPage || start, 10) || start);
          return {
            id: s.id || `sec-${idx + 1}`,
            title: s.title || `Chapter ${idx + 1}`,
            start_page: start,
            end_page: end,
            drive_url: s.drive_url ? String(s.drive_url).trim() : null,
          };
        });
      } else {
        this.slices = [
          {
            id: "sec-1",
            title: "Chapter 1",
            start_page: 1,
            end_page: 1,
            drive_url: null,
          },
        ];
      }
      this.activeSliceIndex = 0;
      this.targetStep = "start";
      this.syncAll();
    }

    getActiveSlice() {
      if (this.activeSliceIndex >= 0 && this.activeSliceIndex < this.slices.length) {
        return this.slices[this.activeSliceIndex];
      }
      return null;
    }

    getSlices() {
      return this.slices.map((s, idx) => ({
        id: s.id || `sec-${idx + 1}`,
        title: (s.title || `Chapter ${idx + 1}`).trim(),
        start_page: Math.max(1, parseInt(s.start_page, 10) || 1),
        end_page: Math.max(1, parseInt(s.end_page, 10) || 1),
        drive_url: s.drive_url ? String(s.drive_url).trim() : null,
      }));
    }

    setLoading(isLoading, msg = "Loading PDF pages...") {
      if (!this.elLoading) return;
      this.elLoading.style.display = isLoading ? "flex" : "none";
      if (this.elLoadingText) this.elLoadingText.textContent = msg;
    }

    async loadPdf(pdfUrl, pdfInfoUrl) {
      this.setLoading(true, "Loading PDF pages...");

      if (pdfInfoUrl) {
        fetch(pdfInfoUrl, { headers: { Accept: "application/json" } })
          .then((r) => (r.ok ? r.json() : null))
          .then((payload) => {
            const count = payload?.data?.pageCount || payload?.pageCount || 0;
            if (count > 0 && this.pageCount === 0) {
              this.pageCount = count;
              this.buildPageGrid(count);
            }
          })
          .catch(() => {});
      }

      if (pdfUrl) {
        try {
          const pdfjsLib = await ensurePdfJsLoaded();
          const task = pdfjsLib.getDocument({ url: pdfUrl, withCredentials: true });
          const doc = await task.promise;
          this.pdfDoc = doc;
          if (this.pageCount !== doc.numPages) {
            this.pageCount = doc.numPages;
            this.buildPageGrid(doc.numPages);
          }
          this.setupLazyRendering();
          this.setLoading(false);
        } catch (err) {
          console.warn("[PDF Slicer] PDF render notice:", err);
          this.setLoading(false);
        }
      }
    }

    setCardSize(size) {
      this.cardSize = size;
      if (!this.elPageGrid) return;
      this.elPageGrid.setAttribute("data-card-size", size);
      if (size === "large") {
        this.renderedPages.clear();
        this.setupLazyRendering();
      }
    }

    buildPageGrid(totalPages) {
      if (!this.elPageGrid) return;
      if (this.elPageCount) {
        this.elPageCount.textContent = `${totalPages} Pages`;
      }

      this.elPageGrid.setAttribute("data-card-size", this.cardSize);
      const frag = document.createDocumentFragment();

      for (let pageNum = 1; pageNum <= totalPages; pageNum++) {
        const card = document.createElement("div");
        card.className = "slicer-card";
        card.setAttribute("data-page-number", String(pageNum));
        card.innerHTML = `
          <div class="slicer-card-view">
            <canvas class="slicer-card-canvas"></canvas>
            <div class="slicer-card-placeholder">p. ${pageNum}</div>
            <div class="slicer-card-ribbon" data-ribbon></div>
            <div class="slicer-card-hover-actions">
              <button type="button" class="slicer-card-hover-btn is-start" data-action="set-start">Set Start</button>
              <button type="button" class="slicer-card-hover-btn is-end" data-action="set-end">Set End</button>
              <button type="button" class="slicer-card-hover-btn is-zoom" data-action="zoom" title="Zoom In">&#x1F50D;</button>
            </div>
          </div>
          <div class="slicer-card-footer">
            <span class="slicer-card-num">Page ${pageNum}</span>
            <span class="slicer-card-tag" data-tag></span>
          </div>
        `;

        card.addEventListener("click", (e) => {
          const actionBtn = e.target.closest("[data-action]");
          const action = actionBtn ? actionBtn.getAttribute("data-action") : null;

          if (action === "zoom") {
            e.stopPropagation();
            this.openModal(pageNum);
          } else if (action === "set-start") {
            e.stopPropagation();
            this.assignPage(pageNum, "start");
          } else if (action === "set-end") {
            e.stopPropagation();
            this.assignPage(pageNum, "end");
          } else {
            // Clicking anywhere on page card applies current target step
            this.assignPage(pageNum, this.targetStep);
          }
        });

        frag.appendChild(card);
      }

      this.elPageGrid.innerHTML = "";
      this.elPageGrid.appendChild(frag);
      this.highlightGrid();
    }

    setupLazyRendering() {
      if (!this.pdfDoc || !this.elPageGrid) return;
      if (this.pageObserver) this.pageObserver.disconnect();

      this.pageObserver = new IntersectionObserver(
        (entries) => {
          entries.forEach((entry) => {
            if (entry.isIntersecting) {
              const card = entry.target;
              const pageNum = parseInt(card.getAttribute("data-page-number"), 10);
              if (pageNum && !this.renderedPages.has(pageNum)) {
                this.renderPageCanvas(card, pageNum);
              }
            }
          });
        },
        { rootMargin: "300px 0px", threshold: 0.01 }
      );

      this.elPageGrid.querySelectorAll(".slicer-card").forEach((c) => this.pageObserver.observe(c));
    }

    async renderPageCanvas(card, pageNum) {
      if (!this.pdfDoc || this.renderedPages.has(pageNum) || this.renderingPages.has(pageNum)) return;

      const canvas = card.querySelector(".slicer-card-canvas");
      const placeholder = card.querySelector(".slicer-card-placeholder");
      if (!canvas) return;

      const renderPromise = (async () => {
        try {
          const page = await this.pdfDoc.getPage(pageNum);
          const desiredWidth = this.cardSize === "large" ? 340 : this.cardSize === "compact" ? 160 : 230;
          const unscaled = page.getViewport({ scale: 1 });
          const scale = desiredWidth / unscaled.width;
          const viewport = page.getViewport({ scale });

          canvas.width = Math.floor(viewport.width);
          canvas.height = Math.floor(viewport.height);

          const ctx = canvas.getContext("2d", { alpha: false });
          await page.render({ canvasContext: ctx, viewport }).promise;

          this.renderedPages.add(pageNum);
          card.classList.add("is-rendered");
          if (placeholder) placeholder.style.display = "none";
        } catch (err) {
        } finally {
          this.renderingPages.delete(pageNum);
        }
      })();

      this.renderingPages.set(pageNum, renderPromise);
      return renderPromise;
    }

    assignPage(pageNum, step) {
      const active = this.getActiveSlice();
      if (!active) return;

      if (step === "start") {
        active.start_page = pageNum;
        if (active.end_page < pageNum) {
          active.end_page = pageNum;
        }
        // Naturally progress to End Page selection!
        this.targetStep = "end";
      } else {
        if (pageNum < active.start_page) {
          active.end_page = active.start_page;
          active.start_page = pageNum;
        } else {
          active.end_page = pageNum;
        }
        // After setting end, reset target to start
        this.targetStep = "start";
      }

      this.syncAll();
    }

    addChapter(autoNextPage = false) {
      const nextNum = this.slices.length + 1;
      let startPage = 1;

      if (autoNextPage && this.slices.length > 0) {
        const last = this.slices[this.slices.length - 1];
        startPage = (parseInt(last.end_page, 10) || 1) + 1;
        if (this.pageCount > 0 && startPage > this.pageCount) {
          startPage = this.pageCount;
        }
      }

      this.slices.push({
        id: `sec-${nextNum}`,
        title: `Chapter ${nextNum}`,
        start_page: startPage,
        end_page: startPage,
        drive_url: null,
      });

      this.activeSliceIndex = this.slices.length - 1;
      this.targetStep = "start";
      this.syncAll();
      this.scrollToPage(startPage);
    }

    selectChapter(index) {
      if (index < 0 || index >= this.slices.length) return;
      this.activeSliceIndex = index;
      this.targetStep = "start";
      this.syncAll();

      const active = this.getActiveSlice();
      if (active) this.scrollToPage(active.start_page);
    }

    deleteChapter(index) {
      if (this.slices.length <= 1) {
        // Keep at least 1 slice
        this.slices = [{ id: "sec-1", title: "Chapter 1", start_page: 1, end_page: 1 }];
        this.activeSliceIndex = 0;
        this.targetStep = "start";
        this.syncAll();
        return;
      }

      this.slices.splice(index, 1);
      this.slices.forEach((s, idx) => {
        s.id = `sec-${idx + 1}`;
      });
      if (this.activeSliceIndex >= this.slices.length) {
        this.activeSliceIndex = this.slices.length - 1;
      }
      this.targetStep = "start";
      this.syncAll();
    }

    scrollToPage(pageNum) {
      if (!this.elPageGrid) return;
      const card = this.elPageGrid.querySelector(`.slicer-card[data-page-number="${pageNum}"]`);
      if (card) {
        card.scrollIntoView({ behavior: "smooth", block: "center" });
        card.classList.add("slicer-flash");
        setTimeout(() => card.classList.remove("slicer-flash"), 900);
      }
    }

    syncAll() {
      this.renderSidebar();
      this.updateActiveBar();
      this.highlightGrid();
      if (this.onChange) this.onChange(this.getSlices());
    }

    updateActiveBar() {
      const active = this.getActiveSlice();
      if (!active) return;

      const span = Math.max(1, active.end_page - active.start_page + 1);

      if (this.elActiveTitle) {
        this.elActiveTitle.value = active.title || "";
      }
      if (this.elActiveDrive) {
        this.elActiveDrive.value = active.drive_url || "";
      }
      if (this.elValStart) {
        this.elValStart.textContent = `Page ${active.start_page}`;
      }
      if (this.elValEnd) {
        this.elValEnd.textContent = `Page ${active.end_page}`;
      }
      if (this.elValSpan) {
        this.elValSpan.textContent = `${span} ${span === 1 ? "page" : "pages"}`;
      }

      if (this.elBtnPickStart && this.elBtnPickEnd) {
        this.elBtnPickStart.classList.toggle("is-active-target", this.targetStep === "start");
        this.elBtnPickEnd.classList.toggle("is-active-target", this.targetStep === "end");
      }

      if (this.elStatusHint) {
        if (this.targetStep === "start") {
          this.elStatusHint.innerHTML = `👉 Click any page below to set <strong>Start Page</strong>`;
        } else {
          this.elStatusHint.innerHTML = `👉 Click any page below to set <strong>End Page</strong>`;
        }
      }
    }

    renderSidebar() {
      if (!this.elSliceList) return;
      this.elSliceList.innerHTML = "";

      this.slices.forEach((s, idx) => {
        const isActive = idx === this.activeSliceIndex;
        const span = Math.max(1, s.end_page - s.start_page + 1);

        const row = document.createElement("div");
        row.className = `slicer-chapter-row ${isActive ? "is-active" : ""}`;
        row.innerHTML = `
          <div class="slicer-chapter-info">
            <span class="slicer-chapter-name">${escapeHtml(s.title || `Chapter ${idx + 1}`)}</span>
            <span class="slicer-chapter-range">p. ${s.start_page} &ndash; ${s.end_page} (${span}p)</span>
          </div>
          <button type="button" class="slicer-chapter-del" data-action="del" title="Delete chapter">&times;</button>
        `;

        row.addEventListener("click", (e) => {
          if (e.target.closest('[data-action="del"]')) {
            e.stopPropagation();
            this.deleteChapter(idx);
          } else {
            this.selectChapter(idx);
          }
        });

        this.elSliceList.appendChild(row);
      });
    }

    highlightGrid() {
      if (!this.elPageGrid) return;
      const active = this.getActiveSlice();

      const cards = this.elPageGrid.querySelectorAll(".slicer-card");
      cards.forEach((card) => {
        const pageNum = parseInt(card.getAttribute("data-page-number"), 10);
        const ribbon = card.querySelector("[data-ribbon]");
        const tag = card.querySelector("[data-tag]");

        card.classList.remove("is-start", "is-end", "is-in-range", "is-other");
        if (ribbon) ribbon.innerHTML = "";
        if (tag) tag.innerHTML = "";

        if (active) {
          const isStart = pageNum === active.start_page;
          const isEnd = pageNum === active.end_page;
          const inRange = pageNum >= active.start_page && pageNum <= active.end_page;

          if (inRange) card.classList.add("is-in-range");
          if (isStart) card.classList.add("is-start");
          if (isEnd) card.classList.add("is-end");

          if (ribbon) {
            if (isStart && isEnd) {
              ribbon.innerHTML = `<span class="slicer-ribbon-tag is-both">START &amp; END</span>`;
            } else if (isStart) {
              ribbon.innerHTML = `<span class="slicer-ribbon-tag is-start">START</span>`;
            } else if (isEnd) {
              ribbon.innerHTML = `<span class="slicer-ribbon-tag is-end">END</span>`;
            }
          }
        }

        // Show label if belonging to other chapters
        const others = [];
        this.slices.forEach((s, idx) => {
          if (idx !== this.activeSliceIndex && pageNum >= s.start_page && pageNum <= s.end_page) {
            others.push(s.title || `Ch ${idx + 1}`);
          }
        });

        if (others.length > 0 && !card.classList.contains("is-in-range")) {
          card.classList.add("is-other");
          if (tag) tag.textContent = others.join(", ");
        }
      });
    }

    async openModal(pageNum) {
      if (!this.elModal) return;
      this.inspectModalPage = pageNum;
      this.elModal.classList.add("is-open");
      this.updateModalTitle();

      if (this.pdfDoc && this.elModalCanvas) {
        try {
          const page = await this.pdfDoc.getPage(pageNum);
          const unscaled = page.getViewport({ scale: 1 });
          const scale = Math.min(1.6, 800 / unscaled.width);
          const viewport = page.getViewport({ scale });
          this.elModalCanvas.width = Math.floor(viewport.width);
          this.elModalCanvas.height = Math.floor(viewport.height);
          const ctx = this.elModalCanvas.getContext("2d", { alpha: false });
          await page.render({ canvasContext: ctx, viewport }).promise;
        } catch (err) {}
      }
    }

    updateModalTitle() {
      if (!this.elModalTitle) return;
      const active = this.getActiveSlice();
      const info = active ? `[${active.title}: p.${active.start_page}–${active.end_page}]` : "";
      this.elModalTitle.textContent = `Page ${this.inspectModalPage} of ${this.pageCount || "?"} ${info}`;
    }

    closeModal() {
      if (!this.elModal) return;
      this.elModal.classList.remove("is-open");
    }
  }

  window.UnilibPdfSlicer = UnilibPdfSlicer;
})();
