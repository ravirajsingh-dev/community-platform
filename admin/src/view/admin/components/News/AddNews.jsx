import React from "react";
import PropTypes from "prop-types";
import { connect } from "react-redux";
import { useNavigate } from "react-router-dom";
import { Button, Form, Row, Col, Container } from "react-bootstrap";

import { validateForm } from "@src/utils/validation";
import Errors from "@src/notifications/Errors";

import {
  createNews,
  getNews,
  removeNewsErrors,
} from "@src/actions/adminNewsActions";
import { setErrors } from "@src/actions/adminAuth";
import { setAlert } from "@src/actions/alert";
import MainCard from "@src/view/commonComponents/mainCard/MainCard";
import AppBreadCrumb from "@src/view/commonComponents/dataTable/AppBreadCrumb";
import BouncingLoader from "@src/view/spinners/BouncingLoader";
import {
  MAX_IMAGE_SIZE_BYTES,
  MAX_NEWS_IMAGES,
  MAX_IMAGE_SIZE_LABEL,
  IMAGE_SIZE_ERROR,
} from "@src/constants/imageUpload";
import { compressImageFiles } from "@src/utils/compressImage";

const ALLOWED_TYPES = ["image/jpeg", "image/jpg", "image/png", "image/webp"];

const AddNews = ({
  createNews,
  getNews,
  errorList,
  setErrors,
  removeNewsErrors,
  setAlert,
  nextOrder = 1,
}) => {
  const navigate = useNavigate();

  const initialFormData = {
    title: "",
    description: "",
    displayOrder: nextOrder,
    isActive: true,
  };

  const [formData, setFormData] = React.useState(initialFormData);
  const [imageItems, setImageItems] = React.useState([]);
  const [isUploading, setIsUploading] = React.useState(false);
  const [overallProgress, setOverallProgress] = React.useState(0);
  const abortRef = React.useRef(null);
  const totalBytesRef = React.useRef(0);

  React.useEffect(() => {
    getNews({
      limit: 10,
      page: 1,
      orderBy: "displayOrder",
      ascending: "asc",
      query: "",
    });
  }, [getNews]);

  React.useEffect(() => {
    setFormData((prev) => ({
      ...prev,
      displayOrder: nextOrder,
    }));
  }, [nextOrder]);

  React.useEffect(() => {
    return () => {
      if (abortRef.current) {
        abortRef.current.abort();
      }
      imageItems.forEach((item) => {
        if (item.preview?.startsWith("blob:")) {
          URL.revokeObjectURL(item.preview);
        }
      });
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const onChange = (e) => {
    if (isUploading) return;
    const { name, value, type, checked } = e.target;
    setFormData({
      ...formData,
      [name]: type === "checkbox" ? checked : value,
    });
  };

  const onFileChange = (e) => {
    const files = Array.from(e.target.files || []);
    removeNewsErrors();

    if (!files.length) {
      return;
    }

    const remaining = MAX_NEWS_IMAGES - imageItems.length;
    if (files.length > remaining) {
      setErrors([
        {
          path: "images",
          msg: `You can upload up to ${MAX_NEWS_IMAGES} images (including already selected)`,
        },
      ]);
      e.target.value = "";
      return;
    }

    const errors = [];
    files.forEach((file, index) => {
      if (file.size > MAX_IMAGE_SIZE_BYTES) {
        errors.push({ path: `images_${index}`, msg: IMAGE_SIZE_ERROR });
      }
      if (!ALLOWED_TYPES.includes(file.type)) {
        errors.push({
          path: `images_${index}`,
          msg: "Only jpg, jpeg, png, and webp images are allowed",
        });
      }
    });

    if (errors.length) {
      setErrors(errors);
      e.target.value = "";
      return;
    }

    setImageItems((prev) => {
      const next = [
        ...prev,
        ...files.map((file, index) => ({
          id: `${file.name}-${file.size}-${file.lastModified}-${index}-${Date.now()}`,
          file,
          name: file.name,
          preview: URL.createObjectURL(file),
        })),
      ];
      totalBytesRef.current = next.reduce(
        (sum, item) => sum + (item.file.size || 0),
        0
      );
      return next;
    });
    e.target.value = "";
  };

  const removeImageAt = (id) => {
    if (isUploading) return;

    setImageItems((prev) => {
      const target = prev.find((item) => item.id === id);
      if (target?.preview?.startsWith("blob:")) {
        URL.revokeObjectURL(target.preview);
      }
      const next = prev.filter((item) => item.id !== id);
      totalBytesRef.current = next.reduce(
        (sum, item) => sum + (item.file.size || 0),
        0
      );
      return next;
    });
  };

  const onSubmit = async (e) => {
    e.preventDefault();
    removeNewsErrors();

    const validationRules = [
      { path: "title", msg: "Title is required" },
      { path: "description", msg: "Description is required" },
    ];

    const errors = validateForm(formData, validationRules);
    if (errors.length) {
      setErrors(errors);
      return;
    }

    const formDataToSend = new FormData();
    formDataToSend.append("title", formData.title);
    formDataToSend.append("description", formData.description);
    formDataToSend.append("displayOrder", formData.displayOrder);
    formDataToSend.append("isActive", formData.isActive);

    const controller = new AbortController();
    abortRef.current = controller;
    const fallbackTotal = totalBytesRef.current || 1;

    setIsUploading(true);
    setOverallProgress(0);

    try {
      if (imageItems.length > 0) {
        setOverallProgress(1);
        const compressedFiles = await compressImageFiles(
          imageItems.map((item) => item.file)
        );
        compressedFiles.forEach((file) => {
          formDataToSend.append("images", file);
        });
        totalBytesRef.current = compressedFiles.reduce(
          (sum, file) => sum + (file.size || 0),
          0
        );
      }

      const result = await createNews(formDataToSend, navigate, {
        signal: controller.signal,
        onProgress: (percent, loaded, total) => {
          if (typeof percent === "number") {
            // Reserve 0–8% for local compression feedback
            const mapped = Math.max(8, Math.min(100, percent));
            setOverallProgress(mapped);
            return;
          }
          const estimated = Math.min(
            99,
            Math.round(((loaded || 0) * 100) / (total || fallbackTotal))
          );
          setOverallProgress(Math.max(8, estimated));
        },
      });

      abortRef.current = null;
      setIsUploading(false);

      if (result?.cancelled) {
        setOverallProgress(0);
        setAlert("Upload cancelled.", "warning");
        return;
      }

      if (result?.status === true) {
        setOverallProgress(100);
      } else {
        setOverallProgress(0);
      }
    } catch (error) {
      abortRef.current = null;
      setIsUploading(false);
      setOverallProgress(0);
      setAlert(error?.message || "Failed to prepare images for upload", "danger");
    }
  };

  const onClickCancel = (e) => {
    e.preventDefault();
    if (isUploading && abortRef.current) {
      abortRef.current.abort();
      return;
    }
    navigate("/admin/news");
  };

  return (
    <Container>
      <AppBreadCrumb
        pageTitle="Add News"
        crumbs={[
          { name: "News", path: "/admin/news" },
          { name: "Add News" },
        ]}
      />

      <MainCard className="card-body">
        <Form onSubmit={(e) => onSubmit(e)} autoComplete="off">
          <Row className="row-gap-3 mb-4">
            <Col xs={12}>
              <h5>News Information</h5>
            </Col>

            <Col xs={12}>
              <Form.Group controlId="title">
                <Form.Label>
                  Title <span className="text-danger">*</span>
                </Form.Label>
                <Form.Control
                  className={errorList.title ? "invalid" : ""}
                  type="text"
                  name="title"
                  value={formData.title}
                  onChange={onChange}
                  disabled={isUploading}
                  required
                />
                <Errors current_key="title" />
              </Form.Group>
            </Col>

            <Col xs={12}>
              <Form.Group controlId="description">
                <Form.Label>
                  Description / Content <span className="text-danger">*</span>
                </Form.Label>
                <Form.Control
                  className={errorList.description ? "invalid" : ""}
                  as="textarea"
                  rows={5}
                  name="description"
                  value={formData.description}
                  onChange={onChange}
                  disabled={isUploading}
                  required
                />
                <Errors current_key="description" />
              </Form.Group>
            </Col>

            <Col xs={12}>
              <Form.Group controlId="images">
                <Form.Label>Images (Optional)</Form.Label>
                <Form.Control
                  type="file"
                  name="images"
                  accept="image/jpeg,image/jpg,image/png,image/webp"
                  multiple
                  onChange={onFileChange}
                  disabled={isUploading || imageItems.length >= MAX_NEWS_IMAGES}
                  className={errorList.images ? "invalid" : ""}
                />
                <Errors current_key="images" />
                <Form.Text className="text-muted">
                  Select one or multiple images (up to {MAX_NEWS_IMAGES}). Max
                  size per image: {MAX_IMAGE_SIZE_LABEL}. Only jpg, jpeg, png,
                  and webp.
                </Form.Text>
              </Form.Group>

              {isUploading ? (
                <div className="gallery-upload-overall mt-3">
                  <BouncingLoader
                    className="gallery-upload-loader"
                    message={
                      overallProgress
                        ? overallProgress < 8 && imageItems.length
                          ? "Optimizing images…"
                          : imageItems.length
                            ? `Uploading images… ${overallProgress}%`
                            : `Saving news… ${overallProgress}%`
                        : imageItems.length
                          ? "Preparing upload…"
                          : "Saving news…"
                    }
                  />
                  <div className="progress mt-2" style={{ height: "8px" }}>
                    <div
                      className="progress-bar"
                      role="progressbar"
                      style={{ width: `${overallProgress}%` }}
                      aria-valuenow={overallProgress}
                      aria-valuemin={0}
                      aria-valuemax={100}
                    />
                  </div>
                </div>
              ) : null}

              {imageItems.length > 0 ? (
                <div className="gallery-upload-preview-grid mt-3">
                  {imageItems.map((item) => (
                    <div key={item.id} className="gallery-upload-preview-item">
                      <img
                        src={item.preview}
                        alt={item.name}
                        className="gallery-upload-preview-image"
                      />
                      <div className="gallery-upload-preview-meta">
                        <div
                          className="gallery-upload-preview-name"
                          title={item.name}
                        >
                          {item.name}
                        </div>
                      </div>
                      {!isUploading ? (
                        <button
                          type="button"
                          className="gallery-upload-preview-remove"
                          onClick={() => removeImageAt(item.id)}
                        >
                          Remove
                        </button>
                      ) : null}
                    </div>
                  ))}
                </div>
              ) : null}
            </Col>

            <Col xs={12} md={6}>
              <Form.Group controlId="displayOrder">
                <Form.Label>Display Order</Form.Label>
                <Form.Control
                  type="number"
                  name="displayOrder"
                  value={formData.displayOrder}
                  onChange={onChange}
                  min="1"
                  disabled={isUploading}
                />
                <Form.Text className="text-muted">
                  Changing order will automatically shift other news items.
                </Form.Text>
              </Form.Group>
            </Col>

            <Col xs={12} md={6}>
              <Form.Group controlId="isActive">
                <Form.Label>Active</Form.Label>
                <Form.Check
                  type="switch"
                  id="isActive"
                  name="isActive"
                  label="Active"
                  checked={formData.isActive}
                  onChange={onChange}
                  disabled={isUploading}
                />
              </Form.Group>
            </Col>
          </Row>

          <Row>
            <Col xs={12} className="text-end">
              <Button
                className="m-2"
                type="button"
                variant="secondary"
                onClick={onClickCancel}
              >
                {isUploading ? "Cancel Upload" : "Cancel"}
              </Button>
              <Button
                className="m-2"
                type="submit"
                variant="primary"
                disabled={isUploading}
              >
                {isUploading ? (
                  <>
                    <span
                      className="spinner-border spinner-border-sm me-2"
                      aria-hidden="true"
                    ></span>
                    {overallProgress
                      ? `Uploading ${overallProgress}%`
                      : "Uploading..."}
                  </>
                ) : imageItems.length > 1 ? (
                  `Create News (${imageItems.length} images)`
                ) : (
                  "Create News"
                )}
              </Button>
            </Col>
          </Row>
        </Form>
      </MainCard>
    </Container>
  );
};

AddNews.propTypes = {
  createNews: PropTypes.func.isRequired,
  getNews: PropTypes.func.isRequired,
  errorList: PropTypes.object.isRequired,
  setErrors: PropTypes.func.isRequired,
  removeNewsErrors: PropTypes.func.isRequired,
  setAlert: PropTypes.func.isRequired,
  nextOrder: PropTypes.number,
};

const mapStateToProps = (state) => ({
  errorList: state.errors,
  nextOrder: state.news.newsList.nextOrder,
});

export default connect(mapStateToProps, {
  createNews,
  getNews,
  setErrors,
  removeNewsErrors,
  setAlert,
})(AddNews);
