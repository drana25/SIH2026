/**
 * Verida — Proof-of-Presence Reviews & Guide Portfolio Ledger (Features #2 & #6)
 * Gated strictly behind verified physical Digital Handshakes.
 */

import { store } from "./store.js";

export class ReviewsManager {
  constructor() {
    this.selectedRating = 5;
  }

  // --- Render Guide Profile & Ledger ---
  renderGuideLedger(guideId = null, containerId = "guide-ledger-container") {
    // Check if we are rendering for dual screen or specific container
    // If no guideId is passed, use activeGuide (usually for Driver view)
    const isPassenger = store.currentRole === "traveler";
    const guide = guideId ? store.getGuideById(guideId) : store.activeGuide;
    
    const container = document.getElementById(containerId);
    if (!container) return;

    if (!guide && !isPassenger) {
      container.innerHTML = `<div class="empty-state"><p>No profile found.</p></div>`;
      return;
    }

    const reviews = guide ? store.getReviewsForGuide(guide.id || guide.uid) : [];
    const handshakes = guide ? store.getHandshakes().filter(h => h.guideId === guide.id || h.guideId === guide.uid) : [];
    const hasHandshake = guide ? store.hasHandshakeWithGuide(guide.id || guide.uid) : false;
    
    // Fetch Digital Footprints for chronological ledger
    let footprints = store.getDigitalFootprints() || [];
    if (guide && !isPassenger) {
       footprints = footprints.filter(f => f.vehicleRegNo === guide.vehicleRegNo);
    } else if (isPassenger) {
       footprints = footprints.filter(f => f.passengerName === store.activeUser.name);
    }
    
    // Sort chronologically (newest first)
    footprints.sort((a, b) => new Date(b.timestamp || b.createdAt) - new Date(a.timestamp || a.createdAt));

    container.innerHTML = `
      <!-- Guide Verified Header Card -->
      <div class="guide-header-card">
        <div class="guide-avatar-wrap">
          <img src="${guide.photo || 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150'}" alt="${guide.name}" class="guide-avatar">
          <div class="verified-tick-badge" title="Government / ASI Verified"><i class="fas fa-check"></i></div>
        </div>
        <div class="guide-info">
          <div class="guide-name-row">
            <h3 class="guide-name">${guide.name}</h3>
            <span class="trust-score-badge"><i class="fas fa-shield-alt"></i> ${guide.trustScore || 98}% Trust Index</span>
          </div>
          <p class="guide-category"><i class="fas fa-id-card"></i> ${guide.category || 'Official Guide'} • <strong>${guide.licenseNo}</strong></p>
          <p class="guide-issuer"><i class="fas fa-university"></i> ${guide.issuer || 'State Tourism Authority'}</p>
          <div class="guide-tags">
            <span class="guide-tag"><i class="fas fa-language"></i> ${(guide.languages || ['English', 'Gujarati', 'Hindi']).join(', ')}</span>
            <span class="guide-tag"><i class="fas fa-clock"></i> ${guide.experienceYears || 8}+ Years Exp</span>
            <span class="guide-tag highlight"><i class="fas fa-handshake"></i> ${guide.encounterCount || 342} Physical Encounters</span>
          </div>
        </div>
      </div>

      <!-- Proof-of-Presence Review Submission Section -->
      <div class="review-submission-box">
        <h4 class="section-subtitle"><i class="fas fa-pen-fancy"></i> Leave a Proof-of-Presence Review</h4>
        
        ${!hasHandshake ? `
          <div class="review-locked-banner">
            <div class="locked-icon"><i class="fas fa-lock"></i></div>
            <div class="locked-info">
              <strong>Review Locked — Physical Handshake Required</strong>
              <p>To eliminate fake online reviews, Verida strictly gates reviews behind a GPS-verified Digital Handshake. Scan this guide's QR code at the monument to unlock review access.</p>
            </div>
          </div>
        ` : `
          <div class="review-unlocked-box animate-fade-in">
            <div class="verified-banner-pill">
              <i class="fas fa-shield-check"></i> GPS Verified Presence Active: ${store.currentLocation.name}
            </div>
            <form id="presence-review-form" class="review-form" onsubmit="event.preventDefault();">
              <div class="rating-stars-row">
                <label>Your Rating:</label>
                <div class="star-picker" id="star-picker">
                  ${[1, 2, 3, 4, 5].map(star => `
                    <button type="button" class="star-btn ${star <= this.selectedRating ? 'active' : ''}" data-star="${star}">
                      <i class="fas fa-star"></i>
                    </button>
                  `).join('')}
                </div>
              </div>
              <div class="form-group">
                <textarea id="review-comment-input" rows="3" placeholder="Share your experience (Guide honesty, fair pricing, historical knowledge)..." required></textarea>
              </div>
              <button type="button" class="btn btn-primary btn-block" id="submit-verified-review-btn">
                <i class="fas fa-paper-plane"></i> Submit Presence-Verified Review
              </button>
            </form>
          </div>
        `}
      </div>

      <!-- Tamper-Evident Verified Ledger Timeline -->
      <div class="ledger-timeline-section">
        <div class="ledger-header">
          <h4 class="section-subtitle"><i class="fas fa-link"></i> Immutable Ledger (${footprints.length} Records)</h4>
          <span class="ledger-badge"><i class="fas fa-lock"></i> Digital Footprints</span>
        </div>

        <div class="timeline-list">
          ${footprints.length === 0 ? '<div class="empty-state" style="padding:16px;text-align:center;">No footprint records found.</div>' : ''}
          ${footprints.map(f => {
            const dateObj = new Date(f.timestamp || f.createdAt || Date.now());
            const dateFormatted = dateObj.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
            const timeFormatted = dateObj.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" });
            
            return `
              <div class="timeline-item">
                <div class="timeline-dot verified"></div>
                <div class="timeline-card encounter-card">
                  <div class="timeline-card-header">
                    <span class="encounter-title"><i class="fas fa-route"></i> Trip: ${f.route || 'Local Route'}</span>
                    <span class="timeline-date">${dateFormatted} • ${timeFormatted}</span>
                  </div>
                  <div class="encounter-details" style="display:flex; flex-direction:column; gap:4px; margin-top:8px;">
                    <span><i class="fas fa-user"></i> <strong>Passenger:</strong> ${f.passengerName}</span>
                    <span><i class="fas fa-taxi"></i> <strong>Driver:</strong> ${f.driverName || 'Unknown'} (${f.vehicleRegNo})</span>
                    <span><i class="fas fa-id-badge"></i> <strong>License:</strong> ${f.rtoLicenseNo || 'N/A'}</span>
                    <span><i class="fas fa-map-marker-alt"></i> <strong>GPS Anchor:</strong> ${f.pickupGps || 'Unavailable'}</span>
                  </div>
                  <div class="crypto-hash-row" style="margin-top:10px;">
                    <span class="token-hash">Footprint ID: ${f.footprintHash}</span>
                  </div>
                </div>
              </div>
            `;
          }).join('')}
        </div>
      </div>
    `;

    this.attachReviewEvents(guide);
  }

  attachReviewEvents(guide) {
    const starPicker = document.getElementById("star-picker");
    if (starPicker) {
      starPicker.querySelectorAll(".star-btn").forEach(btn => {
        btn.addEventListener("click", () => {
          this.selectedRating = parseInt(btn.getAttribute("data-star"), 10);
          starPicker.querySelectorAll(".star-btn").forEach(b => {
            const s = parseInt(b.getAttribute("data-star"), 10);
            b.classList.toggle("active", s <= this.selectedRating);
          });
        });
      });
    }

    const submitBtn = document.getElementById("submit-verified-review-btn");
    const commentInput = document.getElementById("review-comment-input");

    if (submitBtn && commentInput) {
      submitBtn.onclick = async () => {
        const comment = commentInput.value.trim();
        if (!comment) {
          alert("Please enter a short review comment.");
          return;
        }

        const newReview = {
          guideId: guide.id || guide.uid,
          travelerName: store.activeUser.name,
          rating: this.selectedRating,
          monumentName: store.currentLocation.name,
          presenceVerified: true,
          comment: comment,
          timestamp: Date.now()
        };

        await store.recordReview(newReview);
        alert("✅ Proof-of-Presence Review submitted! It is now permanently linked to your verified encounter.");
        this.renderGuideLedger(guide.id, "guide-ledger-container");
        this.renderGuideLedger(guide.id, "guide-self-ledger");
      };
    }
  }
}

export const reviewsManager = new ReviewsManager();
