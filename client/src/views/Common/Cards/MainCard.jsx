import PropTypes from "prop-types";
import { Card } from "react-bootstrap";

/**
 * Rajwada-style panel card wrapper.
 * Supports dynamic title, custom header, header actions, and table/form variants.
 */
const MainCard = ({
  title,
  header,
  headerActions,
  headerClassName = "",
  children,
  className = "",
  bodyClassName = "",
  variant = "panel",
}) => {
  const cardClassName = [
    variant === "table"
      ? "entity-table-card"
      : variant === "form"
        ? "common-form-card"
        : "common-panel-card",
    className,
  ]
    .filter(Boolean)
    .join(" ");

  if (variant === "form") {
    return (
      <div className={cardClassName}>
        {title ? <h5 className="custom-heading-theam mb-0">{title}</h5> : null}
        {header}
        <div className={bodyClassName || undefined}>{children}</div>
      </div>
    );
  }

  const showHeader = Boolean(title || header || headerActions);
  const resolvedHeaderClassName = [
    headerActions ? "d-flex flex-wrap justify-content-between align-items-center gap-2" : "",
    headerClassName,
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <Card className={cardClassName}>
      {showHeader ? (
        <Card.Header className={resolvedHeaderClassName || undefined}>
          {header ||
            (title ? (
              typeof title === "string" ? (
                title
              ) : (
                title
              )
            ) : null)}
          {headerActions ? (
            <div className="d-flex flex-wrap align-items-center gap-2">
              {headerActions}
            </div>
          ) : null}
        </Card.Header>
      ) : null}
      <Card.Body className={bodyClassName || undefined}>{children}</Card.Body>
    </Card>
  );
};

MainCard.propTypes = {
  title: PropTypes.oneOfType([PropTypes.string, PropTypes.node]),
  header: PropTypes.node,
  headerActions: PropTypes.node,
  headerClassName: PropTypes.string,
  children: PropTypes.node,
  className: PropTypes.string,
  bodyClassName: PropTypes.string,
  variant: PropTypes.oneOf(["panel", "table", "form"]),
};

export default MainCard;
