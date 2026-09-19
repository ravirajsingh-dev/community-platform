import React, { useState, useEffect, useRef } from "react";
import { Form, Row, Col } from "react-bootstrap";
import PropTypes from "prop-types";
import { connect } from "react-redux";
import CustomModal from "@src/components/common/Modal/CustomModal";
import Errors from "@src/notifications/Errors";
import BouncingLoader from "@src/view/spinners/BouncingLoader";
import { setErrors } from "@src/actions/adminAuth";
import { setAlert } from "@src/actions/alert";
import {
  createGalleryImagesBulk,
  removeGalleryErrors,
} from "@src/actions/adminGalleryActions";
import {
  MAX_IMAGE_SIZE_BYTES,
  MAX_GALLERY_BULK_UPLOAD,
  IMAGE_SIZE_ERROR,
} from "@src/constants/imageUpload";

const ALLOWED_TYPES = ["image/jpeg", "image/jpg", "image/png", "image/webp"];

const validateFiles = (files) => {
  const errors = [];

  if (!files.length) {
    errors.push({ path: "images", msg: "Select at least one image" });
    return errors;
  }

  if (files.length > MAX_GALLERY_BULK_UPLOAD) {
    errors.push({
      path: "images",
      msg: `You can upload up to ${MAX_GALLERY_BULK_UPLOAD} images at once`,
    });
    return errors;
  }

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

  return errors;
};

const GalleryModal = ({
  show,
  handleClose,
  createGalleryImagesBulk,
  removeGalleryErrors,
  setErrors,
  setAlert,
  errorList,
}) => {
  const [items, setItems] = useState([]);
  const [isUploading, setIsUploading] = useState(false);
  const [overallProgress, setOverallProgress] = useState(0);
  const abortRef = useRef(null);
  const totalBytesRef = useRef(0);

  const clearPreviews = (list = []) => {
    list.forEach((item) => {
      if (item.preview?.startsWith("blob:")) {
        URL.revokeObjectURL(item.preview);
      }
    });
  };

  const resetUploadState = () => {
    if (abortRef.current) {
      abortRef.current.abort();
      abortRef.current = null;
    }
    clearPreviews(items);
    setItems([]);
    setIsUploading(false);
    setOverallProgress(0);
    totalBytesRef.current = 0;
    removeGalleryErrors();
  };

  useEffect(() => {
    if (!show) {
      resetUploadState();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [show, removeGalleryErrors]);

  useEffect(() => {
    return () => {
      if (abortRef.current) {
        abortRef.current.abort();
      }
      clearPreviews(items);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const onFileChange = (e) => {
    const files = Array.from(e.target.files || []);
    removeGalleryErrors();

    const errors = validateFiles(files);
    if (errors.length) {
      setErrors(errors);
      e.target.value = "";
      return;
    }

    clearPreviews(items);

    setItems(
      files.map((file, index) => ({
        id: `${file.name}-${file.size}-${file.lastModified}-${index}`,
        file,
        name: file.name,
        preview: URL.createObjectURL(file),
      }))
    );
    totalBytesRef.current = files.reduce((sum, file) => sum + (file.size || 0), 0);
    setOverallProgress(0);
    e.target.value = "";
  };

  const removeFileAt = (id) => {
    if (isUploading) {
      return;
    }

    setItems((prev) => {
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

  const handleCancel = () => {
    if (isUploading && abortRef.current) {
      abortRef.current.abort();
      return;
    }
    handleClose();
  };

  const onSubmit = async () => {
    removeGalleryErrors();

    const files = items.map((item) => item.file);
    const errors = validateFiles(files);
    if (errors.length) {
      setErrors(errors);
      return;
    }

    const controller = new AbortController();
    abortRef.current = controller;

    setIsUploading(true);
    setOverallProgress(0);

    const formData = new FormData();
    items.forEach((item) => {
      formData.append("images", item.file);
    });

    const fallbackTotal = totalBytesRef.current || 1;

    const result = await createGalleryImagesBulk(formData, {
      showAlert: false,
      signal: controller.signal,
      onProgress: (percent, loaded, total) => {
        if (typeof percent === "number") {
          setOverallProgress(percent);
          return;
        }
        const estimated = Math.min(
          99,
          Math.round(((loaded || 0) * 100) / (total || fallbackTotal))
        );
        setOverallProgress(estimated);
      },
    });

    abortRef.current = null;
    setIsUploading(false);

    if (result?.cancelled) {
      setOverallProgress(0);
      setAlert(
        "Upload cancelled. Uploaded files were removed from Cloudflare.",
        "warning"
      );
      return;
    }

    if (result?.status === true) {
      setOverallProgress(100);
      const createdCount = result.response?.created?.length || items.length;
      const failedCount = result.response?.failed?.length || 0;

      if (failedCount) {
        setAlert(
          `${createdCount} uploaded, ${failedCount} failed.`,
          "warning"
        );
        return;
      }

      setAlert(
        createdCount === 1
          ? "Gallery image uploaded successfully."
          : `${createdCount} images uploaded successfully.`,
        "success"
      );
      handleClose();
      return;
    }

    setOverallProgress(0);
    setAlert(
      result?.message || "Failed to upload images. Please try again.",
      "danger"
    );
  };

  return (
    <CustomModal
      show={show}
      onHide={handleCancel}
      title="Add Gallery Images"
      size="lg"
      closeButton
      bodyClassName="common-modal-body--start"
      actions={[
        {
          label: isUploading ? "Cancel Upload" : "Cancel",
          onClick: handleCancel,
          className: "btn btn--outline",
          colSize: 5,
        },
        {
          label: isUploading
            ? `Uploading${overallProgress ? ` ${overallProgress}%` : "..."}`
            : items.length > 1
              ? `Upload ${items.length} Images`
              : "Upload Image",
          onClick: onSubmit,
          className: "btn btn--theme",
          colSize: 7,
          disabled: isUploading || items.length === 0,
        },
      ]}
    >
      <Form onSubmit={(e) => e.preventDefault()}>
        <Row>
          <Col md="12" className="mb-3">
            <Form.Group controlId="galleryImages">
              <Form.Label>Images *</Form.Label>
              <Form.Control
                type="file"
                name="images"
                accept="image/jpeg,image/jpg,image/png,image/webp"
                multiple
                onChange={onFileChange}
                disabled={isUploading}
                className={errorList.images ? "invalid" : ""}
              />
              <Form.Text className="text-muted">
                Select one or multiple images (up to {MAX_GALLERY_BULK_UPLOAD} at
                once). All images upload in a single request.
              </Form.Text>
              <Errors current_key="images" />
            </Form.Group>
          </Col>

          {isUploading ? (
            <Col md="12" className="mb-3">
              <div className="gallery-upload-overall">
                <BouncingLoader
                  className="gallery-upload-loader"
                  message={
                    overallProgress
                      ? `Uploading images… ${overallProgress}%`
                      : "Uploading images to Cloudflare…"
                  }
                />
              </div>
            </Col>
          ) : null}

          {items.length > 0 ? (
            <Col md="12">
              <div className="gallery-upload-preview-grid">
                {items.map((item) => (
                  <div key={item.id} className="gallery-upload-preview-item">
                    <img
                      src={item.preview}
                      alt={item.name}
                      className="gallery-upload-preview-image"
                    />
                    <div className="gallery-upload-preview-meta">
                      <div className="gallery-upload-preview-name" title={item.name}>
                        {item.name}
                      </div>
                    </div>
                    {!isUploading ? (
                      <button
                        type="button"
                        className="gallery-upload-preview-remove"
                        onClick={() => removeFileAt(item.id)}
                      >
                        Remove
                      </button>
                    ) : null}
                  </div>
                ))}
              </div>
            </Col>
          ) : null}
        </Row>
      </Form>
    </CustomModal>
  );
};

GalleryModal.propTypes = {
  show: PropTypes.bool.isRequired,
  handleClose: PropTypes.func.isRequired,
};

const mapStateToProps = (state) => ({
  errorList: state.errors,
});

export default connect(mapStateToProps, {
  createGalleryImagesBulk,
  removeGalleryErrors,
  setErrors,
  setAlert,
})(GalleryModal);
