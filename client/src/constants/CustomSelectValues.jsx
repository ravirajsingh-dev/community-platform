export const GenderOptions = [
  { label: "Male", value: "male" },
  { label: "Female", value: "female" },
  { label: "Other", value: "other" },
];

export const GenderFilterOptions = [
  { label: "Any", value: "" },
  ...GenderOptions,
];

export const MaritalStatusOptions = [
  { label: "Single", value: "single" },
  { label: "Married", value: "married" },
  { label: "Remarried", value: "remarried" },
  { label: "Divorced", value: "divorced" },
  { label: "Widowed", value: "widowed" },
  { label: "Separated", value: "separated" },
];

export const MaritalStatusFilterOptions = [
  { label: "Any", value: "" },
  ...MaritalStatusOptions,
];

export const CommunityScopeOptions = [
  { label: "My Community", value: "my_community" },
  { label: "All Communities", value: "all" },
];

export const Spouse2ModeOptions = [
  { label: "Existing", value: "existing" },
  { label: "New", value: "new" },
];

export const ChildModeOptions = [
  { label: "New", value: "new" },
  { label: "Existing", value: "existing" },
];

export const getOptionByValue = (options, value) => {
  if (value == null || value === "") return null;
  return (
    options.find((item) => String(item.value) === String(value)) || {
      label: String(value),
      value: String(value),
    }
  );
};
