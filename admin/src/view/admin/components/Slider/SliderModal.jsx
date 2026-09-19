import React, { useState, useEffect } from "react";
import { Form, Row, Col, Button } from "react-bootstrap";
import PropTypes from "prop-types";
import { connect } from "react-redux";
import CustomModal from "@src/components/common/Modal/CustomModal";
import Errors from "@src/notifications/Errors";
import { validateForm } from "@src/utils/validation";
import { setErrors } from "@src/actions/adminAuth";
import {
  createSliderBanner,
  updateSliderBanner,
  removeSliderErrors,
} from "@src/actions/adminSliderActions";
import VerificationConfirmModal from "@src/view/admin/modals/VerificationConfirmModal";
import {
  MAX_IMAGE_SIZE_BYTES,
  IMAGE_SIZE_ERROR,
} from "@src/constants/imageUpload";

const SliderModal = ({
  show,
  handleClose,
  slider,
  nextOrder = 1,
  createSliderBanner,
  updateSliderBanner,
  removeSliderErrors,
  setErrors,
  errorList,
  loadingSliderList,
}) => {
  const [formData, setFormData] = useState({
    title: "",
    order: 1,
    isActive: true,
    image: null,
    clearImage: false,
  });
  const [imagePreview, setImagePreview] = useState(null);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [pendingFormData, setPendingFormData] = useState(null);

  useEffect(() => {
    if (slider) {
      setFormData({
        title: slider.title || "",
        order: slider.order || 1,
        isActive: slider.isActive !== undefined ? slider.isActive : true,
        image: null,
        clearImage: false,
      });
      setImagePreview(slider.imageUrl || null);
    } else {
      setFormData({
        title: "",
        order: nextOrder,
        isActive: true,
        image: null,
        clearImage: false,
      });
      setImagePreview(null);
    }
    removeSliderErrors();
  }, [slider, show, nextOrder, removeSliderErrors]);

  const onChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData({
      ...formData,
      [name]: type === "checkbox" ? checked : value,
    });
  };

  const onFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      if (file.size > MAX_IMAGE_SIZE_BYTES) {
        setErrors([{ path: "image", msg: IMAGE_SIZE_ERROR }]);
        return;
      }

      const allowedTypes = ["image/jpeg", "image/jpg", "image/png", "image/webp"];
      if (!allowedTypes.includes(file.type)) {
        setErrors([
          { path: "image", msg: "Only jpg, jpeg, png, and webp images are allowed" },
        ]);
        return;
      }

      setFormData({ ...formData, image: file, clearImage: false });

      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleRemoveImage = () => {
    setFormData({ ...formData, image: null, clearImage: true });
    setImagePreview(null);
  };

  const buildFormData = () => {
    const formDataToSend = new FormData();
    formDataToSend.append("title", formData.title);
    formDataToSend.append("order", formData.order);
    formDataToSend.append("isActive", formData.isActive);
    if (formData.image) {
      formDataToSend.append("image", formData.image);
    }
    if (formData.clearImage) {
      formDataToSend.append("clearImage", "true");
    }
    return formDataToSend;
  };

  const onSubmit = () => {
    removeSliderErrors();

    const validationRules = [];
    if (!slider) {
      validationRules.push({ path: "image", msg: "Image is required" });
    } else if (!formData.image && (formData.clearImage || !imagePreview)) {
      validationRules.push({ path: "image", msg: "Image is required" });
    }

    const errors = validateForm(formData, validationRules);
    if (errors.length) {
      setErrors(errors);
      return;
    }

    if (slider) {
      setPendingFormData(buildFormData());
      setShowConfirmModal(true);
      return;
    }

    createSliderBanner(buildFormData(), handleClose);
  };

  const handleConfirmEdit = (txnPassword) => {
    if (!pendingFormData || !txnPassword) {
      return;
    }

    pendingFormData.append("txn_password", txnPassword);
    updateSliderBanner(pendingFormData, slider._id, () => {
      setShowConfirmModal(false);
      setPendingFormData(null);
      handleClose();
    });
  };

  return (
    <>
      <CustomModal
        show={show}
        onHide={handleClose}
        title={slider ? "Edit Slider Banner" : "Add Slider Banner"}
        size="lg"
        closeButton
        bodyClassName="common-modal-body--start"
        actions={[
          {
            label: "Cancel",
            onClick: handleClose,
            className: "btn btn--outline",
            colSize: 5,
            disabled: loadingSliderList,
          },
          {
            label: loadingSliderList ? "Saving..." : slider ? "Update" : "Create",
            onClick: onSubmit,
            className: "btn btn--theme",
            colSize: 7,
            disabled: loadingSliderList,
          },
        ]}
      >
        <Form onSubmit={(e) => e.preventDefault()}>
          <Row>
            <Col md="12" className="mb-3">
              <Form.Group controlId="title">
                <Form.Label>Banner Title</Form.Label>
                <Form.Control
                  type="text"
                  name="title"
                  value={formData.title}
                  onChange={onChange}
                  placeholder="Enter banner title"
                />
              </Form.Group>
            </Col>

            <Col md="6" className="mb-3">
              <Form.Group controlId="order">
                <Form.Label>Display Order</Form.Label>
                <Form.Control
                  type="number"
                  name="order"
                  value={formData.order}
                  onChange={onChange}
                  min="1"
                />
                <Form.Text className="text-muted">
                  Changing order will automatically shift other banners.
                </Form.Text>
              </Form.Group>
            </Col>

            <Col md="6" className="mb-3">
              <Form.Group controlId="isActive">
                <Form.Check
                  type="switch"
                  id="isActive"
                  name="isActive"
                  label="Active"
                  checked={formData.isActive}
                  onChange={onChange}
                />
              </Form.Group>
            </Col>

            <Col md="12" className="mb-3">
              <Form.Group controlId="image">
                <Form.Label>
                  Image {slider ? "(Optional - leave empty to keep current)" : "*"}
                </Form.Label>
                <Form.Control
                  type="file"
                  name="image"
                  accept="image/jpeg,image/jpg,image/png,image/webp"
                  onChange={onFileChange}
                  className={errorList.image ? "invalid" : ""}
                />
                <Errors current_key="image" />
                {imagePreview && (
                  <div className="mt-2">
                    <img
                      src={imagePreview}
                      alt="Preview"
                      className="image-preview"
                    />
                    <div className="mt-2">
                      <Button
                        type="button"
                        variant="outline-danger"
                        size="sm"
                        onClick={handleRemoveImage}
                      >
                        Remove Image
                      </Button>
                    </div>
                  </div>
                )}
              </Form.Group>
            </Col>
          </Row>
        </Form>
      </CustomModal>

      <VerificationConfirmModal
        show={showConfirmModal}
        handleClose={() => {
          setShowConfirmModal(false);
          setPendingFormData(null);
        }}
        handleConfirm={handleConfirmEdit}
        title="Confirm Banner Update"
        body="Please enter your transaction password to update this slider banner."
        submitBtnText="Update"
      />
    </>
  );
};

SliderModal.propTypes = {
  show: PropTypes.bool.isRequired,
  handleClose: PropTypes.func.isRequired,
  slider: PropTypes.object,
  nextOrder: PropTypes.number,
};

const mapStateToProps = (state) => ({
  errorList: state.errors,
  loadingSliderList: state.slider.loadingSliderList,
});

export default connect(mapStateToProps, {
  createSliderBanner,
  updateSliderBanner,
  removeSliderErrors,
  setErrors,
})(SliderModal);
