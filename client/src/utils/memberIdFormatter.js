/**
 * Utility functions for formatting and validating Member ID input
 * Format: <10-digit-phone>-<2-digit-sequence> (e.g., 9876543210-01)
 * Total length: Exactly 13 characters
 */

// Regex pattern for valid Member ID format
export const MEMBER_ID_REGEX = /^[0-9]{10}-[0-9]{2}$/;

/**
 * Validates if the Member ID format is correct and sequence is valid (01-99)
 * @param {string} value - The Member ID value to validate
 * @returns {boolean} - True if valid, false otherwise
 */
export const isValidMemberIdFormat = (value) => {
  if (!value) return false;
  if (!MEMBER_ID_REGEX.test(value)) return false;

  // Validate sequence is 01-99 (not 00)
  const parts = value.split("-");
  if (parts.length !== 2) return false;
  const sequence = parts[1];
  if (sequence.length !== 2) return false;
  const sequenceNum = parseInt(sequence, 10);
  return sequenceNum >= 1 && sequenceNum <= 99;
};

/**
 * Formats input value by removing non-numeric characters except dash
 * and ensuring proper format
 * @param {string} value - Raw input value
 * @returns {string} - Formatted value
 */
export const formatMemberIdInput = (value) => {
  if (!value) return "";

  // Remove all characters except digits and dash
  let cleaned = value.replace(/[^0-9-]/g, "");

  // Remove multiple dashes, keep only the first one
  const dashIndex = cleaned.indexOf("-");
  if (dashIndex !== -1) {
    cleaned =
      cleaned.substring(0, dashIndex + 1) +
      cleaned.substring(dashIndex + 1).replace(/-/g, "");
  }

  // Split into parts
  const parts = cleaned.split("-");
  const phonePart = parts[0] || "";
  const sequencePart = parts[1] || "";

  // Limit phone part to 10 digits
  const phoneDigits = phonePart.substring(0, 10);

  // Limit sequence part to 2 digits
  let sequenceDigits = sequencePart.substring(0, 2);

  // Prevent "00" - if sequence is "00", convert to "01" (minimum valid value)
  if (sequenceDigits === "00") {
    sequenceDigits = "01";
  }

  // Build formatted value
  let formatted = phoneDigits;

  // Auto-insert dash after 10 digits
  if (phoneDigits.length === 10) {
    formatted += "-";
    formatted += sequenceDigits;
  }

  return formatted;
};

/**
 * Creates a change handler for Member ID / Referral ID input
 * @param {Function} baseOnChange - The original onChange handler from the component
 * @param {string} fieldName - The field name (e.g., 'memberId', 'referralId')
 * @returns {Function} - The formatted change handler
 */
export const createMemberIdChangeHandler = (baseOnChange, fieldName) => {
  return (e) => {
    const input = e.target;
    const value = input.value;
    const cursorPosition = input.selectionStart;

    // Format the value
    const formatted = formatMemberIdInput(value);

    // Calculate cursor position after formatting
    // Count digits before cursor in original value
    const beforeCursor = value.substring(0, cursorPosition);
    const digitsBeforeCursor = beforeCursor.replace(/[^0-9]/g, "").length;

    let newCursorPosition = cursorPosition;

    // If we have 10 digits and dash was auto-inserted, cursor should be after dash (position 11)
    if (
      digitsBeforeCursor === 10 &&
      formatted.length >= 11 &&
      formatted[10] === "-"
    ) {
      newCursorPosition = 11;
    } else {
      // Find position in formatted value based on digit count
      let digitCount = 0;
      let pos = 0;
      for (let i = 0; i < formatted.length; i++) {
        if (digitCount >= digitsBeforeCursor) {
          break;
        }
        if (formatted[i] === "-") {
          pos++;
        } else {
          digitCount++;
          pos++;
        }
      }
      newCursorPosition = pos;
    }

    // Create synthetic event with formatted value
    const syntheticEvent = {
      ...e,
      target: {
        ...e.target,
        name: fieldName,
        value: formatted,
      },
    };

    // Call the base onChange handler
    baseOnChange(syntheticEvent);

    // Set cursor position after React updates
    setTimeout(() => {
      input.setSelectionRange(newCursorPosition, newCursorPosition);
    }, 0);
  };
};

/**
 * Creates a paste handler for Member ID / Referral ID input
 * @returns {Function} - The paste handler
 */
export const createMemberIdPasteHandler = () => {
  return (e) => {
    const pastedText = e.clipboardData.getData("text/plain");
    if (!pastedText || !pastedText.trim()) return;

    const cleanedPasted = formatMemberIdInput(pastedText.trim());

    // Only allow paste if it matches exact format (13 chars: 10 digits + dash + 2 digits)
    if (cleanedPasted && isValidMemberIdFormat(cleanedPasted)) {
      // Valid paste, allow it (will be handled by onChange)
      return;
    }

    // Prevent invalid paste
    e.preventDefault();
  };
};

/**
 * Creates a keyDown handler for Member ID / Referral ID input
 * @param {string} currentValue - Current input value
 * @param {Function} baseOnChange - The original onChange handler
 * @param {string} fieldName - The field name
 * @returns {Function} - The keyDown handler
 */
export const createMemberIdKeyDownHandler = (
  currentValue,
  baseOnChange,
  fieldName,
) => {
  return (e) => {
    const input = e.target;
    const cursorPosition = input.selectionStart;
    const selectionEnd = input.selectionEnd;
    const isSelection = cursorPosition !== selectionEnd;

    // Prevent typing dash manually
    if (e.key === "-") {
      e.preventDefault();
      return;
    }

    // Handle backspace
    if (e.key === "Backspace" && !isSelection) {
      // If cursor is right after dash (position 11), skip over dash and delete digit before it
      if (
        cursorPosition === 11 &&
        currentValue.length >= 11 &&
        currentValue[10] === "-"
      ) {
        e.preventDefault();
        const newValue =
          currentValue.substring(0, 9) + currentValue.substring(11);
        const formatted = formatMemberIdInput(newValue);

        // Create synthetic event for onChange
        const syntheticEvent = {
          ...e,
          target: {
            ...input,
            name: fieldName,
            value: formatted,
          },
        };

        baseOnChange(syntheticEvent);

        setTimeout(() => {
          input.setSelectionRange(9, 9);
        }, 0);
        return;
      }
    }

    // Handle delete
    if (e.key === "Delete" && !isSelection) {
      // If cursor is right before dash (position 10), skip over dash and delete digit after it
      if (
        cursorPosition === 10 &&
        currentValue.length >= 11 &&
        currentValue[10] === "-"
      ) {
        e.preventDefault();
        const newValue =
          currentValue.substring(0, 10) + currentValue.substring(12);
        const formatted = formatMemberIdInput(newValue);

        // Create synthetic event for onChange
        const syntheticEvent = {
          ...e,
          target: {
            ...input,
            name: fieldName,
            value: formatted,
          },
        };

        baseOnChange(syntheticEvent);

        setTimeout(() => {
          input.setSelectionRange(10, 10);
        }, 0);
        return;
      }
    }
  };
};
