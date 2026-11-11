/**
 * Unilib Campus Network Verifier
 * Detects whether Google Drive and MBKBucket storage are accessible from the student's network/browser.
 * Sets the 'gdrive_status' cookie so backend routes (/resources/:id/download & /preview,
 * and /resources/:id/sections/:sectionId/download & /preview) can automatically decide
 * whether to route to Google Drive or fallback to high-speed MBKBucket.
 */
(function() {
  var STORAGE_KEY = "unilib_network_probe";

  // Fast synchronous state restoration from cookie or session cache
  try {
    var cookieMatch = document.cookie.match(/(?:^|;\s*)gdrive_status=([^;]*)/);
    var cookieStatus = cookieMatch ? decodeURIComponent(cookieMatch[1]) : null;
    if (cookieStatus === "ok") {
      document.documentElement.classList.add("gdrive-ok");
    } else if (cookieStatus === "blocked") {
      document.documentElement.classList.add("gdrive-blocked");
    } else {
      var cached = JSON.parse(sessionStorage.getItem(STORAGE_KEY) || "null");
      if (cached && (Date.now() - (cached.timestamp || 0) < 900000)) { // 15 min cache
        if (cached.gdrive === true) {
          document.documentElement.classList.add("gdrive-ok");
        } else if (cached.gdrive === false) {
          document.documentElement.classList.add("gdrive-blocked");
        }
        if (cached.mbk === false) {
          document.documentElement.classList.add("mbk-degraded");
        }
      }
    }
  } catch (e) {}

  function setDriveCookie(isBlocked) {
    var val = isBlocked ? "blocked" : "ok";
    document.cookie = "gdrive_status=" + val + "; path=/; max-age=86400; SameSite=Lax";
  }

  function probeGoogleDrive(timeoutMs) {
    return new Promise(function(resolve) {
      var settled = false;
      var finish = function(val) {
        if (!settled) {
          settled = true;
          resolve(val);
        }
      };

      var timer = setTimeout(function() { finish(false); }, timeoutMs);

      try {
        var controller = window.AbortController ? new AbortController() : null;
        if (controller) {
          setTimeout(function() {
            try { controller.abort(); } catch(err) {}
          }, timeoutMs);
        }

        // Test 1: Fetch Google Drive favicon with no-cors
        fetch("https://drive.google.com/favicon.ico?t=" + Date.now(), {
          mode: "no-cors",
          cache: "no-store",
          signal: controller ? controller.signal : undefined
        }).then(function() {
          clearTimeout(timer);
          finish(true);
        }).catch(function() {
          // Test 2: Fallback Image ping on Google static doclist CDN
          var img = new Image();
          img.onload = function() {
            clearTimeout(timer);
            finish(true);
          };
          img.onerror = function() {
            clearTimeout(timer);
            finish(false);
          };
          img.src = "https://ssl.gstatic.com/docs/doclist/images/drive_2022q3_32dp.png?t=" + Date.now();
        });
      } catch (err) {
        clearTimeout(timer);
        finish(false);
      }
    });
  }

  function probeMBKBucket(timeoutMs) {
    return new Promise(function(resolve) {
      var controller = window.AbortController ? new AbortController() : null;
      var timer = setTimeout(function() {
        if (controller) {
          try { controller.abort(); } catch(err) {}
        }
        resolve(false);
      }, timeoutMs);

      fetch("/api/health", {
        cache: "no-store",
        signal: controller ? controller.signal : undefined
      }).then(function(res) {
        clearTimeout(timer);
        resolve(res.ok);
      }).catch(function() {
        clearTimeout(timer);
        resolve(false);
      });
    });
  }

  function updateSliceButtons(gdriveOk, mbkOk) {
    var sliceItems = document.querySelectorAll(".section-slice-item");
    for (var i = 0; i < sliceItems.length; i++) {
      var item = sliceItems[i];
      var hasDrive = item.getAttribute("data-has-drive") === "true";
      var previewBtn = item.querySelector(".btn-section-preview, a[href*='/preview']");
      var downloadBtn = item.querySelector(".btn-section-download, a[href*='/download']");

      if (!gdriveOk) {
        if (downloadBtn) {
          downloadBtn.setAttribute("data-mirror-source", "mbkbucket");
          downloadBtn.title = (downloadBtn.title || "").replace(/\s*\(.*\)/, "") + " (MBKBucket storage)";
        }
        if (previewBtn) {
          previewBtn.setAttribute("data-mirror-source", "mbkbucket");
          previewBtn.title = (previewBtn.title || "").replace(/\s*\(.*\)/, "") + " (MBKBucket storage)";
        }
      } else if (hasDrive) {
        if (downloadBtn) {
          downloadBtn.setAttribute("data-mirror-source", "drive");
          downloadBtn.title = (downloadBtn.title || "").replace(/\s*\(.*\)/, "") + " (Google Drive mirror)";
        }
        if (previewBtn) {
          previewBtn.setAttribute("data-mirror-source", "drive");
          previewBtn.title = (previewBtn.title || "").replace(/\s*\(.*\)/, "") + " (Google Drive mirror)";
        }
      } else {
        if (downloadBtn) {
          downloadBtn.setAttribute("data-mirror-source", "mbkbucket");
          downloadBtn.title = (downloadBtn.title || "").replace(/\s*\(.*\)/, "") + " (MBKBucket storage)";
        }
        if (previewBtn) {
          previewBtn.setAttribute("data-mirror-source", "mbkbucket");
          previewBtn.title = (previewBtn.title || "").replace(/\s*\(.*\)/, "") + " (MBKBucket storage)";
        }
      }
    }
  }

  function updateUi(gdriveOk, mbkOk) {
    if (typeof mbkOk === "undefined") mbkOk = true;

    var html = document.documentElement;
    var indicator = document.getElementById("networkStatusIndicator");
    var label = document.getElementById("networkStatusLabel");
    var banner = document.getElementById("driveBlockedBanner");

    html.classList.remove("gdrive-ok", "gdrive-blocked", "mbk-ok", "mbk-degraded", "both-degraded");

    if (gdriveOk && mbkOk) {
      html.classList.add("gdrive-ok", "mbk-ok");
      if (banner) banner.style.display = "none";

      if (indicator && label) {
        indicator.className = "network-status-pill gdrive-ok";
        label.innerHTML = '<span class="status-text-full">Drive Active • MBK Ready</span><span class="status-text-short">Drive OK</span>';
        indicator.title = "Google Drive & MBKBucket storage are healthy. Books and chapters smart-route to optimal mirror. Click to switch preference.";
      }
      setDriveCookie(false);
    } else if (!gdriveOk && mbkOk) {
      html.classList.add("gdrive-blocked", "mbk-ok");
      if (banner) banner.style.display = "flex";

      if (indicator && label) {
        indicator.className = "network-status-pill gdrive-blocked";
        label.innerHTML = '<span class="status-text-full">Drive Blocked • MBK Fallback</span><span class="status-text-short">MBKBucket</span>';
        indicator.title = "Google Drive appears firewalled on this campus network. Books and chapter slices automatically route to MBKBucket storage.";
      }
      setDriveCookie(true);
    } else if (gdriveOk && !mbkOk) {
      html.classList.add("gdrive-ok", "mbk-degraded");
      if (banner) banner.style.display = "flex";

      if (indicator && label) {
        indicator.className = "network-status-pill mbk-degraded";
        label.innerHTML = '<span class="status-text-full">MBK Degraded • Drive Primary</span><span class="status-text-short">Drive Only</span>';
        indicator.title = "MBKBucket storage check reported issues. Books and chapters will prefer Google Drive mirror.";
      }
      setDriveCookie(false);
    } else {
      html.classList.add("gdrive-blocked", "mbk-degraded", "both-degraded");
      if (banner) banner.style.display = "flex";

      if (indicator && label) {
        indicator.className = "network-status-pill both-degraded";
        label.innerHTML = '<span class="status-text-full">Storage Degraded</span><span class="status-text-short">Degraded</span>';
        indicator.title = "Both Google Drive and MBKBucket storage reported network reachability issues.";
      }
      setDriveCookie(true);
    }

    updateSliceButtons(gdriveOk, mbkOk);

    try {
      sessionStorage.setItem(STORAGE_KEY, JSON.stringify({
        gdrive: gdriveOk,
        mbk: mbkOk,
        timestamp: Date.now()
      }));
    } catch (e) {}
  }

  // Toggle user preference manually
  window.toggleMirrorOverride = function() {
    var html = document.documentElement;
    var isCurrentlyBlocked = html.classList.contains("gdrive-blocked");
    var willBeBlocked = !isCurrentlyBlocked;
    var isMbkDegraded = html.classList.contains("mbk-degraded");
    updateUi(!willBeBlocked, !isMbkDegraded);
  };

  // Perform probe when DOM is ready
  function initVerifier() {
    Promise.all([
      probeGoogleDrive(2500),
      probeMBKBucket(2500)
    ]).then(function(results) {
      var gdriveOk = results[0];
      var mbkOk = results[1];
      updateUi(gdriveOk, mbkOk);
    });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initVerifier);
  } else {
    initVerifier();
  }
})();
