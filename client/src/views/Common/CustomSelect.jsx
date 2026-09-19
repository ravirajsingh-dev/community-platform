import {
  useState,
  useEffect,
  useCallback,
  useRef,
  useContext,
  useMemo,
} from "react";
import Select from "react-select";
import CreatableSelect from "react-select/creatable";
import FormContext from "react-bootstrap/FormContext";

/** Rank matches so "MA" surfaces before "Diploma" / "Management". */
const getOptionMatchRank = (option, rawInput) => {
  const q = String(rawInput || "")
    .toLowerCase()
    .trim();
  if (!q) return 0;

  const label = String(option?.label ?? "").toLowerCase();
  const value = String(option?.value ?? "").toLowerCase();
  const tokens = label.split(/[\s,/()|+.-]+/).filter(Boolean);

  if (label === q || value === q) return 0;
  if (tokens.some((t) => t === q)) return 1;
  if (label.startsWith(q) || value.startsWith(q)) return 2;
  // Short queries (e.g. "MA") skip loose prefix-on-token to avoid "Management"
  if (q.length >= 3 && tokens.some((t) => t.startsWith(q))) return 3;
  if (q.length >= 3 && (label.includes(q) || value.includes(q))) return 4;
  return -1;
};

const defaultFilterOption = (option, inputVal) => {
  if (!inputVal) return true;
  const data = option?.data ?? option;
  return getOptionMatchRank(data, inputVal) >= 0;
};

const CustomSelect = ({
  id,
  value,
  onChange,
  loadOptions,
  options: externalOptions,
  isLoading: externalLoading = false,
  isCreatable = false,
  isMulti = false,
  isDisabled = false,
  isRequired = false,
  placeholder = "Select...",
  error = null,
  className = "",
  cacheOptions = false,
  defaultOptions = false,
  onInputChange = null,
  filterOption = null,
  noOptionsMessage = null,
  formatOptionLabel = null,
  inputUppercase = false,
  selectProps = {},
}) => {
  const { controlId } = useContext(FormContext) || {};
  const inputId = id || controlId;
  const [options, setOptions] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [inputValue, setInputValue] = useState("");
  const loadOptionsRef = useRef(loadOptions);

  useEffect(() => {
    loadOptionsRef.current = loadOptions;
  }, [loadOptions]);

  const fetchOptions = useCallback(async () => {
    const currentLoadOptions = loadOptionsRef.current;
    if (!currentLoadOptions) return;

    setIsLoading(true);
    try {
      const response = await currentLoadOptions();
      let optionsData = [];

      if (response && response.data && Array.isArray(response.data)) {
        optionsData = response.data;
      } else if (response && Array.isArray(response)) {
        optionsData = response;
      } else if (
        response &&
        response.response &&
        Array.isArray(response.response)
      ) {
        optionsData = response.response;
      }

      setOptions(optionsData);
    } catch (fetchError) {
      console.error("Error loading options:", fetchError);
      setOptions([]);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const prevDisabledRef = useRef(undefined);
  useEffect(() => {
    if (Array.isArray(externalOptions)) {
      setOptions(externalOptions);
      return;
    }

    if (!loadOptionsRef.current) return;
    const wasDisabled = prevDisabledRef.current;
    prevDisabledRef.current = isDisabled;

    if (isDisabled) return;

    const initialOpen = wasDisabled === undefined;
    const turnedOn = wasDisabled === true;
    if (initialOpen || turnedOn) {
      fetchOptions();
    }
  }, [externalOptions, isDisabled, fetchOptions]);

  useEffect(() => {
    if (!Array.isArray(externalOptions)) return;
    setOptions(externalOptions);
  }, [externalOptions]);

  const handleChange = (selectedOption) => {
    onChange(selectedOption);
  };

  const handleCreate = async (newInputValue) => {
    if (!isCreatable) return null;

    setIsLoading(true);
    try {
      if (onInputChange) {
        await onInputChange(newInputValue, { action: "create-option" });
        if (loadOptions) {
          try {
            const response = await loadOptions();
            let optionsData = [];

            if (response && response.data && Array.isArray(response.data)) {
              optionsData = response.data;
            } else if (response && Array.isArray(response)) {
              optionsData = response;
            } else if (
              response &&
              response.response &&
              Array.isArray(response.response)
            ) {
              optionsData = response.response;
            }

            setOptions(optionsData);
          } catch (refreshError) {
            console.error("Error refreshing options:", refreshError);
          }
        }
      }
    } catch (createError) {
      console.error("Error creating option:", createError);
    } finally {
      setIsLoading(false);
    }
    return null;
  };

  const handleInputChange = useCallback(
    (newValue, actionMeta) => {
      let v = newValue;
      if (inputUppercase && actionMeta?.action === "input-change") {
        v = String(newValue ?? "").toUpperCase();
      }
      setInputValue(v);
      if (
        onInputChange &&
        actionMeta?.action !== "input-blur" &&
        actionMeta?.action !== "menu-close"
      ) {
        onInputChange(v, actionMeta);
      }
    },
    [inputUppercase, onInputChange],
  );

  const SelectComponent = isCreatable ? CreatableSelect : Select;

  // Rank exact / prefix matches first (e.g. "MA" before "Diploma" / "Management")
  const displayOptions = useMemo(() => {
    if (filterOption) return options;
    const q = inputValue.trim();
    if (!q) return options;
    return [...options]
      .map((opt) => ({ opt, rank: getOptionMatchRank(opt, q) }))
      .filter((item) => item.rank >= 0)
      .sort((a, b) => {
        if (a.rank !== b.rank) return a.rank - b.rank;
        return String(a.opt.label || "").localeCompare(String(b.opt.label || ""));
      })
      .map((item) => item.opt);
  }, [options, inputValue, filterOption]);

  const userStyles = selectProps.styles || {};
  const mergeStyle = (key, provided, state, extra = {}) => {
    const user = userStyles[key];
    const base =
      typeof user === "function"
        ? user(provided, state)
        : { ...provided, ...(user || {}) };
    return { ...base, ...extra };
  };
  const selectStyles = {
    ...userStyles,
    control: (provided, state) =>
      mergeStyle("control", provided, state, {
        height: "auto",
        minHeight: 46,
        ...(isMulti
          ? {
              alignItems: "flex-start",
              paddingTop: 6,
              paddingBottom: 6,
            }
          : {}),
      }),
    valueContainer: (provided, state) =>
      mergeStyle("valueContainer", provided, state, {
        height: "auto",
        ...(isMulti
          ? {
              flexWrap: "wrap",
              overflow: "visible",
              gap: 4,
              rowGap: 6,
              alignItems: "center",
              alignContent: "flex-start",
            }
          : {}),
      }),
    multiValue: (provided, state) =>
      mergeStyle("multiValue", provided, state, {
        margin: 0,
      }),
    indicatorsContainer: (provided, state) =>
      mergeStyle("indicatorsContainer", provided, state, {
        alignSelf: isMulti ? "flex-start" : "stretch",
        height: "auto",
        minHeight: isMulti ? 34 : 42,
      }),
    menu: (provided, state) => ({
      ...mergeStyle("menu", provided, state),
      zIndex: 9999,
    }),
    menuPortal: (provided, state) => ({
      ...mergeStyle("menuPortal", provided, state),
      zIndex: 9999,
    }),
  };

  const formatCreateLabel = (inputVal) => `Create "${inputVal}"`;

  const defaultFormatOptionLabel = ({ label, status }) => {
    if (formatOptionLabel) {
      return formatOptionLabel({ label, status });
    }
    return (
      <div className="d-flex justify-content-between align-items-center">
        <span>{label}</span>
        {status === "pending" && (
          <span className="badge bg-warning text-dark ms-2 custom-select__pending-badge">
            Pending
          </span>
        )}
      </div>
    );
  };

  return (
    <div className={className}>
      <SelectComponent
        className={`custom-select${inputUppercase ? " custom-select--uppercase" : ""}${error ? " custom-select--error" : ""}`}
        classNamePrefix="custom-select"
        inputId={inputId}
        value={value}
        onChange={handleChange}
        onCreateOption={isCreatable ? handleCreate : undefined}
        options={displayOptions}
        isLoading={externalLoading || isLoading}
        isDisabled={isDisabled}
        isMulti={isMulti}
        isClearable={!isRequired}
        isSearchable={true}
        blurInputOnSelect={!isMulti}
        closeMenuOnSelect={!isMulti}
        placeholder={placeholder}
        inputValue={inputValue}
        onInputChange={handleInputChange}
        filterOption={filterOption || defaultFilterOption}
        noOptionsMessage={noOptionsMessage || (() => "No options available")}
        formatOptionLabel={defaultFormatOptionLabel}
        formatCreateLabel={formatCreateLabel}
        cacheOptions={cacheOptions}
        defaultOptions={defaultOptions}
        menuPortalTarget={
          typeof document !== "undefined" ? document.body : null
        }
        {...selectProps}
        styles={selectStyles}
      />
      {error ? (
        <div className="invalid-feedback d-block">{error}</div>
      ) : null}
    </div>
  );
};

export default CustomSelect;
