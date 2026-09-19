import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import PropTypes from "prop-types";
import { connect } from "react-redux";
import { getTopDonations } from "@src/actions/donationActions";
import { TOP_DONATIONS_LIMIT } from "@src/constants";

const AUTO_SCROLL_MIN = 8;

const GREETINGS = [
  "Thank you!",
  "So grateful!",
  "Blessings!",
  "Huge respect!",
  "Heartfelt thanks!",
  "We appreciate you!",
];

const greetingFor = (index) => GREETINGS[index % GREETINGS.length];

const dedupeDonations = (donations) => {
  const byName = new Map();

  donations.forEach((donation) => {
    const name = (donation.donorName || "Guest User").trim();
    const key = name.toLowerCase();
    const existing = byName.get(key);

    if (!existing || Number(donation.amount) > Number(existing.amount)) {
      byName.set(key, { ...donation, donorName: name });
    }
  });

  return Array.from(byName.values()).sort(
    (a, b) => Number(b.amount) - Number(a.amount),
  );
};

const TopDonations = ({
  getTopDonations,
  topDonations,
  loadingTopDonations,
  limit = TOP_DONATIONS_LIMIT,
  className = "",
}) => {
  const viewportRef = useRef(null);
  const trackRef = useRef(null);
  const isManualRef = useRef(false);
  const [isManual, setIsManual] = useState(false);

  isManualRef.current = isManual;

  useEffect(() => {
    getTopDonations(limit);
  }, [getTopDonations, limit]);

  const donations = useMemo(() => {
    const list = Array.isArray(topDonations) ? topDonations : [];
    return dedupeDonations(list);
  }, [topDonations]);

  const shouldScroll = donations.length >= AUTO_SCROLL_MIN;

  const getLoopHeight = useCallback(() => {
    const track = trackRef.current;
    if (!track) {
      return 0;
    }
    return track.scrollHeight / 2;
  }, []);

  const getAnimationDuration = useCallback(
    () => Math.max(donations.length * 2.2, 24),
    [donations.length],
  );

  const applyAutoScroll = useCallback(
    (startOffset = 0) => {
      const track = trackRef.current;
      const viewport = viewportRef.current;
      if (!track || !shouldScroll) {
        return;
      }

      const loopHeight = getLoopHeight();
      if (!loopHeight) {
        return;
      }

      if (viewport) {
        viewport.scrollTop = 0;
      }

      track.style.transform = "none";
      track.style.animation = "none";
      track.style.animationDelay = "";

      requestAnimationFrame(() => {
        const duration = getAnimationDuration();
        const progress = (startOffset % loopHeight) / loopHeight;
        track.style.animation = `homeDonationScrollUp ${duration}s linear infinite`;
        track.style.animationDelay = `-${progress * duration}s`;
      });
    },
    [shouldScroll, getLoopHeight, getAnimationDuration],
  );

  const enableManualScroll = useCallback(() => {
    if (!shouldScroll) {
      return;
    }

    const track = trackRef.current;
    const viewport = viewportRef.current;
    if (!track || !viewport) {
      return;
    }

    const loopHeight = getLoopHeight();
    if (!loopHeight) {
      return;
    }

    const { transform } = getComputedStyle(track);
    const matrix = new DOMMatrix(transform === "none" ? undefined : transform);
    const offset = Math.abs(matrix.m42) % loopHeight;

    track.style.animation = "none";
    track.style.animationDelay = "";
    track.style.transform = "none";
    viewport.scrollTop = offset;
    setIsManual(true);
  }, [shouldScroll, getLoopHeight]);

  const disableManualScroll = useCallback(() => {
    const viewport = viewportRef.current;
    if (!viewport || !shouldScroll) {
      setIsManual(false);
      return;
    }

    const loopHeight = getLoopHeight();
    const offset = loopHeight > 0 ? viewport.scrollTop % loopHeight : 0;

    setIsManual(false);
    applyAutoScroll(offset);
  }, [shouldScroll, getLoopHeight, applyAutoScroll]);

  useEffect(() => {
    const track = trackRef.current;
    if (!track) {
      return;
    }

    if (!shouldScroll) {
      track.style.animation = "none";
      return;
    }

    if (isManualRef.current) {
      return;
    }

    applyAutoScroll(0);
  }, [donations, shouldScroll, applyAutoScroll]);

  useEffect(() => {
    const viewport = viewportRef.current;
    if (!viewport || !shouldScroll || isManual) {
      return undefined;
    }

    const preventWheel = (event) => event.preventDefault();
    viewport.addEventListener("wheel", preventWheel, { passive: false });
    return () => viewport.removeEventListener("wheel", preventWheel);
  }, [shouldScroll, isManual]);

  if (loadingTopDonations) {
    return (
      <div className={`home-donation__supporters ${className}`.trim()}>
        <div className="home-donation__supporters-status">
          Loading top donors…
        </div>
      </div>
    );
  }

  if (donations.length === 0) {
    return (
      <div className={`home-donation__supporters ${className}`.trim()}>
        <div className="home-donation__supporters-status">
          No donations yet. Be the first to support our community!
        </div>
      </div>
    );
  }

  const displayItems = shouldScroll
    ? [...donations, ...donations]
    : donations;

  return (
    <div
      className={`home-donation__supporters ${shouldScroll ? "is-scrolling" : ""} ${className}`.trim()}
    >
      <div
        ref={viewportRef}
        className={`home-donation__supporters-viewport ${isManual ? "is-manual" : ""}`}
        onMouseEnter={enableManualScroll}
        onMouseLeave={disableManualScroll}
        onTouchStart={enableManualScroll}
        onTouchEnd={disableManualScroll}
      >
        <ul className="home-donation__supporters-track" ref={trackRef}>
          {displayItems.map((donation, index) => {
            const name = donation.donorName || "Guest User";
            const amount = Number(donation.amount || 0).toLocaleString("en-IN");
            const originalIndex = index % donations.length;

            return (
              <li
                key={`${donation._id || name}-${index}`}
                className="home-donation__supporter"
              >
                <span className="home-donation__supporter-copy">
                  <span className="home-donation__supporter-greeting">
                    {greetingFor(originalIndex)}
                  </span>
                  <span className="home-donation__supporter-name">{name}</span>
                </span>
                <span className="home-donation__supporter-amount">₹{amount}</span>
              </li>
            );
          })}
        </ul>
      </div>
    </div>
  );
};

TopDonations.propTypes = {
  getTopDonations: PropTypes.func.isRequired,
  topDonations: PropTypes.array,
  loadingTopDonations: PropTypes.bool,
  limit: PropTypes.number,
  className: PropTypes.string,
};

const mapStateToProps = (state) => ({
  topDonations: state.donation.topDonations,
  loadingTopDonations: state.donation.loadingTopDonations,
});

export default connect(mapStateToProps, {
  getTopDonations,
})(TopDonations);
