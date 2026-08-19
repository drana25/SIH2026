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

  // --- Initialize Google Map ---
  initMap(containerId = "hotspot-map") {
    const container = document.getElementById(containerId);
    if (!container) return;

    if (typeof google === "undefined" || !google.maps) {
       console.warn("[Hotspots] Google Maps API not loaded. Map rendering skipped.");
       container.innerHTML = `<div style="padding:20px;text-align:center;color:#64748b;">Interactive Map is temporarily unavailable.</div>`;
       this.renderHotspotsDirectory();
       return;
    }

    const city = store.getCurrentCity();
    const loc = store.currentLocation;

    try {
      this.map = new google.maps.Map(container, {
        center: { lat: loc.lat, lng: loc.lng },
        zoom: city.zoom || 13,
        disableDefaultUI: true,
        zoomControl: true,
        styles: [
          { featureType: "poi", stylers: [{ visibility: "off" }] }
        ]
      });

      this.renderMapLayers();
      this.renderHotspotsDirectory();
      this.checkGeofenceProximity();
    } catch (e) {
      console.warn("[Verida Map Init Warning]:", e);
    }
  }

  // Render monuments, hotspots, and user pin
  renderMapLayers() {
    if (!this.map || typeof google === "undefined" || !google.maps) return;

    // Clear existing layers
    this.hotspotCircles.forEach(c => c.setMap(null));
    this.monumentMarkers.forEach(m => m.setMap(null));
    if (this.userMarker) this.userMarker.setMap(null);
    this.hotspotCircles = [];
    this.monumentMarkers = [];

    const cityId = store.currentCityId;
    const hotspots = store.getHotspotsForCity(cityId);
    const monuments = store.getMonumentsForCity(cityId);
    const userLoc = store.currentLocation;
    
    const infoWindow = new google.maps.InfoWindow();

    // 1. Hotspot Danger Circles
    hotspots.forEach(spot => {
      const circleColor = spot.riskLevel === "high" ? "#ef4444" : "#f59e0b";
      const circle = new google.maps.Circle({
        strokeColor: circleColor,
        strokeOpacity: 0.8,
        strokeWeight: 2,
        fillColor: circleColor,
        fillOpacity: 0.25,
        map: this.map,
        center: { lat: spot.lat, lng: spot.lng },
        radius: spot.radius || 200
      });

      google.maps.event.addListener(circle, "click", (e) => {
        infoWindow.setContent(`
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
        infoWindow.setPosition(e.latLng);
        infoWindow.open(this.map);
      });

      this.hotspotCircles.push(circle);
    });

    // 2. Verified Monument Markers
    monuments.forEach(mon => {
      const marker = new google.maps.Marker({
        position: { lat: mon.lat, lng: mon.lng },
        map: this.map,
        title: mon.name
      });
      
      marker.addListener("click", () => {
        infoWindow.setContent(`
          <div class="monument-popup" style="max-width: 240px; font-family: inherit;">
            <h4 style="margin: 0 0 4px 0; color: #0f172a; font-size: 13px;">${mon.name}</h4>
            <span style="font-size: 10px; background: #e0f2fe; color: #0369a1; padding: 2px 6px; border-radius: 4px; font-weight: 700;">${mon.category}</span>
            <p style="margin: 6px 0; font-size: 11px; color: #475569; line-height: 1.4;">${mon.highlights}</p>
          </div>
        `);
        infoWindow.open(this.map, marker);
      });

      this.monumentMarkers.push(marker);
    });

    // 3. User Location Marker
    this.userMarker = new google.maps.Marker({
      position: { lat: userLoc.lat, lng: userLoc.lng },
      map: this.map,
      title: "Your Live GPS Pin",
      icon: {
        path: google.maps.SymbolPath.CIRCLE,
        scale: 8,
        fillColor: "#3b82f6",
        fillOpacity: 1,
        strokeColor: "#ffffff",
        strokeWeight: 2,
      }
    });
  }

  // --- Render Complete Interactive Hotspots & Landmarks Directory ---
  renderHotspotsDirectory(containerId = "hotspots-directory-list") {
    const container = document.getElementById(containerId);
    if (!container) return;

    const cityId = store.currentCityId;
    const hotspots = store.getHotspotsForCity(cityId);
    const monuments = store.getMonumentsForCity(cityId);

    const userLoc = store.currentLocation;
    const calculateDistance = (lat1, lng1, lat2, lng2) => {
      if (typeof google !== 'undefined' && google.maps && google.maps.geometry) {
        const p1 = new google.maps.LatLng(lat1, lng1);
        const p2 = new google.maps.LatLng(lat2, lng2);
        return google.maps.geometry.spherical.computeDistanceBetween(p1, p2) / 1000;
      }
      // Haversine fallback
      const R = 6371;
      const dLat = (lat2 - lat1) * Math.PI / 180;
      const dLng = (lng2 - lng1) * Math.PI / 180;
      const a = Math.sin(dLat/2) * Math.sin(dLat/2) + Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLng/2) * Math.sin(dLng/2);
      return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    };

    // Combine hotspots and monuments into a rich unified list
    const unifiedList = [
      ...hotspots.map(h => ({
        ...h,
        isHotspot: true,
        typeLabel: "🚨 Scam / Tout Hotspot",
        badgeClass: h.riskLevel === "high" ? "badge-danger" : "badge-warning",
        category: "Scam Hotspot",
        distKm: calculateDistance(userLoc.lat, userLoc.lng, h.lat, h.lng)
      })),
      ...monuments.map(m => ({
        ...m,
        isHotspot: false,
        typeLabel: `🏛️ ${m.category}`,
        badgeClass: "badge-success",
        category: m.category,
        distKm: calculateDistance(userLoc.lat, userLoc.lng, m.lat, m.lng)
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
    
    filtered.sort((a, b) => a.distKm - b.distKm);

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
              <span class="report-count-tag" style="background:#f1f5f9; color:#475569;"><i class="fas fa-location-arrow"></i> ${item.distKm.toFixed(1)} km away</span>
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
              <span class="verified-safe-tag" style="background:#f1f5f9; color:#475569;"><i class="fas fa-location-arrow"></i> ${item.distKm.toFixed(1)} km away</span>
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

    if (this.map && typeof google !== "undefined") {
      this.map.panTo({ lat, lng });
      this.map.setZoom(16);
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

   /* if (alertBanner) {
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
    }*/
  }

  // Teleport user to a specific coordinate
  teleportTo(lat, lng, name) {
    this.flyAndSelect("custom", lat, lng, name);
  }
}

export const hotspotRadar = new HotspotRadar();


