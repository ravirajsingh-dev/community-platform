import React, { useEffect, useMemo, useState } from "react";
import { PropTypes } from "prop-types";
import { connect } from "react-redux";
import {
  Badge,
  Button,
  Card,
  Col,
  Container,
  Form,
  Row,
} from "react-bootstrap";
import { FaPlus, FaRegEye } from "react-icons/fa";
import { MdEdit } from "react-icons/md";
import { RiDeleteBin5Line } from "react-icons/ri";
import { VscEdit } from "react-icons/vsc";

import { setErrors } from "@src/actions/adminAuth";
import AppBreadCrumb from "@src/view/commonComponents/dataTable/AppBreadCrumb";
import CustomDataTable from "@src/view/commonComponents/dataTable/CustomDataTable";
import MainCard from "@src/view/commonComponents/mainCard/MainCard";
import {
  getCommonSettings,
  updateCommonSettings,
} from "@src/actions/adminCommonSettingsActions";
import BouncingLoader from "@src/view/spinners/BouncingLoader";
import VerificationConfirmModal from "@src/view/admin/modals/VerificationConfirmModal";
import CustomModal from "@src/components/common/Modal/CustomModal";
import Errors from "@src/notifications/Errors";
import { hasPermission } from "@src/utils/permissions";
import { validateForm } from "@src/utils/validation";
import { removeErrors } from "@src/reducers/errors";

const slugify = (value = "") =>
  String(value)
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);

const makeLocalId = () =>
  `cs_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;

const emptyItemForm = () => ({
  label: "",
  slug: "",
  description: "",
  enabled: true,
});

const normalizeMenuItems = (commonSettings = {}) => {
  const items = Array.isArray(commonSettings?.comingSoon?.menuItems)
    ? commonSettings.comingSoon.menuItems
    : [];
  return items
    .slice()
    .sort((a, b) => (a.order ?? 0) - (b.order ?? 0))
    .map((item, index) => ({
      id: item.id || makeLocalId(),
      label: item.label || "",
      slug: item.slug || slugify(item.label || ""),
      description: item.description || "",
      enabled: item.enabled !== false,
      order: typeof item.order === "number" ? item.order : index,
    }));
};

const buildSectionFromSettings = (commonSettings = {}) => {
  const comingSoon = commonSettings.comingSoon || {};
  return {
    enabled: comingSoon.enabled !== false,
    title: comingSoon.title || "Coming Soon",
    description:
      comingSoon.description ||
      "This feature is under development and will be available soon.",
  };
};

const ComingSoonSettings = ({
  getCommonSettings,
  updateCommonSettings,
  setErrors,
  removeErrors,
  adminCommonSettings: {
    commonSettings,
    loadingCommonSettings,
    loadingOnSubmit,
  },
  loggedInUser,
  errorList,
}) => {
  const canEdit = hasPermission(loggedInUser, "application-settings", "edit");

  const [sectionForm, setSectionForm] = useState(buildSectionFromSettings());
  const [isSectionDisabled, setSectionDisabled] = useState(true);
  const [showSectionConfirm, setShowSectionConfirm] = useState(false);

  const [menuItems, setMenuItems] = useState([]);
  const [listParams, setListParams] = useState({
    limit: 50,
    page: 1,
    orderBy: "order",
    ascending: "asc",
    query: "",
  });
  const [showItemModal, setShowItemModal] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [editingItemId, setEditingItemId] = useState(null);
  const [itemForm, setItemForm] = useState(emptyItemForm());
  const [showItemSaveConfirm, setShowItemSaveConfirm] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [pendingDeleteItem, setPendingDeleteItem] = useState(null);
  const [pendingMenuItems, setPendingMenuItems] = useState(null);

  useEffect(() => {
    getCommonSettings();
  }, [getCommonSettings]);

  useEffect(() => {
    if (commonSettings && Object.keys(commonSettings).length > 0) {
      setSectionForm(buildSectionFromSettings(commonSettings));
      setMenuItems(normalizeMenuItems(commonSettings));
    }
  }, [commonSettings]);

  const isSectionReadOnly = isSectionDisabled || !canEdit;

  const onSectionFieldChange = (e) => {
    const { name, value, type, checked } = e.target;
    setSectionForm((prev) => ({
      ...prev,
      [name]: type === "checkbox" ? checked : value,
    }));
  };

  const onSectionSaveClick = () => {
    removeErrors();
    const errors = validateForm(sectionForm, [
      { path: "title", msg: "Page title is required" },
    ]);
    if (errors.length) {
      setErrors(errors);
      return;
    }
    setShowSectionConfirm(true);
  };

  const handleSectionConfirmSave = (txn_password) => {
    updateCommonSettings({
      comingSoon: {
        enabled: sectionForm.enabled,
        title: sectionForm.title.trim() || "Coming Soon",
        description: sectionForm.description.trim(),
      },
      txn_password,
    });
    setShowSectionConfirm(false);
    setSectionDisabled(true);
  };

  const onSectionCancel = () => {
    setSectionForm(buildSectionFromSettings(commonSettings));
    removeErrors();
    setSectionDisabled(true);
  };

  const openAddModal = () => {
    removeErrors();
    setItemForm(emptyItemForm());
    setIsEditMode(false);
    setEditingItemId(null);
    setShowItemModal(true);
  };

  const openEditModal = (item) => {
    removeErrors();
    setItemForm({
      label: item.label || "",
      slug: item.slug || "",
      description: item.description || "",
      enabled: item.enabled !== false,
    });
    setIsEditMode(true);
    setEditingItemId(item.id);
    setShowItemModal(true);
  };

  const closeItemModal = () => {
    setShowItemModal(false);
    setItemForm(emptyItemForm());
    setIsEditMode(false);
    setEditingItemId(null);
    removeErrors();
  };

  const onItemFieldChange = (e) => {
    const { name, value, type, checked } = e.target;
    setItemForm((prev) => {
      if (name === "label") {
        return {
          ...prev,
          label: value,
          slug: slugify(value),
        };
      }
      return {
        ...prev,
        [name]: type === "checkbox" ? checked : value,
      };
    });
  };

  const buildNextMenuItemsFromForm = () => {
    const label = itemForm.label.trim();
    const slug = slugify(itemForm.slug || label);
    const description = itemForm.description.trim();
    const enabled = itemForm.enabled !== false;

    if (isEditMode && editingItemId) {
      return menuItems.map((item) =>
        item.id === editingItemId
          ? { ...item, label, slug, description, enabled }
          : item,
      );
    }

    return [
      ...menuItems,
      {
        id: makeLocalId(),
        label,
        slug,
        description,
        enabled,
        order: menuItems.length,
      },
    ];
  };

  const onItemModalSubmit = () => {
    removeErrors();
    const flat = {
      label: itemForm.label,
      slug: slugify(itemForm.slug || itemForm.label),
    };
    const errors = validateForm(flat, [
      { path: "label", msg: "Label is required" },
      { path: "slug", msg: "Slug could not be generated from label" },
    ]);

    if (!errors.length) {
      const slug = flat.slug;
      const duplicate = menuItems.some(
        (item) =>
          item.slug === slug &&
          (!isEditMode || item.id !== editingItemId),
      );
      if (duplicate) {
        errors.push({ path: "slug", msg: "This slug is already used" });
      }
    }

    if (errors.length) {
      setErrors(errors);
      return;
    }

    setPendingMenuItems(
      buildNextMenuItemsFromForm().map((item, index) => ({
        ...item,
        order: index,
      })),
    );
    setShowItemSaveConfirm(true);
  };

  const handleItemSaveConfirm = (txn_password) => {
    if (!pendingMenuItems) return;
    updateCommonSettings({
      comingSoon: { menuItems: pendingMenuItems },
      txn_password,
    });
    setShowItemSaveConfirm(false);
    setPendingMenuItems(null);
    closeItemModal();
  };

  const openDeleteConfirm = (item) => {
    setPendingDeleteItem(item);
    setShowDeleteConfirm(true);
  };

  const handleDeleteConfirm = (txn_password) => {
    if (!pendingDeleteItem) return;
    const nextItems = menuItems
      .filter((item) => item.id !== pendingDeleteItem.id)
      .map((item, index) => ({ ...item, order: index }));
    updateCommonSettings({
      comingSoon: { menuItems: nextItems },
      txn_password,
    });
    setShowDeleteConfirm(false);
    setPendingDeleteItem(null);
  };

  const columns = useMemo(
    () => [
      {
        name: "Label",
        selector: (row) => row.label || "-",
        sortable: false,
        wrap: true,
        width: "20%",
      },
      {
        name: "Slug",
        selector: (row) => row.slug || "-",
        sortable: false,
        wrap: true,
        width: "18%",
      },
      {
        name: "Description",
        selector: (row) => {
          const desc = row.description || "-";
          return desc.length > 80 ? `${desc.substring(0, 80)}...` : desc;
        },
        sortable: false,
        wrap: true,
        width: "32%",
      },
      {
        name: "Status",
        selector: (row) => (
          <Badge bg={row.enabled ? "success" : "secondary"}>
            {row.enabled ? "Visible" : "Hidden"}
          </Badge>
        ),
        sortable: false,
        width: "12%",
      },
      {
        name: "Actions",
        width: "18%",
        cell: (row) =>
          canEdit ? (
            <div className="d-flex gap-2">
              <Button
                variant="outline-primary"
                size="sm"
                onClick={() => openEditModal(row)}
                title="Edit"
                disabled={loadingOnSubmit}
              >
                <VscEdit size={16} />
              </Button>
              <Button
                variant="outline-danger"
                size="sm"
                onClick={() => openDeleteConfirm(row)}
                title="Delete"
                disabled={loadingOnSubmit}
              >
                <RiDeleteBin5Line size={16} />
              </Button>
            </div>
          ) : (
            <span className="text-muted">—</span>
          ),
      },
    ],
    [canEdit, loadingOnSubmit, menuItems],
  );

  if (loadingCommonSettings) {
    return (
      <Container>
        <AppBreadCrumb
          pageTitle="Coming Soon"
          crumbs={[{ name: "Coming Soon" }]}
        />
        <BouncingLoader />
      </Container>
    );
  }

  return (
    <Container>
      <AppBreadCrumb
        pageTitle="Coming Soon"
        crumbs={[{ name: "Coming Soon" }]}
      />

      <Card className="common-panel-card mb-4">
        <Card.Header className="d-flex flex-wrap justify-content-between align-items-center gap-2">
          <span>Coming Soon — Section Content</span>
          {canEdit ? (
            <Button
              type="button"
              variant={null}
              className={`btn btn-sm ${isSectionDisabled ? "btn--theme" : "btn--outline"}`}
              onClick={() => setSectionDisabled((prev) => !prev)}
              disabled={loadingOnSubmit}
            >
              {isSectionDisabled ? (
                <>
                  <MdEdit className="me-1" />
                  Edit
                </>
              ) : (
                <>
                  <FaRegEye className="me-1" />
                  View Mode
                </>
              )}
            </Button>
          ) : null}
        </Card.Header>
        <Card.Body>
          <p className="text-muted small mb-3">
            Default title and description shown on the Coming Soon page when a
            menu item has no custom description.
          </p>

          <Row className="g-3">
            <Col xs={12}>
              <Form.Check
                type="switch"
                id="comingSoonEnabled"
                name="enabled"
                label="Show Coming Soon menu items on client"
                checked={sectionForm.enabled}
                onChange={onSectionFieldChange}
                disabled={isSectionReadOnly || loadingOnSubmit}
              />
            </Col>
            <Col md={12}>
              <Form.Group controlId="comingSoonTitle">
                <Form.Label>Title</Form.Label>
                <Form.Control
                  name="title"
                  value={sectionForm.title}
                  onChange={onSectionFieldChange}
                  placeholder="Coming Soon"
                  disabled={isSectionReadOnly || loadingOnSubmit}
                />
                <Errors current_key="title" />
              </Form.Group>
            </Col>
            <Col md={12}>
              <Form.Group controlId="comingSoonDescription">
                <Form.Label>Short Description</Form.Label>
                <Form.Control
                  as="textarea"
                  rows={3}
                  name="description"
                  value={sectionForm.description}
                  onChange={onSectionFieldChange}
                  placeholder="This feature is under development..."
                  disabled={isSectionReadOnly || loadingOnSubmit}
                />
              </Form.Group>
            </Col>
          </Row>

          {canEdit ? (
            <div className="d-flex justify-content-end gap-2 mt-4">
              <Button
                type="button"
                className="btn btn--theme"
                onClick={onSectionSaveClick}
                disabled={isSectionDisabled || loadingOnSubmit}
              >
                {loadingOnSubmit ? "Saving..." : "Save Section Content"}
              </Button>
              <Button
                type="button"
                className="btn btn--danger"
                onClick={onSectionCancel}
                disabled={isSectionDisabled || loadingOnSubmit}
              >
                Cancel
              </Button>
            </div>
          ) : null}
        </Card.Body>
      </Card>

      <MainCard>
        <div className="table-filter-section mb-3">
          <Row className="d-flex justify-content-between">
            <Col md="4">
              {canEdit && (
                <Button
                  type="button"
                  variant="primary"
                  onClick={openAddModal}
                  disabled={loadingOnSubmit}
                >
                  <FaPlus className="me-1" />
                  Add Menu Item
                </Button>
              )}
            </Col>
          </Row>
        </div>

        <CustomDataTable
          columns={columns}
          data={menuItems}
          count={menuItems.length}
          params={listParams}
          setParams={setListParams}
          pagination
          responsive
          striped={true}
          progressPending={false}
          highlightOnHover
          persistTableHead={true}
          noDataComponent={
            <div className="py-4 text-muted">
              No Coming Soon menu items yet. Click &quot;Add Menu Item&quot; to
              create one (e.g. E-Voting).
            </div>
          }
        />
      </MainCard>

      <CustomModal
        show={showItemModal}
        onHide={closeItemModal}
        title={isEditMode ? "Edit Menu Item" : "Add Menu Item"}
        size="md"
        closeButton
        bodyClassName="common-modal-body--start"
        actions={[
          {
            label: "Cancel",
            onClick: closeItemModal,
            className: "btn btn--outline",
            colSize: 5,
            disabled: loadingOnSubmit,
          },
          {
            label: isEditMode ? "Update" : "Add",
            onClick: onItemModalSubmit,
            className: "btn btn--theme",
            colSize: 7,
            disabled: loadingOnSubmit,
          },
        ]}
      >
        <Row className="g-3">
          <Col xs={12}>
            <Form.Group controlId="comingSoonItemLabel">
              <Form.Label>Label *</Form.Label>
              <Form.Control
                name="label"
                value={itemForm.label}
                onChange={onItemFieldChange}
                placeholder="E-Voting"
                className={errorList?.label ? "invalid" : ""}
              />
              <Errors current_key="label" />
            </Form.Group>
          </Col>
          <Col xs={12}>
            <Form.Group controlId="comingSoonItemSlug">
              <Form.Label>Slug</Form.Label>
              <Form.Control
                name="slug"
                value={itemForm.slug}
                readOnly
                plaintext={false}
                className={errorList?.slug ? "invalid" : ""}
              />
              <Form.Text className="text-muted">
                Auto-generated from label. Public: /coming-soon/
                {itemForm.slug || "…"} · Logged-in: /user/coming-soon/
                {itemForm.slug || "…"}
              </Form.Text>
              <Errors current_key="slug" />
            </Form.Group>
          </Col>
          <Col xs={12}>
            <Form.Group controlId="comingSoonItemDescription">
              <Form.Label>Description (optional)</Form.Label>
              <Form.Control
                as="textarea"
                rows={3}
                name="description"
                value={itemForm.description}
                onChange={onItemFieldChange}
                placeholder="Shown on the Coming Soon page for this feature"
              />
            </Form.Group>
          </Col>
          <Col xs={12}>
            <Form.Check
              type="switch"
              id="comingSoonItemEnabled"
              name="enabled"
              label="Show in sidebar"
              checked={itemForm.enabled !== false}
              onChange={onItemFieldChange}
            />
          </Col>
        </Row>
      </CustomModal>

      <VerificationConfirmModal
        show={showSectionConfirm}
        handleClose={() => setShowSectionConfirm(false)}
        handleConfirm={handleSectionConfirmSave}
        title="Confirm Section Content"
        body="Enter your transaction password to save Coming Soon section content."
        submitBtnText="Save"
      />

      <VerificationConfirmModal
        show={showItemSaveConfirm}
        handleClose={() => {
          setShowItemSaveConfirm(false);
          setPendingMenuItems(null);
        }}
        handleConfirm={handleItemSaveConfirm}
        title={isEditMode ? "Confirm Update" : "Confirm Add"}
        body="Enter your transaction password to save this sidebar menu item."
        submitBtnText="Save"
      />

      <VerificationConfirmModal
        show={showDeleteConfirm}
        handleClose={() => {
          setShowDeleteConfirm(false);
          setPendingDeleteItem(null);
        }}
        handleConfirm={handleDeleteConfirm}
        title="Confirm Deletion"
        body={`Are you sure you want to delete "${pendingDeleteItem?.label || "this item"}"? Enter your transaction password to confirm.`}
        submitBtnText="Delete"
      />
    </Container>
  );
};

ComingSoonSettings.propTypes = {
  getCommonSettings: PropTypes.func.isRequired,
  updateCommonSettings: PropTypes.func.isRequired,
  setErrors: PropTypes.func.isRequired,
  removeErrors: PropTypes.func.isRequired,
  adminCommonSettings: PropTypes.object.isRequired,
  loggedInUser: PropTypes.object,
  errorList: PropTypes.object,
};

const mapStateToProps = (state) => ({
  adminCommonSettings: state.adminCommonSettings,
  loggedInUser: state.adminAuth.admin,
  errorList: state.errors,
});

export default connect(mapStateToProps, {
  getCommonSettings,
  updateCommonSettings,
  setErrors,
  removeErrors,
})(ComingSoonSettings);
