import React from "react";
import PropTypes from "prop-types";
import { connect } from "react-redux";
import { useNavigate, useParams } from "react-router-dom";
import { Button, Form, Row, Col, Container } from "react-bootstrap";

import { validateForm } from "@src/utils/validation";
import Errors from "@src/notifications/Errors";

import {
  updateNews,
  removeNewsErrors,
  resetComponentStore,
  getNewsById,
} from "@src/actions/adminNewsActions";
import { setErrors } from "@src/actions/adminAuth";
import { setAlert } from "@src/actions/alert";
import MainCard from "@src/view/commonComponents/mainCard/MainCard";
import Spinner from "@src/view/spinners/Spinner";
import BouncingLoader from "@src/view/spinners/BouncingLoader";
import AppBreadCrumb from "@src/view/commonComponents/dataTable/AppBreadCrumb";
import VerificationConfirmModal from "@src/view/admin/modals/VerificationConfirmModal";
import {
  MAX_IMAGE_SIZE_BYTES,
  MAX_NEWS_IMAGES,
  MAX_IMAGE_SIZE_LABEL,
  IMAGE_SIZE_ERROR,
} from "@src/constants/imageUpload";
import { compressImageFiles } from "@src/utils/compressImage";

const ALLOWED_TYPES = ["image/jpeg", "image/jpg", "image/png", "image/webp"];

const EditNews = ({
  updateNews,
  errorList,
  currentNews,
  setErrors,
  removeNewsErrors,
  setAlert,
  getNewsById,
  loadingNews,
}) => {
  const navigate = useNavigate();
  const { id } = useParams();

  const initialFormData = {
    title: "",
    description: "",
    displayOrder: 1,
    isActive: true,
  };

  const [formData, setFormData] = React.useState(initialFormData);
  const [existingImages, setExistingImages] = React.useState([]);
  const [newImageItems, setNewImageItems] = React.useState([]);
  const [isUploading, setIsUploading] = React.useState(false);
  const [overallProgress, setOverallProgress] = React.useState(0);
  const [showConfirmModal, setShowConfirmModal] = React.useState(false);
  const [pendingSubmitData, setPendingSubmitData] = React.useState(null);
  const abortRef = React.useRef(null);
  const totalBytesRef = React.useRef(0);

  const loadNewsFormData = (news) => {
    if (!news) return;

    setFormData({
      title: news.title || "",
      description: news.description || "",
      displayOrder: news.displayOrder || 1,
      isActive: news.isActive !== undefined ? news.isActive : true,
    });

    const images =
      Array.isArray(news.images) && news.images.length
        ? news.images
        : news.imageUrl
          ? [{ imageUrl: news.imageUrl, imageKey: news.imageKey || null }]
          : [];

    setExistingImages(
      images.map((img, index) => ({
        id: `existing-${img.imageKey || img.imageUrl || index}`,
        imageUrl: img.imageUrl,
        imageKey: img.imageKey || null,
      }))
    );
    setNewImageItems([]);
  };

  React.useEffect(() => {
    if (!id) return;
    getNewsById(id);
  }, [getNewsById, id]);

  React.useEffect(() => {
    if (!currentNews || !currentNews._id) return;
    loadNewsFormData(currentNews);
  }, [currentNews]);

  React.useEffect(() => {
    return () => {
      if (abortRef.current) {
        abortRef.current.abort();
      }
      newImageItems.forEach((item) => {
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

    const remaining =
      MAX_NEWS_IMAGES - existingImages.length - newImageItems.length;
    if (files.length > remaining) {
      setErrors([
        {
          path: "images",
          msg: `You can have up to ${MAX_NEWS_IMAGES} images per news item`,
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

    setNewImageItems((prev) => {
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

  const removeExistingImage = (idToRemove) => {
    if (isUploading) return;
    setExistingImages((prev) => prev.filter((img) => img.id !== idToRemove));
  };

  const removeNewImage = (idToRemove) => {
    if (isUploading) return;
    setNewImageItems((prev) => {
      const target = prev.find((item) => item.id === idToRemove);
      if (target?.preview?.startsWith("blob:")) {
        URL.revokeObjectURL(target.preview);
      }
      const next = prev.filter((item) => item.id !== idToRemove);
      totalBytesRef.current = next.reduce(
        (sum, item) => sum + (item.file.size || 0),
        0
      );
      return next;
    });
  };

  const onSubmit = (e) => {
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

    const submitData = {
      title: formData.title,
      description: formData.description,
      displayOrder: formData.displayOrder,
      isActive: formData.isActive,
      existingImages: existingImages.map((img) => ({
        imageUrl: img.imageUrl,
        imageKey: img.imageKey,
      })),
      images: newImageItems.map((item) => item.file),
    };

    setPendingSubmitData(submitData);
    setShowConfirmModal(true);
  };

  const handleConfirmEdit = async (txnPassword) => {
    if (!pendingSubmitData || !txnPassword) {
      return;
    }

    const controller = new AbortController();
    abortRef.current = controller;
    const fallbackTotal = totalBytesRef.current || 1;

    setShowConfirmModal(false);
    setIsUploading(true);
    setOverallProgress(0);

    try {
      let imagesToUpload = pendingSubmitData.images || [];
      if (imagesToUpload.length > 0) {
        setOverallProgress(1);
        imagesToUpload = await compressImageFiles(imagesToUpload);
        totalBytesRef.current = imagesToUpload.reduce(
          (sum, file) => sum + (file.size || 0),
          0
        );
      }

      const result = await updateNews(
        {
          ...pendingSubmitData,
          images: imagesToUpload,
          txn_password: txnPassword,
        },
        id,
        navigate,
        {
          signal: controller.signal,
          onProgress: (percent, loaded, total) => {
            if (typeof percent === "number") {
              setOverallProgress(Math.max(8, Math.min(100, percent)));
              return;
            }
            const estimated = Math.min(
              99,
              Math.round(((loaded || 0) * 100) / (total || fallbackTotal))
            );
            setOverallProgress(Math.max(8, estimated));
          },
        }
      );

      abortRef.current = null;
      setIsUploading(false);
      setPendingSubmitData(null);

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
      setPendingSubmitData(null);
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

  const totalImages = existingImages.length + newImageItems.length;

  return (
    <Container>
      <AppBreadCrumb
        pageTitle="Edit News"
        crumbs={[
          { name: "News", path: "/admin/news" },
          { name: "Edit News" },
        ]}
      />

      <MainCard className="card-body">
        <Form onSubmit={(e) => onSubmit(e)} autoComplete="off">
          {!loadingNews && currentNews && currentNews._id ? (
            <>
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
                      Description / Content{" "}
                      <span className="text-danger">*</span>
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
                      disabled={isUploading || totalImages >= MAX_NEWS_IMAGES}
                      className={errorList.images ? "invalid" : ""}
                    />
                    <Errors current_key="images" />
                    <Form.Text className="text-muted">
                      Select one or multiple images (up to {MAX_NEWS_IMAGES}{" "}
                      total). Max size per image: {MAX_IMAGE_SIZE_LABEL}.
                    </Form.Text>
                  </Form.Group>

                  {isUploading ? (
                    <div className="gallery-upload-overall mt-3">
                      <BouncingLoader
                        className="gallery-upload-loader"
                        message={
                          overallProgress
                            ? overallProgress < 8 && newImageItems.length
                              ? "Optimizing images…"
                              : newImageItems.length
                                ? `Uploading images… ${overallProgress}%`
                                : `Saving news… ${overallProgress}%`
                            : newImageItems.length
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

                  {(existingImages.length > 0 || newImageItems.length > 0) && (
                    <div className="gallery-upload-preview-grid mt-3">
                      {existingImages.map((item) => (
                        <div
                          key={item.id}
                          className="gallery-upload-preview-item"
                        >
                          <img
                            src={item.imageUrl}
                            alt="News"
                            className="gallery-upload-preview-image"
                          />
                          <div className="gallery-upload-preview-meta">
                            <div className="gallery-upload-preview-name">
                              Existing
                            </div>
                          </div>
                          {!isUploading ? (
                            <button
                              type="button"
                              className="gallery-upload-preview-remove"
                              onClick={() => removeExistingImage(item.id)}
                            >
                              Remove
                            </button>
                          ) : null}
                        </div>
                      ))}
                      {newImageItems.map((item) => (
                        <div
                          key={item.id}
                          className="gallery-upload-preview-item"
                        >
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
                              onClick={() => removeNewImage(item.id)}
                            >
                              Remove
                            </button>
                          ) : null}
                        </div>
                      ))}
                    </div>
                  )}
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
                    ) : (
                      "Save"
                    )}
                  </Button>
                </Col>
              </Row>
            </>
          ) : (
            <Spinner />
          )}
        </Form>
      </MainCard>

      <VerificationConfirmModal
        show={showConfirmModal}
        handleClose={() => {
          setShowConfirmModal(false);
          setPendingSubmitData(null);
        }}
        handleConfirm={handleConfirmEdit}
        title="Confirm Update"
        body="Are you sure you want to update this news? Please enter your transaction password to confirm."
        submitBtnText="Update"
      />
    </Container>
  );
};

EditNews.propTypes = {
  updateNews: PropTypes.func.isRequired,
  errorList: PropTypes.object.isRequired,
  getNewsById: PropTypes.func.isRequired,
  setAlert: PropTypes.func.isRequired,
};

const mapStateToProps = (state) => ({
  errorList: state.errors,
  loadingNews: state.news.loadingNews,
  currentNews: state.news.currentNews,
});

export default connect(mapStateToProps, {
  updateNews,
  setErrors,
  removeNewsErrors,
  resetComponentStore,
  getNewsById,
  setAlert,
})(EditNews);
