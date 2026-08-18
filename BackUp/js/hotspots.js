/**
 * Verida — Scam Hotspot Radar & Geofencing Module (Feature #5)
 * Leaflet Interactive Map + Complete Places Directory + Proactive Geofence Alerts ("Waze for Touts")
 */

import { store } from "./store.js";
import { digitalHandshake } from "./handshake.js";

export class HotspotRadar {
  constructor() {
    this.map = null;
    this.userMarker = null;
    this.hotspotCircles = [];
    this.monumentMarkers = [];
    this.activeAlertHotspot = null;
    this.activeCategoryFilter = "all";
    this.searchQuery = "";
  }

  // --- Initialize Leaflet Map ---
  initMap(containerId = "hotspot-map") {
    const container = document.getElementById(containerId);
    if (!container || typeof L === "undefined") return;

    const city = store.getCurrentCity();
    const loc = store.currentLocation;

    if (this.map) {
      this.map.remove();
      this.map = null;
    }

    try {
      this.map = L.map(containerId, {
        center: [loc.lat, loc.lng],
        zoom: city.zoom || 13,
        zoomControl: false
      });

      // Add clean, modern tile layer
      L.tileLayer("https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png", {
        attribution: '&copy; <a href="https://www.openstreetmap.org/">OpenStreetMap</a> &copy; <a href="https://carto.com/">CARTO</a>',
        subdomains: "abcd",
        maxZoom: 19
      }).addTo(this.map);

      L.control.zoom({ position: "bottomright" }).addTo(this.map);

      this.renderMapLayers();
      this.renderHotspotsDirectory();
      this.checkGeofenceProximity();
    } catch (e) {
      console.warn("[Verida Map Init Warning]:", e);
    }
  }

  // Render monuments, hotspots, and user pin
  renderMapLayers() {
    if (!this.map || typeof L === "undefined") return;

    // Clear existing layers
    this.hotspotCircles.forEach(c => c.remove());
    this.monumentMarkers.forEach(m => m.remove());
    this.hotspotCircles = [];
    this.monumentMarkers = [];

    const cityId = store.currentCityId;
    const hotspots = store.getHotspotsForCity(cityId);
    const monuments = store.getMonumentsForCity(cityId);
    const userLoc = store.currentLocation;

    // 1. Hotspot Danger Circles (Red/Amber with pulsing animation)
    hotspots.forEach(spot => {
      const circleColor = spot.riskLevel === "high" ? "#ef4444" : "#f59e0b";
      const circle = L.circle([spot.lat, spot.lng], {
        color: circleColor,
        fillColor: circleColor,
        fillOpacity: 0.25,
        radius: spot.radius || 200,
        weight: 2,
        dashArray: "4, 6"
      }).addTo(this.map);

      circle.bindPopup(`
        <div class="hotspot-popup" style="max-width: 240px; font-family: inherit;">
          <h4 style="color: ${circleColor}; margin: 0 0 4px 0; font-size: 13px;">
            <i class="fas fa-exclamation-triangle"></i> ${spot.name}
          </h4>
          <p style="margin: 0 0 6px 0; font-size: 11px; font-weight: 700; color: #1e293b;">
            🚨 ${spot.scamType}
          </p>
          <p style="margin: 0 0 6px 0; font-size: 11px; color: #475569; line-height: 1.4;">
            ${spot.description}
          </p>
          <div style="font-size: 11px; color: #047857; background: #ecfdf5; padding: 4px 8px; border-radius: 4px; border-left: 3px solid #059669;">
            <i class="fas fa-shield-alt"></i> <strong>Safe Action:</strong> ${spot.proactiveAdvice}
          </div>
        </div>
      `);

      this.hotspotCircles.push(circle);
    });

    // 2. Verified Monument Markers
    monuments.forEach(mon => {
      const iconHtml = `
        <div class="monument-map-pin" title="${mon.name}">
          <i class="fas fa-landmark"></i>
        </div>
      `;
      const customIcon = L.divIcon({
        html: iconHtml,
        className: "custom-monument-icon",
        iconSize: [28, 28],
        iconAnchor: [14, 14]
      });

      const marker = L.marker([mon.lat, mon.lng], { icon: customIcon }).addTo(this.map);
      marker.bindPopup(`
        <div class="monument-popup" style="max-width: 240px; font-family: inherit;">
          <h4 style="margin: 0 0 4px 0; color: #0f172a; font-size: 13px;">${mon.name}</h4>
          <span style="font-size: 10px; background: #e0f2fe; color: #0369a1; padding: 2px 6px; border-radius: 4px; font-weight: 700;">${mon.category}</span>
          <p style="margin: 6px 0; font-size: 11px; color: #475569; line-height: 1.4;">${mon.highlights}</p>
        </div>
      `);

      this.monumentMarkers.push(marker);
    });

    // 3. User Location Marker
    const userPinHtml = `
      <div class="user-live-gps-pin">
        <div class="user-pin-pulse"></div>
        <div class="user-pin-core"></div>
      </div>
    `;
    const userIcon = L.divIcon({
      html: userPinHtml,
      className: "custom-user-icon",
      iconSize: [24, 24],
      iconAnchor: [12, 12]
    });

    if (this.userMarker) {
      this.userMarker.setLatLng([userLoc.lat, userLoc.lng]);
    } else {
      this.userMarker = L.marker([userLoc.lat, userLoc.lng], { icon: userIcon }).addTo(this.map);
      this.userMarker.bindPopup(`<strong>Your Live GPS Pin</strong><br>${userLoc.name}`);
    }
  }

  // --- Render Complete Interactive Hotspots & Landmarks Directory ---
  renderHotspotsDirectory(containerId = "hotspots-directory-list") {
    const container = document.getElementById(containerId);
    if (!container) return;

    const cityId = store.currentCityId;
    const hotspots = store.getHotspotsForCity(cityId);
    const monuments = store.getMonumentsForCity(cityId);

    // Combine hotspots and monuments into a rich unified list
    const unifiedList = [
      ...hotspots.map(h => ({
        ...h,
        isHotspot: true,
        typeLabel: "🚨 Scam / Tout Hotspot",
        badgeClass: h.riskLevel === "high" ? "badge-danger" : "badge-warning",
        category: "Scam Hotspot"
      })),
      ...monuments.map(m => ({
        ...m,
        isHotspot: false,
        typeLabel: `🏛️ ${m.category}`,
        badgeClass: "badge-success",
        category: m.category
      }))
    ];

    // Filter by category and search
    let filtered = unifiedList;

    if (this.activeCategoryFilter !== "all") {
      filtered = filtered.filter(item => {
        if (this.activeCategoryFilter === "scam") return item.isHotspot;
        return (item.category || "").toLowerCase().includes(this.activeCategoryFilter.toLowerCase());
      });
    }

    if (this.searchQuery.trim().length > 0) {
      const q = this.searchQuery.toLowerCase();
      filtered = filtered.filter(item => 
        (item.name || "").toLowerCase().includes(q) ||
        (item.highlights || "").toLowerCase().includes(q) ||
        (item.scamType || "").toLowerCase().includes(q) ||
        (item.description || "").toLowerCase().includes(q)
      );
    }

    if (filtered.length === 0) {
      container.innerHTML = `
        <div class="empty-state" style="padding: 20px; text-align: center; color: #64748b;">
          <p>No locations match your filter. Try another keyword.</p>
        </div>
      `;
      return;
    }

    container.innerHTML = filtered.map(item => {
      if (item.isHotspot) {
        return `
          <div class="hotspot-directory-card scam-card" onclick="hotspotRadar.flyAndSelect('${item.id}', ${item.lat}, ${item.lng}, '${item.name.replace(/'/g, "\\'")}')">
            <div class="hotspot-card-header">
              <span class="hotspot-type-tag ${item.riskLevel === 'high' ? 'high-risk' : 'med-risk'}">
                <i class="fas fa-shield-virus"></i> ${item.riskLevel === 'high' ? 'HIGH RISK SCAM ZONE' : 'TOUT ALERT ZONE'}
              </span>
              <span class="report-count-tag"><i class="fas fa-flag"></i> ${item.recentReportCount || 12} Reports</span>
            </div>
            <h4 class="hotspot-card-title">${item.name}</h4>
            <div class="scam-issue-row">
              <strong>Scam Type:</strong> ${item.scamType}
            </div>
            <p class="hotspot-card-desc">${item.description}</p>
            <div class="safe-action-box">
              <i class="fas fa-shield-check"></i> <strong>Safe Action:</strong> ${item.proactiveAdvice}
            </div>
            <div class="card-action-footer">
              <span class="teleport-hint"><i class="fas fa-location-crosshairs"></i> Tap to Teleport & Trigger Radar</span>
            </div>
          </div>
        `;
      } else {
        // Monument / Landmark Card
        const primaryFairRate = item.fairRates ? Object.entries(item.fairRates)[0] : null;
        return `
          <div class="hotspot-directory-card landmark-card" onclick="hotspotRadar.flyAndSelect('${item.id}', ${item.lat}, ${item.lng}, '${item.name.replace(/'/g, "\\'")}')">
            <div class="hotspot-card-header">
              <span class="hotspot-type-tag verified-zone">
                <i class="fas fa-landmark"></i> ${item.category}
              </span>
              <span class="verified-safe-tag"><i class="fas fa-check-circle"></i> ASI / Gujarat Verified</span>
            </div>
            <h4 class="hotspot-card-title">${item.name}</h4>
            <p class="hotspot-card-desc">${item.highlights}</p>
            ${primaryFairRate ? `
              <div class="fair-rate-preview">
                <span class="rate-label"><i class="fas fa-tag"></i> Fair Rate Benchmark:</span>
                <span class="rate-val">₹${primaryFairRate[1].min}–₹${primaryFairRate[1].median} (${primaryFairRate[0]})</span>
              </div>
            ` : ''}
            <div class="card-action-footer">
              <span class="teleport-hint"><i class="fas fa-location-crosshairs"></i> Tap to Teleport & View on Map</span>
            </div>
          </div>
        `;
      }
    }).join("");
  }

  // --- Fly Map to Spot and Check Proximity ---
  flyAndSelect(id, lat, lng, name) {
    store.currentLocation = { lat, lng, name, accuracy: 4 };

    const locPill = document.getElementById("current-location-pill");
    if (locPill) locPill.innerHTML = `<span class="gps-live-dot"></span> ${name}`;

    if (this.map) {
      this.map.flyTo([lat, lng], 16, { animate: true, duration: 1.0 });
      this.renderMapLayers();
    }

    this.checkGeofenceProximity();
  }

  // --- Check Geofence Proximity & Trigger Proactive Warning ---
  checkGeofenceProximity() {
    const userLoc = store.currentLocation;
    const hotspots = store.getHotspotsForCity(store.currentCityId);
    const alertBanner = document.getElementById("hotspot-proactive-banner");

    let nearbyHotspot = null;
    let minDistance = Infinity;

    hotspots.forEach(spot => {
      const dist = digitalHandshake.calculateDistance(userLoc.lat, userLoc.lng, spot.lat, spot.lng);
      if (dist <= (spot.radius || 250) + 120) { // inside or approaching within 120m
        if (dist < minDistance) {
          minDistance = dist;
          nearbyHotspot = { ...spot, currentDistance: dist };
        }
      }
    });

    this.activeAlertHotspot = nearbyHotspot;

    if (alertBanner) {
      if (nearbyHotspot) {
        alertBanner.classList.remove("hidden");
        alertBanner.innerHTML = `
          <div class="alert-content">
            <div class="alert-icon-box pulse-warning"><i class="fas fa-shield-virus"></i></div>
            <div class="alert-text">
              <div class="alert-title">⚠️ Approaching Scam Hotspot: ${nearbyHotspot.name} (${minDistance}m away)</div>
              <div class="alert-desc">${nearbyHotspot.scamType}. ${nearbyHotspot.proactiveAdvice}</div>
            </div>
            <button class="alert-dismiss-btn" onclick="document.getElementById('hotspot-proactive-banner').classList.add('hidden')">
              <i class="fas fa-times"></i>
            </button>
          </div>
        `;
      } else {
        alertBanner.classList.add("hidden");
      }
    }
  }

  // Teleport user to a specific coordinate
  teleportTo(lat, lng, name) {
    this.flyAndSelect("custom", lat, lng, name);
  }
}

export const hotspotRadar = new HotspotRadar();
