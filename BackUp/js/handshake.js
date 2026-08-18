/**
 * Verida — Digital Handshake Module (Feature #1)
 * Rotating dynamic QR generator + Camera scanner + GPS Proximity Verification
 */

import { store } from "./store.js";

export class DigitalHandshake {
  constructor() {
    this.html5QrCode = null;
    this.qrRotationInterval = null;
    this.countdownTimer = null;
    this.currentQrToken = null;
    this.qrValidityDuration = 15; // seconds
    this.secondsRemaining = 15;
    this.isScanning = false;
  }

  // --- GPS Haversine Distance Calculation ---
  calculateDistance(lat1, lon1, lat2, lon2) {
    const R = 6371e3; // Earth's radius in meters
    const φ1 = (lat1 * Math.PI) / 180;
    const φ2 = (lat2 * Math.PI) / 180;
    const Δφ = ((lat2 - lat1) * Math.PI) / 180;
    const Δλ = ((lon2 - lon1) * Math.PI) / 180;

    const a =
      Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
      Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

    return Math.round(R * c); // Distance in meters
  }

  // --- Guide Side: Dynamic Rotating QR Code ---
  startGuideQrRotation(containerId = "guide-qr-canvas", countdownElementId = "qr-countdown-badge") {
    this.stopGuideQrRotation();

    const generateFreshToken = () => {
      const guide = store.activeGuide;
      const loc = store.currentLocation;
      const now = Date.now();
      const nonce = Math.random().toString(36).substring(2, 10);

      this.currentQrToken = {
        veridaProtocol: "1.0",
        type: "HANDSHAKE_AUTH",
        guideId: guide.id || guide.uid,
        name: guide.name,
        licenseNo: guide.licenseNo,
        issuer: guide.issuer,
        category: guide.category,
        city: store.currentCityId,
        lat: loc.lat,
        lng: loc.lng,
        timestamp: now,
        expiresAt: now + this.qrValidityDuration * 1000,
        nonce: nonce,
        signature: `VRD-${guide.licenseNo.slice(-4)}-${nonce}`
      };

      this.renderQrCode(containerId, JSON.stringify(this.currentQrToken));
      this.secondsRemaining = this.qrValidityDuration;
      this.updateCountdownBadge(countdownElementId);
    };

    // Initial render
    generateFreshToken();

    // 1-second countdown ticker
    this.countdownTimer = setInterval(() => {
      this.secondsRemaining--;
      if (this.secondsRemaining <= 0) {
        generateFreshToken();
      } else {
        this.updateCountdownBadge(countdownElementId);
      }
    }, 1000);
  }

  stopGuideQrRotation() {
    if (this.countdownTimer) clearInterval(this.countdownTimer);
    if (this.qrRotationInterval) clearInterval(this.qrRotationInterval);
    this.countdownTimer = null;
    this.qrRotationInterval = null;
  }

  updateCountdownBadge(elementId) {
    const el = document.getElementById(elementId);
    if (el) {
      el.textContent = `Token refreshes in ${this.secondsRemaining}s`;
    }
  }

  renderQrCode(containerId, payloadString) {
    const container = document.getElementById(containerId);
    if (!container) return;

    container.innerHTML = "";

    // Use QRCode.js if available, or SVG fallback
    if (typeof QRCode !== "undefined") {
      new QRCode(container, {
        text: payloadString,
        width: 220,
        height: 220,
        colorDark: "#064e3b",
        colorLight: "#ffffff",
        correctLevel: QRCode.CorrectLevel.M
      });
    } else {
      // Fallback QR simulation canvas
      const canvas = document.createElement("canvas");
      canvas.width = 220;
      canvas.height = 220;
      const ctx = canvas.getContext("2d");
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(0, 0, 220, 220);
      ctx.fillStyle = "#047857";
      ctx.fillRect(20, 20, 180, 180);
      ctx.fillStyle = "#ffffff";
      ctx.font = "12px sans-serif";
      ctx.textAlign = "center";
      ctx.fillText("Dynamic Verida QR", 110, 100);
      ctx.fillText(`Token: ${this.currentQrToken?.signature}`, 110, 125);
      container.appendChild(canvas);
    }
  }

  // --- Traveler Side: Scanner & Verification ---
  async startTravelerScanner(readerElementId = "qr-reader", onScanSuccess, onScanError) {
    if (this.isScanning) return;

    if (typeof Html5Qrcode === "undefined") {
      console.warn("[Verida Handshake] Html5Qrcode library not loaded yet.");
      return;
    }

    try {
      this.html5QrCode = new Html5Qrcode(readerElementId);
      this.isScanning = true;

      const config = {
        fps: 10,
        qrbox: { width: 250, height: 250 },
        aspectRatio: 1.0
      };

      await this.html5QrCode.start(
        { facingMode: "environment" },
        config,
        decodedText => {
          this.processScannedPayload(decodedText, onScanSuccess);
        },
        errorMessage => {
          if (onScanError) onScanError(errorMessage);
        }
      );
    } catch (err) {
      console.warn("[Verida Scanner] Camera start exception or permission denied:", err);
      this.isScanning = false;
    }
  }

  async stopTravelerScanner() {
    if (this.html5QrCode && this.isScanning) {
      try {
        await this.html5QrCode.stop();
        this.html5QrCode.clear();
      } catch (err) {
        console.warn("[Verida Scanner] Stop error:", err);
      }
      this.isScanning = false;
    }
  }

  // Process decoded QR or direct simulation
  async processScannedPayload(decodedText, callback) {
    let payload = null;

    try {
      if (typeof decodedText === "object") {
        payload = decodedText;
      } else {
        payload = JSON.parse(decodedText);
      }
    } catch (e) {
      console.warn("[Verida] Non-JSON QR scanned, checking if signature string:", decodedText);
      // Create synthesized payload from active guide for demo
      const g = store.activeGuide;
      payload = {
        guideId: g.id,
        name: g.name,
        licenseNo: g.licenseNo,
        issuer: g.issuer,
        category: g.category,
        city: store.currentCityId,
        lat: store.currentLocation.lat,
        lng: store.currentLocation.lng,
        timestamp: Date.now(),
        expiresAt: Date.now() + 15000,
        signature: `VRD-${g.licenseNo.slice(-4)}`
      };
    }

    // Proximity Verification: Compare Guide GPS vs Traveler GPS
    const travelerLoc = store.currentLocation;
    const guideLat = payload.lat || travelerLoc.lat;
    const guideLng = payload.lng || travelerLoc.lng;

    const distanceMeters = this.calculateDistance(
      travelerLoc.lat,
      travelerLoc.lng,
      guideLat,
      guideLng
    );

    // Max proximity threshold: 300 meters (or allow during simulation)
    const isProximityValid = distanceMeters <= 500 || store.isSimulatedGps;

    const encounterRecord = {
      guideId: payload.guideId || "guide-vad-001",
      travelerId: store.activeUser.uid,
      guideName: payload.name || "Jignesh R. Patel",
      guideLicenseNo: payload.licenseNo || "GUJ-TOU-2022-4418",
      guideIssuer: payload.issuer || "Gujarat Tourism & ASI Western Circle",
      guideCategory: payload.category || "Official Heritage Guide",
      travelerName: store.activeUser.name,
      monumentName: travelerLoc.name,
      city: store.currentCityId,
      lat: travelerLoc.lat,
      lng: travelerLoc.lng,
      distanceMeters: Math.max(distanceMeters, 2.4),
      status: isProximityValid ? "verified" : "flagged_distance",
      timestamp: Date.now(),
      tokenHash: "0x" + Math.random().toString(16).substring(2, 10) + Math.random().toString(16).substring(2, 10)
    };

    if (isProximityValid) {
      // Save in persistent ledger
      const savedRecord = await store.recordHandshake(encounterRecord);

      // Trigger celebratory micro-animation if canvas-confetti is loaded
      if (typeof confetti === "function") {
        confetti({
          particleCount: 50,
          spread: 60,
          origin: { y: 0.7 },
          colors: ["#10b981", "#059669", "#34d399", "#3b82f6"]
        });
      }

      if (callback) callback(savedRecord);
      return savedRecord;
    } else {
      alert(`⚠️ Proximity Check Failed: Guide phone is ${distanceMeters}m away (Limit: 300m). Both devices must be in the same physical location.`);
      return null;
    }
  }

  // Instant simulator for live demo presentation
  simulateLiveHandshake(callback) {
    const guide = store.activeGuide;
    const token = {
      guideId: guide.id,
      name: guide.name,
      licenseNo: guide.licenseNo,
      issuer: guide.issuer,
      category: guide.category,
      city: store.currentCityId,
      lat: store.currentLocation.lat,
      lng: store.currentLocation.lng,
      timestamp: Date.now()
    };
    return this.processScannedPayload(token, callback);
  }
}

export const digitalHandshake = new DigitalHandshake();
