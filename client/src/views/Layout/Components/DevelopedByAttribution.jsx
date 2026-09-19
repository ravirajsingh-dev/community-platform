import PropTypes from "prop-types";

const normalizePortfolioLink = (url) => {
  const trimmed = String(url || "").trim();
  if (!trimmed) return "";

  const normalized = /^https?:\/\//i.test(trimmed)
    ? trimmed
    : `https://${trimmed}`;

  try {
    const parsed = new URL(normalized);
    if (!["http:", "https:"].includes(parsed.protocol)) return "";
    return normalized;
  } catch {
    return "";
  }
};

const DevelopedByAttribution = ({ text, link }) => {
  const developedBy = String(text || "").trim();
  const portfolioLink = normalizePortfolioLink(link);

  if (!developedBy) return null;

  return (
    <p
      className={`site-footer-developed-by${
        portfolioLink ? " site-footer-developed-by--linked" : ""
      }`}
    >
      {portfolioLink ? (
        <a
          href={portfolioLink}
          target="_blank"
          rel="noopener noreferrer"
          className="site-footer-developed-by__link"
        >
          <span className="site-footer-developed-by__text">{developedBy}</span>
          <span className="site-footer-developed-by__icon" aria-hidden="true">
            ↗
          </span>
        </a>
      ) : (
        developedBy
      )}
    </p>
  );
};

DevelopedByAttribution.propTypes = {
  text: PropTypes.string,
  link: PropTypes.string,
};

export default DevelopedByAttribution;
