import PropTypes from "prop-types";

const BouncingLoader = ({
  className = "",
  message = "",
}) => {
  return (
    <div className={`bouncing-loader-container ${className}`.trim()}>
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
};

export default BouncingLoader;
