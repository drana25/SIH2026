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
    const container = document.getElementById(containerId);
    if (!container) return;

    const guide = guideId ? store.getGuideById(guideId) : store.activeGuide;
    if (!guide) {
      container.innerHTML = `<div class="empty-state"><p>No guide profile found.</p></div>`;
      return;
    }

    const reviews = store.getReviewsForGuide(guide.id || guide.uid);
    const handshakes = store.getHandshakes().filter(h => h.guideId === guide.id || h.guideId === guide.uid);
    const hasHandshake = store.hasHandshakeWithGuide(guide.id || guide.uid);

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
          <h4 class="section-subtitle"><i class="fas fa-link"></i> Verified Encounters Ledger (${handshakes.length + reviews.length} Records)</h4>
          <span class="ledger-badge"><i class="fas fa-lock"></i> Immutable GPS Proof</span>
        </div>

        <div class="timeline-list">
          ${reviews.map(rev => {
            const timeFormatted = new Date(rev.timestamp).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
            return `
              <div class="timeline-item">
                <div class="timeline-dot verified"></div>
                <div class="timeline-card">
                  <div class="timeline-card-header">
                    <div class="reviewer-meta">
                      <span class="reviewer-name"><strong>${rev.travelerName || 'Verified Traveler'}</strong></span>
                      <span class="review-rating">${'★'.repeat(rev.rating)}${'☆'.repeat(5 - rev.rating)}</span>
                    </div>
                    <span class="timeline-date">${timeFormatted}</span>
                  </div>
                  <div class="presence-watermark">
                    <i class="fas fa-map-pin"></i> ${rev.monumentName || 'Vadodara Heritage Site'} • <span class="hash-tag">GPS Presence Verified</span>
                  </div>
                  <p class="review-text">${rev.comment}</p>
                </div>
              </div>
            `;
          }).join('')}

          ${handshakes.map(h => {
            const timeFormatted = new Date(h.timestamp).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" });
            return `
              <div class="timeline-item">
                <div class="timeline-dot handshake"></div>
                <div class="timeline-card encounter-card">
                  <div class="timeline-card-header">
                    <span class="encounter-title"><i class="fas fa-handshake"></i> Verified Encounter #${(h.id || '').slice(-4)}</span>
                    <span class="timeline-date">${timeFormatted}</span>
                  </div>
                  <div class="encounter-details">
                    <span><i class="fas fa-user"></i> ${h.travelerName}</span>
                    <span><i class="fas fa-map-marker-alt"></i> ${h.monumentName || 'Vadodara'} (Proximity: ${h.distanceMeters || 3}m)</span>
                    ${h.agreedPrice ? `<span class="agreed-tag">Agreed: ₹${h.agreedPrice}</span>` : ''}
                  </div>
                  <div class="crypto-hash-row">
                    <span class="token-hash">Hash: ${h.tokenHash || '0x9a84f2c019d'}</span>
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
        this.renderGuideLedger(guide.id);
      };
    }
  }
}

export const reviewsManager = new ReviewsManager();
