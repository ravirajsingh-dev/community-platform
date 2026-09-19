import PropTypes from "prop-types";
import ScrollReveal from "./ScrollReveal";

const HomeSectionHeader = ({
  label,
  title,
  description,
  align = "center",
  className = "",
}) => (
  <ScrollReveal
    className={`home-section-header home-section-header--${align} ${className}`.trim()}
  >
    {label ? (
      <span className="home-section-header__label">{label}</span>
    ) : null}
    {title ? <h2 className="home-section-header__title">{title}</h2> : null}
    {description ? (
      <p className="home-section-header__desc">{description}</p>
    ) : null}
    <span className="home-section-header__line" aria-hidden="true" />
  </ScrollReveal>
);

HomeSectionHeader.propTypes = {
  label: PropTypes.string,
  title: PropTypes.node,
  description: PropTypes.string,
  align: PropTypes.oneOf(["center", "left"]),
  className: PropTypes.string,
};

export default HomeSectionHeader;
