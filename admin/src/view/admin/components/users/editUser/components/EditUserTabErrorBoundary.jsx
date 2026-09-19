import React from "react";
import PropTypes from "prop-types";
import { Alert, Button } from "react-bootstrap";

class EditUserTabErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error, info) {
    console.error("Edit User tab error:", error, info);
  }

  handleRetry = () => {
    this.setState({ hasError: false });
  };

  render() {
    const { children, tabLabel } = this.props;

    if (this.state.hasError) {
      return (
        <Alert variant="danger" className="mb-0">
          <Alert.Heading>Something went wrong</Alert.Heading>
          <p className="mb-3">
            {tabLabel
              ? `The ${tabLabel} tab failed to load. Other tabs are still available.`
              : "This tab failed to load. Other tabs are still available."}
          </p>
          <Button variant="outline-danger" size="sm" onClick={this.handleRetry}>
            Try again
          </Button>
        </Alert>
      );
    }

    return children;
  }
}

EditUserTabErrorBoundary.propTypes = {
  children: PropTypes.node.isRequired,
  tabLabel: PropTypes.string,
};

export default EditUserTabErrorBoundary;
