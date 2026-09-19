import React from "react";
import { Button, Form, Container, Row, Col } from "react-bootstrap";
import { useNavigate, useParams } from "react-router-dom";
import { connect } from "react-redux";

import AppBreadCrumb from "@src/view/commonComponents/dataTable/AppBreadCrumb";
import MainCard from "@src/view/commonComponents/mainCard/MainCard";
import BouncingLoader from "@src/view/spinners/BouncingLoader";
import CustomSelect from "@src/components/common/CustomSelect";
import { entityToFormStatus } from "@src/utils/hierarchyStatusUtils";
import {
  fetchActiveCommunities,
  fetchActiveVanshes,
  fetchActiveKuls,
  fetchActiveKhamps,
  fetchActiveSubKhamps,
  toHierarchySelectOptions,
  getHierarchySelectOption,
} from "@src/utils/hierarchyParentFetchers";

const PARENT_FETCHERS = {
  communities: fetchActiveCommunities,
  vanshes: fetchActiveVanshes,
  kuls: fetchActiveKuls,
  khamps: fetchActiveKhamps,
  subKhamps: fetchActiveSubKhamps,
};

const HierarchyEntityForm = ({
  config,
  currentEntity,
  loadingEntity,
  createEntity,
  updateEntity,
  getEntityById,
  resetComponentStore,
}) => {
  const { id } = useParams();
  const navigate = useNavigate();
  const isEditMode = !!id;

  const [formData, setFormData] = React.useState({
    name: "",
    description: "",
    status: "active",
  });
  const [parentValues, setParentValues] = React.useState({});
  const [parentOptions, setParentOptions] = React.useState({});
  const [fieldErrors, setFieldErrors] = React.useState({});
  const [onlyOnce, setOnce] = React.useState(true);
  const [isSubmitting, setIsSubmitting] = React.useState(false);

  React.useEffect(() => {
    if (onlyOnce) {
      resetComponentStore();
      setOnce(false);
    }
    if (isEditMode && id) {
      getEntityById(id);
    }
  }, [isEditMode, id, getEntityById, resetComponentStore, onlyOnce]);

  React.useEffect(() => {
    const loadParentOptions = async () => {
      const options = {};
      for (const parent of config.formParents) {
        if (!parent.dependsOn) {
          const fetcher = PARENT_FETCHERS[parent.fetchKey];
          if (fetcher) {
            options[parent.field] = await fetcher();
          }
        }
      }
      setParentOptions((prev) => ({ ...prev, ...options }));
    };
    loadParentOptions();
  }, [config.formParents]);

  React.useEffect(() => {
    const loadDependentOptions = async () => {
      for (const parent of config.formParents) {
        if (!parent.dependsOn) continue;
        const parentValue = parentValues[parent.dependsOn];
        if (!parentValue) {
          setParentOptions((prev) => ({ ...prev, [parent.field]: [] }));
          continue;
        }
        const fetcher = PARENT_FETCHERS[parent.fetchKey];
        if (fetcher) {
          const items = await fetcher(parentValue);
          setParentOptions((prev) => ({ ...prev, [parent.field]: items }));
        }
      }
    };
    loadDependentOptions();
  }, [config.formParents, parentValues]);

  React.useEffect(() => {
    if (!isEditMode || !currentEntity) return;

    const nextParents = {};
    for (const parent of config.formParents) {
      const raw = currentEntity[parent.field];
      nextParents[parent.field] = raw?._id || raw || "";
    }
    setParentValues(nextParents);
    setFormData({
      name: currentEntity.name || "",
      description: currentEntity.description || "",
      status: entityToFormStatus(currentEntity),
    });
  }, [isEditMode, currentEntity, config.formParents]);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]:
        type === "checkbox"
          ? checked
            ? "active"
            : "inactive"
          : name === "name"
            ? value.toUpperCase()
            : value,
    }));
  };

  const handleParentChange = (field, value) => {
    setFieldErrors((prev) => {
      const next = { ...prev };
      delete next[field];
      return next;
    });
    setParentValues((prev) => {
      const next = { ...prev, [field]: value };
      const parentIndex = config.formParents.findIndex((p) => p.field === field);
      config.formParents.slice(parentIndex + 1).forEach((child) => {
        next[child.field] = "";
      });
      return next;
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    const nextErrors = {};
    for (const parent of config.formParents) {
      if (!parentValues[parent.field]) {
        nextErrors[parent.field] = `Please select ${parent.label}`;
      }
    }

    if (Object.keys(nextErrors).length > 0) {
      setFieldErrors(nextErrors);
      return;
    }

    setFieldErrors({});

    const submitData = {
      name: formData.name,
      description: formData.description,
      status: formData.status,
      ...parentValues,
    };

    setIsSubmitting(true);
    if (isEditMode) {
      await updateEntity(submitData, id, navigate);
    } else {
      await createEntity(submitData, navigate);
    }
    setIsSubmitting(false);
  };

  const statusLocked =
    isEditMode &&
    (currentEntity?.status === "pending" ||
      currentEntity?.status === "rejected");

  if (isEditMode && loadingEntity && !currentEntity) {
    return <BouncingLoader minHeight="300px" />;
  }

  return (
    <Container>
      <AppBreadCrumb
        pageTitle={isEditMode ? `Edit ${config.label}` : `Add ${config.label}`}
        crumbs={[
          { name: "Community Management" },
          { name: config.labelPlural, link: config.listRoute },
          { name: isEditMode ? "Edit" : "Add" },
        ]}
      />

      <MainCard>
        <Form onSubmit={handleSubmit}>
          <Row>
            {config.formParents.map((parent) => (
              <Col md={12} key={parent.field}>
                <Form.Group controlId={parent.field} className="mb-3">
                  <Form.Label>
                    {parent.label} <span className="text-danger">*</span>
                  </Form.Label>
                  <CustomSelect
                    className="entity-form__select"
                    value={getHierarchySelectOption(
                      parentOptions[parent.field] || [],
                      parentValues[parent.field],
                    )}
                    onChange={(option) =>
                      handleParentChange(parent.field, option?.value ?? "")
                    }
                    options={toHierarchySelectOptions(
                      parentOptions[parent.field] || [],
                    )}
                    placeholder={`Select ${parent.label}`}
                    isDisabled={
                      isEditMode ||
                      (parent.dependsOn && !parentValues[parent.dependsOn])
                    }
                    isRequired
                  />
                  {fieldErrors[parent.field] ? (
                    <Form.Text className="form-error-message">
                      {fieldErrors[parent.field]}
                    </Form.Text>
                  ) : null}
                </Form.Group>
              </Col>
            ))}

            <Col md={12}>
              <Form.Group controlId="name" className="mb-3">
                <Form.Label>
                  Name <span className="text-danger">*</span>
                </Form.Label>
                <Form.Control
                  type="text"
                  name="name"
                  value={formData.name}
                  onChange={handleChange}
                  required
                  placeholder={`Enter ${config.label.toLowerCase()} name`}
                />
              </Form.Group>
            </Col>

            <Col md={12}>
              <Form.Group controlId="description" className="mb-3">
                <Form.Label>Description</Form.Label>
                <Form.Control
                  as="textarea"
                  rows={3}
                  name="description"
                  value={formData.description}
                  onChange={handleChange}
                  placeholder="Enter description"
                />
              </Form.Group>
            </Col>

            <Col md={12}>
              <Form.Group controlId="status" className="mb-3">
                <Form.Check
                  type="checkbox"
                  name="status"
                  label="Active"
                  checked={formData.status === "active"}
                  onChange={handleChange}
                  disabled={statusLocked}
                />
              </Form.Group>
            </Col>
          </Row>

          <div className="d-flex gap-2">
            <Button
              type="submit"
              variant="primary"
              disabled={isSubmitting || loadingEntity}
            >
              {isEditMode ? "Update" : "Create"}
            </Button>
            <Button
              type="button"
              variant="secondary"
              onClick={() => navigate(config.listRoute)}
            >
              Cancel
            </Button>
          </div>
        </Form>
      </MainCard>
    </Container>
  );
};

export function createConnectedHierarchyForm(config, actions) {
  const mapStateToProps = (state) => ({
    config,
    currentEntity: state[config.reduxSlice][config.currentStateKey],
    loadingEntity:
      state[config.reduxSlice][config.loadingEntityKey] || false,
  });

  return connect(mapStateToProps, {
    createEntity: actions[config.exportNames.create],
    updateEntity: actions[config.exportNames.update],
    getEntityById: actions[config.exportNames.getById],
    resetComponentStore: actions[config.exportNames.resetStore],
  })(HierarchyEntityForm);
}
