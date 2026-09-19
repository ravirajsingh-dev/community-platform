import { useCallback, useEffect, useMemo, useState } from "react";
import { connect } from "react-redux";
import PropTypes from "prop-types";
import { Button, Col, Container, Form, Row, Tab, Tabs } from "react-bootstrap";
import { FaArrowDown, FaArrowUp, FaPlus, FaRegEye, FaTrash } from "react-icons/fa";
import { MdEdit } from "react-icons/md";

import AppBreadCrumb from "@src/view/commonComponents/dataTable/AppBreadCrumb";
import MainCard from "@src/view/commonComponents/mainCard/MainCard";
import BouncingLoader from "@src/view/spinners/BouncingLoader";
import { hasPermission } from "@src/utils/permissions";
import {
  getLegalPages,
  updateLegalPage,
} from "@src/actions/legalPagesActions";

const TABS = [
  { slug: "returns-and-refunds", label: "Refunds" },
  { slug: "privacy-policy", label: "Privacy Policy" },
  { slug: "terms-and-conditions", label: "Terms & Conditions" },
];

const emptySection = () => ({ heading: "", text: "" });

const emptyBySlug = () =>
  TABS.reduce((acc, { slug }) => {
    acc[slug] = { title: "", intro: "", sections: [emptySection()] };
    return acc;
  }, {});

const normalizeSectionsFromApi = (sections) => {
  if (Array.isArray(sections) && sections.length > 0) {
    return sections.map((s) => ({
      heading: s?.heading ?? "",
      text: s?.text ?? "",
    }));
  }
  return [emptySection()];
};

const buildDraftsFromApi = (rows) => {
  const next = emptyBySlug();
  if (Array.isArray(rows)) {
    rows.forEach((row) => {
      if (row?.slug && next[row.slug] !== undefined) {
        next[row.slug] = {
          title: row.title ?? "",
          intro: row.intro ?? "",
          sections: normalizeSectionsFromApi(row.sections),
        };
      }
    });
  }
  return next;
};

const cloneDrafts = (source) => {
  const next = emptyBySlug();
  TABS.forEach(({ slug }) => {
    const row = source[slug] || {};
    next[slug] = {
      title: row.title ?? "",
      intro: row.intro ?? "",
      sections: (row.sections || [emptySection()]).map((s) => ({
        heading: s?.heading ?? "",
        text: s?.text ?? "",
      })),
    };
  });
  return next;
};

const LegalPagesManagement = ({ getLegalPages, updateLegalPage, loggedInUser }) => {
  const [loading, setLoading] = useState(true);
  const [savingSlug, setSavingSlug] = useState(null);
  const [activeSlug, setActiveSlug] = useState(TABS[0].slug);
  const [drafts, setDrafts] = useState(emptyBySlug);
  const [savedDrafts, setSavedDrafts] = useState(emptyBySlug);
  const [isDisabled, setDisabled] = useState(true);

  const canEdit = hasPermission(loggedInUser, "application-settings", "edit");
  const isReadOnly = isDisabled || !canEdit;
  const isSaving = savingSlug !== null;

  const activeTabLabel = useMemo(
    () => TABS.find((t) => t.slug === activeSlug)?.label ?? "",
    [activeSlug],
  );

  const loadAll = useCallback(async () => {
    setLoading(true);
    const result = await getLegalPages();
    if (result?.status && Array.isArray(result.data)) {
      const next = buildDraftsFromApi(result.data);
      const cloned = cloneDrafts(next);
      setDrafts(cloned);
      setSavedDrafts(cloned);
    }
    setLoading(false);
  }, [getLegalPages]);

  useEffect(() => {
    loadAll();
  }, [loadAll]);

  const toggleEdit = () => setDisabled((prev) => !prev);

  const onTabSelect = (tabKey) => {
    if (!tabKey || tabKey === activeSlug) return;
    if (!isDisabled) {
      setDrafts(cloneDrafts(savedDrafts));
      setDisabled(true);
    }
    setActiveSlug(tabKey);
  };

  const onTitle = (slug, value) => {
    setDrafts((prev) => ({
      ...prev,
      [slug]: { ...prev[slug], title: value },
    }));
  };

  const onIntro = (slug, value) => {
    setDrafts((prev) => ({
      ...prev,
      [slug]: { ...prev[slug], intro: value },
    }));
  };

  const patchSections = (slug, updater) => {
    setDrafts((prev) => {
      const cur = prev[slug];
      const sections = updater([...(cur?.sections || [])]);
      return { ...prev, [slug]: { ...cur, sections } };
    });
  };

  const onSectionField = (slug, index, field, value) => {
    patchSections(slug, (list) => {
      const copy = [...list];
      copy[index] = { ...copy[index], [field]: value };
      return copy;
    });
  };

  const addSection = (slug) => {
    patchSections(slug, (list) => [...list, emptySection()]);
  };

  const removeSection = (slug, index) => {
    patchSections(slug, (list) => {
      if (list.length <= 1) return [emptySection()];
      return list.filter((_, i) => i !== index);
    });
  };

  const moveSection = (slug, index, delta) => {
    patchSections(slug, (list) => {
      const j = index + delta;
      if (j < 0 || j >= list.length) return list;
      const copy = [...list];
      [copy[index], copy[j]] = [copy[j], copy[index]];
      return copy;
    });
  };

  const onSave = async (slug) => {
    setSavingSlug(slug);
    const { title, intro, sections } = drafts[slug] || {};
    const result = await updateLegalPage(slug, { title, intro, sections });
    setSavingSlug(null);
    if (result?.status) {
      const saved = cloneDrafts(drafts);
      setSavedDrafts(saved);
      setDrafts(saved);
      setDisabled(true);
    }
  };

  const onCancel = () => {
    setDrafts(cloneDrafts(savedDrafts));
    setDisabled(true);
  };

  if (loading) {
    return (
      <Container>
        <AppBreadCrumb pageTitle="Legal & policy pages" />
        <BouncingLoader />
      </Container>
    );
  }

  return (
    <Container className="py-3">
      <AppBreadCrumb
        pageTitle="Legal & policy pages"
        crumbs={[
          { name: "Legal & policy pages", path: "/admin/legal-pages" },
          ...(activeTabLabel ? [{ name: activeTabLabel }] : []),
        ]}
      />

      <MainCard>
        <Row className="mb-3 align-items-center">
          <Col>
            <h4 className="mb-1">Legal &amp; policy pages</h4>
            <p className="text-muted small mb-0">
              Content opens in view mode. Click Edit to make changes.
            </p>
          </Col>
          {canEdit ? (
            <Col xs="auto">
              <Button
                type="button"
                variant={null}
                className={`btn btn-sm ${isDisabled ? "btn--theme" : "btn--outline"}`}
                onClick={toggleEdit}
                disabled={isSaving}
              >
                {isDisabled ? (
                  <>
                    <MdEdit className="me-1" />
                    Edit
                  </>
                ) : (
                  <>
                    <FaRegEye className="me-1" />
                    View mode
                  </>
                )}
              </Button>
            </Col>
          ) : null}
        </Row>

        <Tabs
          activeKey={activeSlug}
          onSelect={onTabSelect}
          className="mb-3 legal-pages-admin-tabs"
        >
          {TABS.map(({ slug, label }) => {
            const sections = drafts[slug]?.sections || [emptySection()];
            return (
              <Tab key={slug} eventKey={slug} title={label}>
                <Form
                  onSubmit={(e) => {
                    e.preventDefault();
                    onSave(slug);
                  }}
                >
                  <Form.Group controlId="page-title" className="mb-3">
                    <Form.Label htmlFor={`legal-page-title-${slug}`} className="form-sub-label">
                      Page title
                    </Form.Label>
                    <Form.Control
                      id={`legal-page-title-${slug}`}
                      type="text"
                      value={drafts[slug]?.title ?? ""}
                      onChange={(e) => onTitle(slug, e.target.value)}
                      placeholder={`e.g. ${label}`}
                      disabled={isReadOnly || isSaving}
                      readOnly={isReadOnly}
                    />
                  </Form.Group>

                  <Form.Group controlId="page-intro" className="mb-3">
                    <Form.Label htmlFor={`legal-page-intro-${slug}`} className="form-sub-label">
                      Intro text
                    </Form.Label>
                    <Form.Control
                      id={`legal-page-intro-${slug}`}
                      as="textarea"
                      rows={3}
                      value={drafts[slug]?.intro ?? ""}
                      onChange={(e) => onIntro(slug, e.target.value)}
                      placeholder="Short introduction shown below the page title…"
                      disabled={isReadOnly || isSaving}
                      readOnly={isReadOnly}
                    />
                  </Form.Group>

                  <div className="d-flex flex-wrap align-items-center justify-content-between gap-2 mb-3">
                    <span className="form-sub-label mb-0">Sections</span>
                    <Button
                      type="button"
                      variant="outline-primary"
                      size="sm"
                      onClick={() => addSection(slug)}
                      disabled={isReadOnly || isSaving}
                    >
                      <FaPlus className="me-1" />
                      Add section
                    </Button>
                  </div>

                  {sections.map((sec, index) => (
                    <div key={`${slug}-sec-${index}`} className="legal-pages-admin__section">
                      <div className="d-flex flex-wrap justify-content-between align-items-center gap-2 mb-2">
                        <span className="legal-pages-admin__section-meta">
                          Section {index + 1}
                        </span>
                        <div className="d-flex gap-1">
                          <Button
                            type="button"
                            variant="outline-secondary"
                            size="sm"
                            disabled={isReadOnly || isSaving || index === 0}
                            onClick={() => moveSection(slug, index, -1)}
                            aria-label="Move up"
                          >
                            <FaArrowUp />
                          </Button>
                          <Button
                            type="button"
                            variant="outline-secondary"
                            size="sm"
                            disabled={
                              isReadOnly || isSaving || index >= sections.length - 1
                            }
                            onClick={() => moveSection(slug, index, 1)}
                            aria-label="Move down"
                          >
                            <FaArrowDown />
                          </Button>
                          <Button
                            type="button"
                            variant="outline-danger"
                            size="sm"
                            disabled={isReadOnly || isSaving}
                            onClick={() => removeSection(slug, index)}
                            aria-label="Remove section"
                          >
                            <FaTrash />
                          </Button>
                        </div>
                      </div>
                      <Form.Group controlId="heading" className="mb-2">
                        <Form.Label className="form-sub-label small">Heading</Form.Label>
                        <Form.Control
                          type="text"
                          value={sec.heading ?? ""}
                          onChange={(e) =>
                            onSectionField(slug, index, "heading", e.target.value)
                          }
                          placeholder="e.g. Service Of Discerning Clients"
                          disabled={isReadOnly || isSaving}
                          readOnly={isReadOnly}
                        />
                      </Form.Group>
                      <Form.Group controlId="text" className="mb-0">
                        <Form.Label className="form-sub-label small">Text</Form.Label>
                        <Form.Control
                          as="textarea"
                          rows={6}
                          value={sec.text ?? ""}
                          onChange={(e) => onSectionField(slug, index, "text", e.target.value)}
                          placeholder="Plain text for this section…"
                          disabled={isReadOnly || isSaving}
                          readOnly={isReadOnly}
                        />
                      </Form.Group>
                    </div>
                  ))}

                  {canEdit ? (
                    <div className="d-flex justify-content-end gap-2 mt-3">
                      <Button
                        type="submit"
                        variant={null}
                        className="btn btn--theme"
                        disabled={isDisabled || isSaving}
                      >
                        {savingSlug === slug ? "Saving…" : "Save"}
                      </Button>
                      <Button
                        type="button"
                        variant={null}
                        className="btn btn--danger"
                        onClick={onCancel}
                        disabled={isDisabled || isSaving}
                      >
                        Cancel
                      </Button>
                    </div>
                  ) : null}
                </Form>
              </Tab>
            );
          })}
        </Tabs>
      </MainCard>
    </Container>
  );
};

LegalPagesManagement.propTypes = {
  getLegalPages: PropTypes.func.isRequired,
  updateLegalPage: PropTypes.func.isRequired,
  loggedInUser: PropTypes.object,
};

const mapStateToProps = (state) => ({
  loggedInUser: state.adminAuth.admin,
});

export default connect(mapStateToProps, { getLegalPages, updateLegalPage })(
  LegalPagesManagement,
);
