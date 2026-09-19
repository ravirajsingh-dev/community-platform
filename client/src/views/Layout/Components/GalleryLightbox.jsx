import React, { useEffect } from "react";
import PropTypes from "prop-types";
import { createPortal } from "react-dom";

const GalleryLightbox = ({
  photos,
  activeIndex,
  onClose,
  onPrev,
  onNext,
}) => {
  const photo = photos[activeIndex];

  useEffect(() => {
    if (activeIndex < 0 || !photo) {
      return undefined;
    }

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const onKeyDown = (event) => {
      if (event.key === "Escape") {
        onClose();
      } else if (event.key === "ArrowLeft") {
        onPrev();
      } else if (event.key === "ArrowRight") {
        onNext();
      }
    };

    window.addEventListener("keydown", onKeyDown);

    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [activeIndex, photo, onClose, onPrev, onNext]);

  if (activeIndex < 0 || !photo) {
    return null;
  }

  const hasPrev = activeIndex > 0;
  const hasNext = activeIndex < photos.length - 1;

  return createPortal(
    <div
      className="gallery-lightbox"
      role="dialog"
      aria-modal="true"
      aria-label="Gallery image viewer"
      onClick={onClose}
    >
      <button
        type="button"
        className="gallery-lightbox__close"
        aria-label="Close"
        onClick={onClose}
      >
        ×
      </button>

      <button
        type="button"
        className="gallery-lightbox__nav gallery-lightbox__nav--prev"
        aria-label="Previous image"
        disabled={!hasPrev}
        onClick={(event) => {
          event.stopPropagation();
          onPrev();
        }}
      >
        ‹
      </button>

      <div
        className="gallery-lightbox__image-wrap"
        onClick={(event) => event.stopPropagation()}
      >
        <img
          src={photo.src}
          alt={photo.alt}
          className="gallery-lightbox__image"
        />
      </div>

      <button
        type="button"
        className="gallery-lightbox__nav gallery-lightbox__nav--next"
        aria-label="Next image"
        disabled={!hasNext}
        onClick={(event) => {
          event.stopPropagation();
          onNext();
        }}
      >
        ›
      </button>

      <span className="gallery-lightbox__counter">
        {activeIndex + 1} / {photos.length}
      </span>
    </div>,
    document.body
  );
};

GalleryLightbox.propTypes = {
  photos: PropTypes.arrayOf(
    PropTypes.shape({
      src: PropTypes.string.isRequired,
      alt: PropTypes.string,
      key: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
    })
  ).isRequired,
  activeIndex: PropTypes.number.isRequired,
  onClose: PropTypes.func.isRequired,
  onPrev: PropTypes.func.isRequired,
  onNext: PropTypes.func.isRequired,
};

export default GalleryLightbox;
