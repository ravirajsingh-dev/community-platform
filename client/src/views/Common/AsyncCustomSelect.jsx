import PropTypes from "prop-types";
import CustomSelect from "@src/views/Common/CustomSelect";

/**
 * Backward-compatible wrapper for pages that pass static `options` arrays.
 * Uses rajwada CustomSelect styling under the hood.
 */
const AsyncCustomSelect = ({
  options = [],
  isLoading = false,
  ...props
}) => (
  <CustomSelect options={options} isLoading={isLoading} {...props} />
);

AsyncCustomSelect.propTypes = {
  options: PropTypes.array,
  isLoading: PropTypes.bool,
};

export default AsyncCustomSelect;
