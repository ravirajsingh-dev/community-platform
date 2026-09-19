import PropTypes from "prop-types";

const MIN_HEIGHT_CLASS = {
  "120px": "min-height-120",
  "400px": "min-height-400",
  "500px": "min-height-500",
};

const BouncingLoader = ({
  className = "",
  message = "",
  minHeight,
}) => {
  const minHeightClass = minHeight ? MIN_HEIGHT_CLASS[minHeight] || "" : "";

  return (
    <div
      className={`bouncing-loader-container ${minHeightClass} ${className}`.trim()}
    >
      <div className="bouncing-loader-wrapper">
        <div className="bouncing-loader">
          <div />
          <div />
          <div />
        </div>

        {message ? (
          <p
            className="bouncing-loader-message"
            role="status"
            aria-live="polite"
          >
            {message}
          </p>
        ) : null}
      </div>
    </div>
  );
};

BouncingLoader.propTypes = {
  className: PropTypes.string,
  message: PropTypes.string,
  minHeight: PropTypes.string,
};

export default BouncingLoader;
