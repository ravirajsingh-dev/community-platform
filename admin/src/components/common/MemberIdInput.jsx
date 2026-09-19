import PropTypes from "prop-types";
import { Form } from "react-bootstrap";
import { useMemo } from "react";

import {
  createMemberIdChangeHandler,
  createMemberIdPasteHandler,
  createMemberIdKeyDownHandler,
} from "@src/utils/memberIdFormatter";

/**
 * Member ID input matching client login format: 9999999999-01
 */
const MemberIdInput = ({
  id = "memberId",
  name = "memberId",
  value = "",
  onChange,
  label = "Member ID",
  placeholder = "9999999999-01",
  showHint = false,
  disabled = false,
  className = "",
}) => {
  const handleChange = useMemo(
    () => createMemberIdChangeHandler(onChange, name),
    [onChange, name],
  );
  const handlePaste = useMemo(() => createMemberIdPasteHandler(), []);
  const handleKeyDown = useMemo(
    () => createMemberIdKeyDownHandler(value || "", onChange, name),
    [value, onChange, name],
  );

  return (
    <Form.Group controlId={id}>
      {label ? <Form.Label>{label}</Form.Label> : null}
      <Form.Control
        name={name}
        value={value || ""}
        onChange={handleChange}
        onPaste={handlePaste}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        maxLength={13}
        inputMode="numeric"
        autoComplete="off"
        disabled={disabled}
        className={className}
      />
      {showHint ? (
        <Form.Text className="text-muted">
          10-digit phone number + 2-digit member ID
        </Form.Text>
      ) : null}
    </Form.Group>
  );
};

MemberIdInput.propTypes = {
  id: PropTypes.string,
  name: PropTypes.string,
  value: PropTypes.string,
  onChange: PropTypes.func.isRequired,
  label: PropTypes.string,
  placeholder: PropTypes.string,
  showHint: PropTypes.bool,
  disabled: PropTypes.bool,
  className: PropTypes.string,
};

export default MemberIdInput;
