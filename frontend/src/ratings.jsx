import React, { useState, useRef, useEffect } from "react";
import {
  Star, Loader2,
} from "lucide-react";
import { apiFetch } from "./api";
import { Header } from "./shared";
import { FONT_DISPLAY, OWNER_THEME_GRADIENT, colors } from "./theme";

function RatingPopup({ booking, token, onDone, onLater }) {
  return (
    <div
      className="fixed inset-0 flex items-center justify-center px-4"
      style={{ background: "rgba(0,0,0,0.5)", zIndex: 50 }}
    >
      <div
        className="w-full max-w-sm rounded-2xl p-5"
        style={{ background: colors.bg, border: `2px solid ${colors.hairline}` }}
      >
        <h3 style={{ fontFamily: FONT_DISPLAY, color: colors.cream, fontSize: "1.2rem", fontWeight: 700 }}>
          How was your visit?
        </h3>
        <p className="text-sm mt-1" style={{ color: colors.creamDim }}>
          {booking.salon_name} \u2014 {booking.service_name}
        </p>
        <div className="mt-4">
          <StarSlideRating booking={booking} token={token} onDone={onDone} />
        </div>
        <button
          onClick={onLater}
          className="mt-4 text-xs underline"
          style={{ color: colors.creamDim }}
        >
          Later
        </button>
      </div>
    </div>
  );
}



function TierStars({ fiveStarCount = 0, size = 20 }) {
  const tiers = [20, 50, 100, 200, 400];
  const filled = tiers.filter((t) => fiveStarCount >= t).length;
  return (
    <div className="flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map((i) => (
        <Star
          key={i}
          size={size}
          fill={i <= filled ? colors.gold : "none"}
          color={i <= filled ? colors.gold : colors.hairline}
        />
      ))}
    </div>
  );
}



function RatingsReviewsView({ token, onBack }) {
  const [stats, setStats] = useState(null);
  const [reviews, setReviews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!token) return;
    (async () => {
      try {
        const mine = await apiFetch("/salons/mine", { headers: { Authorization: `Bearer ${token}` } });
        const salon = mine[0];
        if (!salon) {
          setError("No salon found.");
          setLoading(false);
          return;
        }
        const data = await apiFetch(`/salons/${salon.id}/reviews`, { headers: { Authorization: `Bearer ${token}` } });
        setStats({ rating: data.rating, reviewCount: data.reviewCount, fiveStarCount: data.fiveStarCount });
        setReviews(data.reviews);
      } catch (e) {
        setError("Couldn't load ratings.");
      } finally {
        setLoading(false);
      }
    })();
  }, [token]);

  return (
    <div className="pb-8 transition-[background] duration-500" style={{ background: OWNER_THEME_GRADIENT }}>
      <Header title="Ratings & Reviews" onBack={onBack} />
      <div className="px-4 max-w-xl mx-auto w-full">
        {loading && (
          <div className="flex justify-center pt-8">
            <Loader2 size={28} className="animate-spin" color={colors.creamDim} />
          </div>
        )}
        {error && (
          <p className="text-sm mt-4" style={{ color: "#E07A5F" }}>{error}</p>
        )}
        {stats && (
          <div className="mt-4 rounded-2xl p-4" style={{ border: `2px solid ${colors.hairline}` }}>
            <TierStars fiveStarCount={stats.fiveStarCount} size={26} />
            <p className="text-sm mt-2" style={{ color: colors.creamDim }}>
              {stats.fiveStarCount} five-star rating{stats.fiveStarCount !== 1 ? "s" : ""} received
            </p>
            <p className="text-xs mt-1" style={{ color: colors.creamDim }}>
              Your real average: {stats.rating ?? "No ratings yet"} {stats.rating ? `(${stats.reviewCount} review${stats.reviewCount !== 1 ? "s" : ""})` : ""}
            </p>
          </div>
        )}
        {!loading && !error && reviews.length === 0 && (
          <p className="text-sm mt-6" style={{ color: colors.creamDim }}>No reviews yet.</p>
        )}
        <div className="mt-4 flex flex-col gap-3">
          {reviews.map((r) => (
            <div key={r.id} className="rounded-xl p-3" style={{ border: `2px solid ${colors.hairline}` }}>
              <div className="flex items-center justify-between">
                <span className="text-sm font-semibold" style={{ color: colors.cream }}>{r.customer_name}</span>
                <span className="text-xs" style={{ color: colors.gold }}>
                  {"\u2605".repeat(r.rating)}{"\u2606".repeat(5 - r.rating)}
                </span>
              </div>
              {r.comment && (
                <p className="text-sm mt-1" style={{ color: colors.creamDim }}>{r.comment}</p>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}




function StarSlideRating({ booking, token, onDone }) {
  const [stars, setStars] = useState(1);
  const [dragging, setDragging] = useState(false);
  const [dragX, setDragX] = useState(0);
  const [phase, setPhase] = useState("slide"); // slide | comment | done
  const [comment, setComment] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);
  const trackRef = useRef(null);
  const trackWidthRef = useRef(0);
  const handleSize = 28;
  const numStars = 5;

  function xFromStars(s, maxX) {
    if (maxX <= 0) return 0;
    return ((s - 1) / (numStars - 1)) * maxX;
  }

  function starsFromX(x, maxX) {
    if (maxX <= 0) return 5;
    const ratio = Math.max(0, Math.min(1, x / maxX));
    return Math.max(1, Math.min(5, Math.round(ratio * (numStars - 1)) + 1));
  }

  useEffect(() => {
    if (trackRef.current) {
      trackWidthRef.current = trackRef.current.offsetWidth;
      setDragX(xFromStars(1, trackWidthRef.current - handleSize));
    }
  }, []);

  function handlePointerDown() {
    setDragging(true);
  }

  function handlePointerMove(e) {
    if (!dragging) return;
    const rect = trackRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left - handleSize / 2;
    const maxX = trackWidthRef.current - handleSize;
    const clampedX = Math.max(0, Math.min(maxX, x));
    setDragX(clampedX);
    setStars(starsFromX(clampedX, maxX));
  }

  function handlePointerUp() {
    if (!dragging) return;
    setDragging(false);
    const maxX = trackWidthRef.current - handleSize;
    setDragX(xFromStars(stars, maxX));
    setPhase("comment");
  }

  async function submitRating(finalComment) {
    setSubmitting(true);
    setError(null);
    try {
      await apiFetch("/reviews", {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          salon_id: booking.salon_id,
          booking_id: booking.id,
          rating: stars,
          comment: finalComment || undefined,
        }),
      });
      setPhase("done");
      onDone && onDone(stars);
    } catch (e) {
      setError("Couldn't save that rating. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  if (phase === "done") {
    return (
      <p className="text-xs mt-2" style={{ color: colors.green }}>
        Thanks for rating {booking.salon_name}! You gave {stars} star{stars !== 1 ? "s" : ""}.
      </p>
    );
  }

  if (phase === "comment") {
    return (
      <div className="mt-2">
        <p className="text-xs mb-1" style={{ color: colors.creamDim }}>
          You rated {booking.salon_name} {stars} star{stars !== 1 ? "s" : ""}. Add a comment? (optional)
        </p>
        <textarea
          value={comment}
          onChange={(e) => setComment(e.target.value)}
          className="w-full text-xs p-2 rounded-lg"
          style={{ border: `2px solid ${colors.hairline}` }}
          rows={2}
          placeholder="Write a review..."
        />
        {error && (
          <p className="text-xs mt-1" style={{ color: "#E07A5F" }}>{error}</p>
        )}
        <div className="flex gap-2 mt-2">
          <button
            onClick={() => submitRating(comment)}
            disabled={submitting}
            className="text-xs font-semibold px-3 py-1 rounded-full"
            style={{ background: colors.green, color: "#FFFFFF" }}
          >
            Submit
          </button>
          <button
            onClick={() => submitRating("")}
            disabled={submitting}
            className="text-xs font-semibold px-3 py-1 rounded-full"
            style={{ border: `2px solid ${colors.hairline}`, color: colors.creamDim }}
          >
            Skip
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="mt-2">
      <p className="text-xs mb-1" style={{ color: colors.creamDim }}>
        Rate {booking.salon_name}: {"★".repeat(stars)}{"☆".repeat(5 - stars)}
      </p>
      <div
        ref={trackRef}
        className="relative rounded-full overflow-hidden select-none"
        style={{ width: 160, height: 36, background: colors.panelLight, border: `2px solid ${colors.hairline}`, touchAction: "none" }}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerLeave={handlePointerUp}
      >
        <div
          className="absolute inset-y-0 left-0 rounded-full"
          style={{ width: dragX + handleSize, background: colors.green, opacity: 0.35, transition: dragging ? "none" : "width 0.2s ease" }}
        />
        <div
          onPointerDown={handlePointerDown}
          className="absolute top-0 flex items-center justify-center rounded-full cursor-pointer"
          style={{ left: dragX, width: handleSize, height: handleSize, background: colors.green, transition: dragging ? "none" : "left 0.2s ease" }}
        >
          <Star size={16} color="#FFFFFF" />
        </div>
      </div>
    </div>
  );
}

export { RatingPopup, TierStars, RatingsReviewsView, StarSlideRating };