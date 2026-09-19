import React, { useEffect, useState } from "react";
import PropTypes from "prop-types";
import AdvancedModal from "@src/views/Common/Modal/AdvancedModal";

const SLIDER_INTERVAL_MS = 3500;

const getNewsImages = (newsItem) => {
  if (Array.isArray(newsItem?.images) && newsItem.images.length > 0) {
    return newsItem.images.map((img) => img.imageUrl || img).filter(Boolean);
  }
  if (newsItem?.imageUrl) {
    return [newsItem.imageUrl];
  }
  return [];
};

const formatNewsDate = (createdAt) => {
  if (!createdAt) {
    return "News Details";
  }

  return new Date(createdAt).toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
};

const NewsDetailsModal = ({ show, onHide, newsItem }) => {
  const [activeIndex, setActiveIndex] = useState(0);
  const images = getNewsImages(newsItem);
  const hasMultiple = images.length > 1;

  useEffect(() => {
    if (show) {
      setActiveIndex(0);
    }
  }, [show, newsItem?._id]);

  useEffect(() => {
    if (!show || !hasMultiple) {
      return undefined;
    }

    const timer = setInterval(() => {
      setActiveIndex((prev) => (prev + 1) % images.length);
    }, SLIDER_INTERVAL_MS);

    return () => clearInterval(timer);
  }, [show, hasMultiple, images.length, activeIndex]);

  if (!newsItem) {
    return null;
  }

  const handleDotClick = (index) => {
    setActiveIndex(index);
  };

  return (
    <AdvancedModal
      show={show}
      onHide={onHide}
      title={formatNewsDate(newsItem.createdAt)}
      size="lg"
      closeButton
      className="news-details-modal"
      bodyClassName="news-details-modal-body"
    >
      {newsItem.title ? (
        <p className="news-details-title">{newsItem.title}</p>
      ) : null}

      {images.length > 0 ? (
        <div className="news-details-slider">
          <div className="news-details-image-frame">
            {images.map((url, index) => (
              <img
                key={`${newsItem._id || "news"}-${url}-${index}`}
                src={url}
                alt={newsItem.title || "News"}
                className={`news-details-image ${
                  index === activeIndex ? "is-active" : ""
                }`}
              />
            ))}
          </div>

          {hasMultiple ? (
            <div className="news-details-dots" role="tablist" aria-label="News images">
              {images.map((_, index) => (
                <button
                  key={`dot-${index}`}
                  type="button"
                  className={`news-details-dot ${
                    index === activeIndex ? "is-active" : ""
                  }`}
                  onClick={() => handleDotClick(index)}
                  aria-label={`View image ${index + 1}`}
                  aria-selected={index === activeIndex}
                />
              ))}
            </div>
          ) : null}
        </div>
      ) : null}

      <div className="news-details-content">
        {newsItem.description ? (
          <p className="news-details-description text-preserve-line-breaks">
            {newsItem.description}
          </p>
        ) : (
          <p className="news-details-description text-muted">
            No description available.
          </p>
        )}
      </div>
    </AdvancedModal>
  );
};

NewsDetailsModal.propTypes = {
  show: PropTypes.bool.isRequired,
  onHide: PropTypes.func.isRequired,
  newsItem: PropTypes.shape({
    _id: PropTypes.string,
    title: PropTypes.string,
    description: PropTypes.string,
    imageUrl: PropTypes.string,
    images: PropTypes.array,
    createdAt: PropTypes.string,
  }),
};

NewsDetailsModal.defaultProps = {
  newsItem: null,
};

export default NewsDetailsModal;
