/**
 * Verida — Main Application Controller & View Router
 */

import { store } from "./store.js";
import { digitalHandshake } from "./handshake.js";
import { pricePulse } from "./pricePulse.js";
import { priceCamera } from "./priceCamera.js";
import { hotspotRadar } from "./hotspots.js";
import { reviewsManager } from "./reviews.js";
import { evidencePacketManager } from "./evidencePacket.js";
import { demoSimulator } from "./demoSimulator.js";
import { transitSafety } from "./transitSafety.js";
import { authManager } from "./authManager.js";

class App {
  constructor() {
    this.activeTab = "handshake";
    this.isInitialized = false;
  }

  init() {
    if (this.isInitialized) return;
    this.isInitialized = true;
    console.log("[Verida] Initializing On-The-Spot Tourism & Transit Trust Platform...");

    try {
      this.populateCityDropdown();
      this.bindEvents();
      authManager.init();
      this.syncProfileDisplayNames();
      this.switchRole(store.currentRole);
      this.switchTab("transit");

      // Initialize modules safely
      transitSafety.initRoutePlanner();
      pricePulse.renderTicker();
      reviewsManager.renderGuideLedger();

      // Initialize map safely with slight delay
      setTimeout(() => {
        try {
          hotspotRadar.initMap();
        } catch (e) {
          console.warn("[Verida Map Init Warning]:", e);
        }
      }, 200);
    } catch (err) {
      console.error("[Verida Init Error]:", err);
    }
  }

  syncProfileDisplayNames() {
    // Sync all name display elements with saved profiles
    const passengerName = store.activeUser.name;
    const driverName = store.activeGuide.name;
    const driverPlate = store.activeGuide.vehicleRegNo || "GJ-06-AU-7892";
    const driverVehicle = store.activeGuide.vehicleType || "Green CNG Auto-Rickshaw";

    const nameEl = document.getElementById("header-user-display-name");
    if (nameEl) nameEl.textContent = passengerName;

    const dualPassName = document.getElementById("dual-passenger-name");
    if (dualPassName) dualPassName.textContent = passengerName;

    const dualDriverName = document.getElementById("dual-driver-name");
    if (dualDriverName) dualDriverName.textContent = driverName;

    // Sync driver card in main view
    const driverCardName = document.getElementById("driver-card-name");
    const driverCardLic = document.getElementById("driver-card-lic");
    if (driverCardName) driverCardName.textContent = driverName;
    if (driverCardLic) driverCardLic.textContent = `${driverPlate} • ${driverVehicle}`;

    // Sync driver card in dual view
    const driverCardNameDual = document.getElementById("driver-card-name-dual");
    const driverCardLicDual = document.getElementById("driver-card-lic-dual");
    if (driverCardNameDual) driverCardNameDual.textContent = driverName;
    if (driverCardLicDual) driverCardLicDual.textContent = `${driverPlate} • ${driverVehicle}`;
  }

  bindEvents() {
    // City Selector
    const citySelector = document.getElementById("header-city-selector");
    if (citySelector) {
      citySelector.onchange = (e) => {
        store.setCity(e.target.value);
        this.onCityChanged();
      };
    }

    // Role Switcher Buttons
    document.querySelectorAll(".role-toggle-btn").forEach(btn => {
      btn.onclick = (e) => {
        e.preventDefault();
        const targetRole = btn.getAttribute("data-role");
        this.switchRole(targetRole);
      };
    });

    // Navigation Tabs (Both Mobile bottom dock and Desktop sidebar/topbar)
    document.querySelectorAll(".nav-tab-btn, .desktop-nav-link").forEach(btn => {
      btn.onclick = (e) => {
        e.preventDefault();
        const tab = btn.getAttribute("data-tab");
        if (tab) this.switchTab(tab);
      };
    });

    // Dual Screen Presenter Toggle
    const dualBtn = document.getElementById("toggle-dual-screen-btn");
    if (dualBtn) {
      dualBtn.onclick = (e) => {
        e.preventDefault();
        demoSimulator.toggleDualScreen();
      };
    }

    // View Mode Toggle (Fluid Laptop vs Mobile Phone Frame)
    const viewModeBtn = document.getElementById("toggle-view-mode-btn");
    if (viewModeBtn) {
      viewModeBtn.onclick = (e) => {
        e.preventDefault();
        document.body.classList.toggle("mobile-mockup-mode");
        const isMockup = document.body.classList.contains("mobile-mockup-mode");
        viewModeBtn.innerHTML = isMockup 
          ? `<i class="fas fa-desktop"></i> Laptop Dashboard View`
          : `<i class="fas fa-mobile-screen"></i> Phone Simulator Frame`;
      };
    }

    // Teleport Selector
    const teleportSelect = document.getElementById("demo-teleport-select");
    if (teleportSelect) {
      teleportSelect.onchange = (e) => {
        if (e.target.value) {
          demoSimulator.teleport(e.target.value);
        }
      };
    }

    // Live Handshake Simulation Button (Traveler View)
    const simScanBtn = document.getElementById("simulate-scan-btn");
    if (simScanBtn) {
      simScanBtn.onclick = (e) => {
        e.preventDefault();
        this.executeHandshakeFlow();
      };
    }

    // Camera Start Scanner Button
    const startScannerBtn = document.getElementById("start-camera-scan-btn");
    if (startScannerBtn) {
      startScannerBtn.onclick = (e) => {
        e.preventDefault();
        document.getElementById("camera-scanner-wrapper")?.classList.remove("hidden");
        digitalHandshake.startTravelerScanner("qr-reader", (record) => {
          this.onHandshakeSuccess(record);
          digitalHandshake.stopTravelerScanner();
          document.getElementById("camera-scanner-wrapper")?.classList.add("hidden");
        });
      };
    }

    const closeScannerBtn = document.getElementById("close-camera-scanner-btn");
    if (closeScannerBtn) {
      closeScannerBtn.onclick = (e) => {
        e.preventDefault();
        digitalHandshake.stopTravelerScanner();
        document.getElementById("camera-scanner-wrapper")?.classList.add("hidden");
      };
    }

    // Price Camera Trigger
    const snapPhotoBtn = document.getElementById("price-camera-snap-btn");
    if (snapPhotoBtn) {
      snapPhotoBtn.onclick = async (e) => {
        e.preventDefault();
        const statusEl = document.getElementById("ocr-status-indicator");
        const photoData = priceCamera.captureCurrentFrame();
        if (photoData) {
          if (statusEl) statusEl.textContent = "Processing camera image...";
          await priceCamera.processImage(photoData, (msg) => {
            if (statusEl) statusEl.textContent = msg;
          });
          demoSimulator.loadSampleChit("sample-chit-vad-overcharge");
        } else {
          demoSimulator.loadSampleChit("sample-chit-vad-overcharge");
        }
      };
    }

    // Sample Chits Quick Selector
    document.querySelectorAll(".sample-chit-btn").forEach(btn => {
      btn.onclick = (e) => {
        e.preventDefault();
        const chitId = btn.getAttribute("data-chit");
        demoSimulator.loadSampleChit(chitId);
      };
    });

    // SOS Emergency Button
    const sosBtn = document.getElementById("emergency-sos-floating-btn");
    if (sosBtn) {
      sosBtn.onclick = (e) => {
        e.preventDefault();
        this.triggerSosFlow();
      };
    }

    // Price Pulse Filter Pills
    document.querySelectorAll(".pulse-filter-pill").forEach(pill => {
      pill.onclick = (e) => {
        e.preventDefault();
        document.querySelectorAll(".pulse-filter-pill").forEach(p => p.classList.remove("active"));
        pill.classList.add("active");
        pricePulse.activeFilter = pill.getAttribute("data-category");
        pricePulse.renderTicker();
      };
    });

    // Hotspot Directory Search Input
    const hotspotSearchInput = document.getElementById("hotspot-search-input");
    if (hotspotSearchInput) {
      hotspotSearchInput.oninput = (e) => {
        hotspotRadar.searchQuery = e.target.value;
        hotspotRadar.renderHotspotsDirectory();
      };
    }

    // Hotspot Directory Category Pills
    document.querySelectorAll(".hotspot-cat-btn").forEach(btn => {
      btn.onclick = (e) => {
        e.preventDefault();
        document.querySelectorAll(".hotspot-cat-btn").forEach(b => b.classList.remove("active"));
        btn.classList.add("active");
        hotspotRadar.activeCategoryFilter = btn.getAttribute("data-cat");
        hotspotRadar.renderHotspotsDirectory();
      };
    });
  }

  populateCityDropdown() {
    const selector = document.getElementById("header-city-selector");
    if (!selector) return;

    const cities = store.getCities();
    selector.innerHTML = Object.values(cities).map(city => `
      <option value="${city.id}" ${city.id === store.currentCityId ? "selected" : ""}>
        📍 ${city.name} (${city.state})
      </option>
    `).join("");
  }

  onCityChanged() {
    const city = store.getCurrentCity();
    const locPill = document.getElementById("current-location-pill");
    if (locPill) locPill.innerHTML = `<span class="gps-live-dot"></span> ${store.currentLocation.name}`;

    transitSafety.initRoutePlanner();
    pricePulse.renderTicker();
    reviewsManager.renderGuideLedger();
    hotspotRadar.renderMapLayers();
    hotspotRadar.renderHotspotsDirectory();
    hotspotRadar.checkGeofenceProximity();

    if (store.currentRole === "guide") {
      digitalHandshake.startGuideQrRotation();
    }
  }

  switchRole(role) {
    store.currentRole = role;

    document.querySelectorAll(".role-toggle-btn").forEach(b => {
      b.classList.toggle("active", b.getAttribute("data-role") === role);
    });

    const travelerContainer = document.getElementById("traveler-view-container");
    const guideContainer = document.getElementById("guide-view-container");

    if (role === "guide") {
      if (travelerContainer) travelerContainer.classList.add("hidden");
      if (guideContainer) guideContainer.classList.remove("hidden");
      digitalHandshake.startGuideQrRotation("guide-qr-canvas", "qr-countdown-badge");
      reviewsManager.renderGuideLedger(store.activeGuide.id, "guide-self-ledger");
    } else {
      if (travelerContainer) travelerContainer.classList.remove("hidden");
      if (guideContainer) guideContainer.classList.add("hidden");
      digitalHandshake.stopGuideQrRotation();
    }
  }

  switchTab(tabKey) {
    this.activeTab = tabKey;

    document.querySelectorAll(".nav-tab-btn, .desktop-nav-link").forEach(b => {
      b.classList.toggle("active", b.getAttribute("data-tab") === tabKey);
    });

    document.querySelectorAll(".tab-content-panel").forEach(panel => {
      panel.classList.toggle("active", panel.getAttribute("id") === `tab-${tabKey}`);
    });

    // Lifecycle triggers
    if (tabKey === "radar") {
      hotspotRadar.renderHotspotsDirectory();
      setTimeout(() => {
        try {
          if (!hotspotRadar.map) hotspotRadar.initMap();
          else {
            hotspotRadar.map.invalidateSize();
            hotspotRadar.renderMapLayers();
            hotspotRadar.renderHotspotsDirectory();
          }
        } catch (e) {
          console.warn("[Verida Map Invalidate Warning]:", e);
        }
      }, 150);
    } else if (tabKey === "camera") {
      priceCamera.startCamera();
    } else {
      priceCamera.stopCamera();
    }

    if (tabKey === "transit") {
      transitSafety.initRoutePlanner();
    } else if (tabKey === "pulses") {
      pricePulse.renderTicker();
    } else if (tabKey === "ledger") {
      reviewsManager.renderGuideLedger();
    }
  }

  // --- Handshake Execution Flow ---
  async executeHandshakeFlow() {
    const record = await digitalHandshake.simulateLiveHandshake();
    if (record) {
      this.onHandshakeSuccess(record);
    }
  }

  onHandshakeSuccess(record) {
    const modal = document.getElementById("handshake-success-modal");
    const content = document.getElementById("handshake-success-content");

    if (modal && content) {
      content.innerHTML = `
        <div class="verified-encounter-card animate-bounce-in">
          <div class="badge-shield-wrap">
            <div class="shield-circle"><i class="fas fa-shield-check"></i></div>
            <span class="encounter-verified-text">DIGITAL HANDSHAKE VERIFIED</span>
          </div>

          <div class="verified-guide-profile">
            <img src="${store.activeGuide.photo}" alt="${record.guideName}" class="verified-guide-avatar">
            <div class="verified-guide-text">
              <h3>${record.guideName}</h3>
              <p class="lic-tag"><i class="fas fa-id-badge"></i> License: <strong>${record.guideLicenseNo}</strong></p>
              <p class="issuer-tag"><i class="fas fa-university"></i> ${record.guideIssuer}</p>
            </div>
          </div>

          <div class="encounter-metrics-grid">
            <div class="metric-item">
              <span class="m-label">Physical Proximity</span>
              <span class="m-val text-success">${record.distanceMeters}m (Verified)</span>
            </div>
            <div class="metric-item">
              <span class="m-label">Govt Verification</span>
              <span class="m-val text-success">ASI / Gujarat Approved</span>
            </div>
            <div class="metric-item">
              <span class="m-label">Verified Encounters</span>
              <span class="m-val">${store.activeGuide.encounterCount + 1} On Record</span>
            </div>
            <div class="metric-item">
              <span class="m-label">Trust Index</span>
              <span class="m-val text-success">98.5% Authenticity</span>
            </div>
          </div>

          <div class="encounter-ledger-proof">
            <i class="fas fa-link"></i> Immutable Ledger Hash: <code>${record.tokenHash}</code>
          </div>

          <button type="button" class="btn btn-primary btn-block btn-lg" id="proceed-to-price-pulse-btn">
            <i class="fas fa-arrow-right"></i> Agree on Price (3-Sec Live Pulse)
          </button>
        </div>
      `;

      modal.classList.add("active");

      const proceedBtn = document.getElementById("proceed-to-price-pulse-btn");
      if (proceedBtn) {
        proceedBtn.onclick = (e) => {
          e.preventDefault();
          modal.classList.remove("active");
          pricePulse.showPostHandshakePrompt(record, () => {
            reviewsManager.renderGuideLedger();
            this.switchTab("pulses");
          });
        };
      }
    }
  }

  // --- SOS Flow ---
  triggerSosFlow() {
    const dossier = evidencePacketManager.compileDossier({
      category: "Extortionate Overcharging & Street Tout Harassment",
      suspectName: store.activeGuide.name,
      suspectLicense: store.activeGuide.licenseNo,
      quotedPrice: 450,
      description: `Unregulated operator approached at ${store.currentLocation.name}. Demanded ₹450 cash for standard ₹100 local route.`
    });
    evidencePacketManager.showEvidenceModal(dossier);
  }
}

// Global Exports
window.veridaApp = new App();
window.digitalHandshake = digitalHandshake;
window.demoSimulator = demoSimulator;
window.pricePulse = pricePulse;
window.priceCamera = priceCamera;
window.hotspotRadar = hotspotRadar;
window.reviewsManager = reviewsManager;
window.evidencePacketManager = evidencePacketManager;
window.transitSafety = transitSafety;
window.authManager = authManager;
window.store = store;

// Immediate or DOMContentLoaded trigger
if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", () => {
    window.veridaApp.init();
  });
} else {
  window.veridaApp.init();
}
