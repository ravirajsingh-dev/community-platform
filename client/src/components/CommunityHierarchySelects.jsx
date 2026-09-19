import React from "react";
import { Row, Col, Form } from "react-bootstrap";
import { PropTypes } from "prop-types";
import { useDispatch, useSelector } from "react-redux";
import { FaUsers, FaSitemap, FaLock } from "react-icons/fa";
import { MdFamilyRestroom } from "react-icons/md";
import { BiUser } from "react-icons/bi";
import CustomSelect from "@src/views/Common/CustomSelect";
import Errors from "@src/notifications/Errors";
import { useMasterDataCascade } from "@src/hooks/useMasterDataCascade";
import {
  createCommunity,
  createVansh,
  createKul,
  createKhamp,
  createSubKhamp,
  createGotra,
  fetchCreatableLevels,
} from "@src/actions/masterDataActions";

const HIERARCHY_FIELDS = [
  {
    key: "community",
    label: "Community",
    icon: FaUsers,
    parentKey: null,
    placeholder: "Select community",
    required: true,
    createFn: (dispatch, name) => dispatch(createCommunity(name)),
  },
  {
    key: "vansh",
    label: "Vansh",
    icon: MdFamilyRestroom,
    parentKey: "community",
    placeholder: "Select vansh",
    required: true,
    createFn: (dispatch, name, values) =>
      dispatch(createVansh(values.community?.value, name)),
  },
  {
    key: "kul",
    label: "Kul",
    icon: BiUser,
    parentKey: "vansh",
    placeholder: "Select kul",
    required: true,
    createFn: (dispatch, name, values) =>
      dispatch(createKul(values.vansh?.value, name)),
  },
  {
    key: "gotra",
    label: "Gotra",
    icon: FaSitemap,
    parentKey: "kul",
    placeholder: "Select gotra",
    required: true,
    createFn: (dispatch, name, values) =>
      dispatch(createGotra(values.kul?.value, name)),
  },
  {
    key: "khamp",
    label: "Khamp",
    icon: FaSitemap,
    parentKey: "kul",
    placeholder: "Select khamp",
    required: true,
    createFn: (dispatch, name, values) =>
      dispatch(createKhamp(values.kul?.value, name)),
  },
  {
    key: "subKhamp",
    label: "Sub-Khamp",
    icon: FaSitemap,
    parentKey: "khamp",
    placeholder: "Select sub-khamp",
    required: true,
    createFn: (dispatch, name, values) =>
      dispatch(createSubKhamp(values.khamp?.value, name)),
  },
];

const LOADERS = {
  community: "loadCommunities",
  vansh: "loadVanshes",
  kul: "loadKuls",
  khamp: "loadKhamps",
  subKhamp: "loadSubKhamps",
  gotra: "loadGotras",
};

const CommunityHierarchySelects = ({
  values,
  onSelectChange,
  locked = false,
  disabled = false,
  disabledFields = [],
  isCreatable = false,
  variant = "profile",
  colProps = { xs: 12, md: 6 },
  showRequired = false,
  showErrors = false,
  cascadeEnabled = true,
  className = "",
}) => {
  const dispatch = useDispatch();
  const creatableLevels = useSelector(
    (state) => state.masterDataDropdown.creatableLevels,
  );

  React.useEffect(() => {
    dispatch(fetchCreatableLevels());
  }, [dispatch]);

  const cascade = useMasterDataCascade({
    community: values.community,
    vansh: values.vansh,
    kul: values.kul,
    khamp: values.khamp,
    subKhamp: values.subKhamp,
    enabled: cascadeEnabled,
  });

  const isProfile = variant === "profile";
  const isAccount = variant === "account";
  const labelClassName = isAccount
    ? "form-sub-label"
    : isProfile
      ? "profile-form-label"
      : undefined;

  const handleCreate = async (field, inputValue) => {
    if (!inputValue || !field.createFn) return;
    const result = await field.createFn(
      dispatch,
      inputValue.toUpperCase(),
      values,
    );
    if (result?.status === true && result.response) {
      onSelectChange(field.key, {
        value: result.response.value,
        label: result.response.label,
      });
    }
  };

  return (
    <Row className={`g-3 ${className}`.trim()}>
      {HIERARCHY_FIELDS.map((field) => {
        const Icon = field.icon;
        const parentValue = field.parentKey ? values[field.parentKey] : true;
        const parentId = field.parentKey ? parentValue?.value : null;
        const fieldDisabled =
          disabled ||
          locked ||
          disabledFields.includes(field.key) ||
          (field.parentKey && !parentId);
        const fieldCreatable =
          isCreatable &&
          !locked &&
          !disabledFields.includes(field.key) &&
          creatableLevels.includes(field.key) &&
          (!field.parentKey || !!parentId);
        const loaderKey = LOADERS[field.key];
        const loadOptions = cascade[loaderKey];

        return (
          <Col key={field.key} {...colProps}>
            <Form.Group id={`field-${field.key}`}>
              <Form.Label className={labelClassName}>
                {isProfile && Icon && (
                  <Icon size={18} className="profile-form-label-icon" />
                )}
                {field.label}
                {showRequired &&
                  field.required &&
                  !locked &&
                  !disabledFields.includes(field.key) && (
                    <span className="text-danger"> *</span>
                  )}
                {(locked || disabledFields.includes(field.key)) &&
                  (isProfile || isAccount || variant === "filter") && (
                    <FaLock
                      size={14}
                      className="ms-2 text-muted"
                      title={
                        disabledFields.includes(field.key)
                          ? "Limited to your community"
                          : "This field is locked after first save"
                      }
                    />
                  )}
              </Form.Label>
              <CustomSelect
                key={`${field.key}-${parentId || "none"}`}
                value={values[field.key]}
                onChange={(option) => onSelectChange(field.key, option)}
                loadOptions={loadOptions}
                isCreatable={fieldCreatable}
                isDisabled={fieldDisabled}
                placeholder={field.placeholder}
                onInputChange={async (inputValue, actionMeta) => {
                  if (
                    actionMeta?.action === "create-option" &&
                    inputValue &&
                    fieldCreatable
                  ) {
                    await handleCreate(field, inputValue);
                  }
                }}
              />
              {showErrors && <Errors current_key={field.key} />}
            </Form.Group>
          </Col>
        );
      })}
    </Row>
  );
};

CommunityHierarchySelects.propTypes = {
  values: PropTypes.shape({
    community: PropTypes.object,
    vansh: PropTypes.object,
    kul: PropTypes.object,
    khamp: PropTypes.object,
    subKhamp: PropTypes.object,
    gotra: PropTypes.object,
  }).isRequired,
  onSelectChange: PropTypes.func.isRequired,
  locked: PropTypes.bool,
  disabled: PropTypes.bool,
  disabledFields: PropTypes.arrayOf(PropTypes.string),
  isCreatable: PropTypes.bool,
  variant: PropTypes.oneOf(["profile", "filter", "account"]),
  colProps: PropTypes.object,
  showRequired: PropTypes.bool,
  showErrors: PropTypes.bool,
  cascadeEnabled: PropTypes.bool,
  className: PropTypes.string,
};

export default CommunityHierarchySelects;
