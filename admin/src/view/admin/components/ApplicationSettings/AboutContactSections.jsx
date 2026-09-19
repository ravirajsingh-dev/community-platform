import { Card, Col, Form, Row, Button } from "react-bootstrap";
import { FaArrowDown, FaArrowUp, FaPlus, FaTrash } from "react-icons/fa";
import Errors from "@src/notifications/Errors";
import { MAX_IMAGE_SIZE_LABEL } from "@src/constants/imageUpload";

export const AboutUsSection = ({
  formData,
  isDisabled,
  onChange,
  addAboutSection,
  removeAboutSection,
  moveAboutSection,
  onAboutSectionField,
  onAboutSectionImageChange,
  clearAboutSectionImage,
}) => {
  const sections = formData.aboutUs?.sections || [];

  return (
    <Card className="common-panel-card mb-4 about-us-admin">
      <Card.Header>About Us Page Content</Card.Header>
      <Card.Body>
        <p className="text-muted small mb-3">
          Build your brand story for the storefront — add any number of sections
          (e.g. Our Mission, Brand Logo, History) with a heading, image, and
          description.
        </p>
        <Row className="g-3">
          <Col md={12}>
            <Form.Group controlId="aboutUs.title">
              <Form.Label>Page title</Form.Label>
              <Form.Control
                name="aboutUs.title"
                value={formData.aboutUs.title}
                onChange={onChange}
                disabled={isDisabled}
                placeholder="e.g. About Us"
              />
            </Form.Group>
          </Col>
          <Col md={12}>
            <Form.Group controlId="aboutUs.intro">
              <Form.Label>Intro text</Form.Label>
              <Form.Control
                as="textarea"
                rows={3}
                name="aboutUs.intro"
                value={formData.aboutUs.intro}
                onChange={onChange}
                disabled={isDisabled}
                placeholder="Short introduction shown below the page title…"
              />
            </Form.Group>
          </Col>
        </Row>

        <div className="d-flex flex-wrap align-items-center justify-content-between gap-2 mb-3 mt-2">
          <span className="about-us-admin__section-meta mb-0">Story sections</span>
          <Button
            type="button"
            variant={null}
            className="btn btn--outline btn-sm"
            onClick={addAboutSection}
            disabled={isDisabled}
          >
            <FaPlus className="me-1" />
            Add section
          </Button>
        </div>

        {sections.map((sec, index) => (
          <div key={sec.id} className="about-us-admin__section">
            <div className="d-flex flex-wrap justify-content-between align-items-center gap-2 mb-2">
              <span className="about-us-admin__section-meta">
                Section {index + 1}
              </span>
              <div className="d-flex gap-1">
                <Button
                  type="button"
                  variant={null}
                  className="btn btn--outline btn-sm"
                  disabled={isDisabled || index === 0}
                  onClick={() => moveAboutSection(index, -1)}
                  aria-label="Move up"
                >
                  <FaArrowUp />
                </Button>
                <Button
                  type="button"
                  variant={null}
                  className="btn btn--outline btn-sm"
                  disabled={isDisabled || index >= sections.length - 1}
                  onClick={() => moveAboutSection(index, 1)}
                  aria-label="Move down"
                >
                  <FaArrowDown />
                </Button>
                <Button
                  type="button"
                  variant={null}
                  className="btn btn--danger btn-sm"
                  disabled={isDisabled}
                  onClick={() => removeAboutSection(index)}
                  aria-label="Remove section"
                >
                  <FaTrash />
                </Button>
              </div>
            </div>

            <Form.Group controlId="heading" className="mb-2">
              <Form.Label>Heading</Form.Label>
              <Form.Control
                type="text"
                value={sec.heading ?? ""}
                onChange={(e) =>
                  onAboutSectionField(index, "heading", e.target.value)
                }
                disabled={isDisabled}
                placeholder="e.g. Our Mission, Brand Logo, History"
              />
            </Form.Group>

            <Form.Group controlId="image" className="mb-2">
              <Form.Label>Image</Form.Label>
              {sec.imagePreview ? (
                <div className="settings-image-preview settings-image-preview--section mb-2">
                  <div className="settings-image-preview__frame">
                    <img src={sec.imagePreview} alt={sec.heading || "Section"} />
                  </div>
                  {!isDisabled ? (
                    <Button
                      type="button"
                      size="sm"
                      variant={null}
                      className="btn btn--danger mt-2"
                      onClick={() => clearAboutSectionImage(index)}
                    >
                      Remove image
                    </Button>
                  ) : null}
                </div>
              ) : null}
              <Form.Control
                type="file"
                accept="image/jpeg,image/jpg,image/png,image/webp"
                disabled={isDisabled}
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) onAboutSectionImageChange(index, file);
                  e.target.value = "";
                }}
              />
              <Form.Text className="text-muted">JPG/PNG/WEBP, max {MAX_IMAGE_SIZE_LABEL}.</Form.Text>
            </Form.Group>

            <Form.Group controlId="description" className="mb-0">
              <Form.Label>Description</Form.Label>
              <Form.Control
                as="textarea"
                rows={5}
                value={sec.description ?? ""}
                onChange={(e) =>
                  onAboutSectionField(index, "description", e.target.value)
                }
                disabled={isDisabled}
                placeholder="Tell your brand story for this section…"
              />
            </Form.Group>
          </div>
        ))}
        <Errors current_key="aboutUs" />
      </Card.Body>
    </Card>
  );
};

export const ContactUsSection = ({ formData, errorList, isDisabled, onChange }) => (
  <Card className="common-panel-card mb-4 contact-us-admin">
    <Card.Header>Contact Us Page Content</Card.Header>
    <Card.Body>
      <p className="text-muted small mb-3">
        Configure the storefront Contact Us page and shared contact details
        shown in the footer and across the site.
      </p>
      <Row className="g-3">
        <Col md={12}>
          <Form.Group controlId="contactUsPage.title">
            <Form.Label>Page title</Form.Label>
            <Form.Control
              name="contactUsPage.title"
              value={formData.contactUsPage.title}
              onChange={onChange}
              disabled={isDisabled}
              placeholder="e.g. Contact Us"
            />
          </Form.Group>
        </Col>
        <Col md={12}>
          <Form.Group controlId="contactUsPage.intro">
            <Form.Label>Intro text</Form.Label>
            <Form.Control
              as="textarea"
              rows={3}
              name="contactUsPage.intro"
              value={formData.contactUsPage.intro}
              onChange={onChange}
              disabled={isDisabled}
              placeholder="Short welcome message shown below the page title…"
            />
          </Form.Group>
        </Col>
        <Col md={6}>
          <Form.Group controlId="contactUsPage.phone">
            <Form.Label>Primary phone *</Form.Label>
            <Form.Control
              className={errorList["contactUsPage.phone"] ? "invalid" : ""}
              name="contactUsPage.phone"
              value={formData.contactUsPage.phone}
              onChange={onChange}
              disabled={isDisabled}
              required
              placeholder="e.g. +91 98765 43210"
            />
            <Errors current_key="contactUsPage.phone" key="contactUsPage.phone" />
          </Form.Group>
        </Col>
        <Col md={6}>
          <Form.Group controlId="contactUsPage.secondaryPhone">
            <Form.Label>Secondary phone (optional)</Form.Label>
            <Form.Control
              name="contactUsPage.secondaryPhone"
              value={formData.contactUsPage.secondaryPhone}
              onChange={onChange}
              disabled={isDisabled}
              placeholder="Alternate line or WhatsApp"
            />
          </Form.Group>
        </Col>
        <Col md={6}>
          <Form.Group controlId="contactUsPage.email">
            <Form.Label>Contact email *</Form.Label>
            <Form.Control
              className={errorList["contactUsPage.email"] ? "invalid" : ""}
              type="email"
              name="contactUsPage.email"
              value={formData.contactUsPage.email}
              onChange={onChange}
              disabled={isDisabled}
              required
              placeholder="e.g. hello@example.com"
            />
            <Errors current_key="contactUsPage.email" key="contactUsPage.email" />
          </Form.Group>
        </Col>
        <Col md={6}>
          <Form.Group controlId="contactUsPage.businessHours">
            <Form.Label>Business hours (optional)</Form.Label>
            <Form.Control
              as="textarea"
              rows={3}
              name="contactUsPage.businessHours"
              value={formData.contactUsPage.businessHours}
              onChange={onChange}
              disabled={isDisabled}
              placeholder={"Mon–Sat: 10:00 AM – 7:00 PM\nSun: By appointment"}
            />
          </Form.Group>
        </Col>
        <Col md={12}>
          <Form.Group controlId="contactUsPage.address">
            <Form.Label>Contact address</Form.Label>
            <Form.Control
              as="textarea"
              rows={4}
              name="contactUsPage.address"
              value={formData.contactUsPage.address}
              onChange={onChange}
              disabled={isDisabled}
              placeholder="Address for visitors"
            />
          </Form.Group>
        </Col>
      </Row>
    </Card.Body>
  </Card>
);
