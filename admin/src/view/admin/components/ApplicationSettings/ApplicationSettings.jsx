import React, { useEffect, useState } from "react";
import { PropTypes } from "prop-types";
import { connect } from "react-redux";
import { Container, Form, Button } from "react-bootstrap";

// icons
import { MdEdit } from "react-icons/md";
import { FaRegEye } from "react-icons/fa";

// custom imports
import { validateForm } from "@src/utils/validation";
import { setErrors } from "@src/actions/adminAuth";
import AppBreadCrumb from "@src/view/commonComponents/dataTable/AppBreadCrumb";
import {
  getCommonSettings,
  updateCommonSettings,
  resetComponentStore,
} from "@src/actions/adminCommonSettingsActions";
import BouncingLoader from "@src/view/spinners/BouncingLoader";
import VerificationConfirmModal from "@src/view/admin/modals/VerificationConfirmModal";
import { AboutUsSection, ContactUsSection } from "./AboutContactSections";
import {
  GeneralInformationSection,
  SocialMediaSection,
} from "./ApplicationSettingsSections";
import {
  emptyAboutSection,
  buildAboutUsFromSettings,
  buildContactUsPageFromSettings,
  appendAboutContactSubmitData,
} from "./aboutContactFormHelpers";
import {
  emptySocialLink,
  normalizeSocialLinksFromApi,
  buildSocialMediaForSubmit,
  getNextAvailablePlatform,
  validateSocialLinks,
} from "./socialMediaFormHelpers";
import {
  MAX_IMAGE_SIZE_BYTES,
  LOGO_SIZE_ERROR,
  SECTION_IMAGE_SIZE_ERROR,
} from "@src/constants/imageUpload";

const ApplicationSettings = ({
  setErrors,
  errorList,
  getCommonSettings,
  updateCommonSettings,
  resetComponentStore,
  adminCommonSettings: {
    commonSettings,
    loadingCommonSettings,
    loadingOnSubmit,
  },
}) => {
  // Initial form data structure
  const initialFormData = {
    // General Information
    name: "",
    abbreviation: "",
    developedBy: "",
    developedByLink: "",
    logo: null,
    logoUrl: "",

    socialLinks: [emptySocialLink()],

    // About Us Page Content
    aboutUs: {
      title: "",
      intro: "",
      sections: [emptyAboutSection()],
    },

    // Contact Us Page Content
    contactUsPage: {
      title: "",
      intro: "",
      phone: "",
      secondaryPhone: "",
      email: "",
      address: "",
      businessHours: "",
    },
  };

  const [formData, setFormData] = useState(initialFormData);
  const [submitting, setSubmitting] = useState(false);
  const [onlyOnce, setOnce] = useState(true);
  const [isDisabled, setDisabled] = useState(true);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [pendingSubmitData, setPendingSubmitData] = useState(null);
  const [logoPreview, setLogoPreview] = useState(null);

  const toggleEdit = () => setDisabled(!isDisabled);

  // Fetch settings on component mount
  useEffect(() => {
    if (onlyOnce) {
      resetComponentStore();
      setOnce(false);
    }

    getCommonSettings();
  }, [getCommonSettings, resetComponentStore]);

  // Update form data when settings are fetched
  useEffect(() => {
    if (commonSettings && Object.keys(commonSettings).length > 0) {
      setFormData({
        name: commonSettings.name || "",
        abbreviation: commonSettings.abbreviation || "",
        developedBy: commonSettings.developedBy || "",
        developedByLink: commonSettings.developedByLink || "",
        contactUsPage: buildContactUsPageFromSettings(commonSettings),
        socialLinks: normalizeSocialLinksFromApi(commonSettings.socialMedia),
        aboutUs: buildAboutUsFromSettings(commonSettings),
      });
      // Set logo preview if logoUrl exists
      if (commonSettings.logoUrl) {
        setLogoPreview(commonSettings.logoUrl);
      } else {
        setLogoPreview(null);
      }
    }
  }, [commonSettings]);

  // Handle logo file change
  const onLogoChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      if (file.size > MAX_IMAGE_SIZE_BYTES) {
        setErrors([{ path: "logo", msg: LOGO_SIZE_ERROR }]);
        return;
      }

      // Validate file type
      const allowedTypes = [
        "image/jpeg",
        "image/jpg",
        "image/png",
        "image/webp",
      ];
      if (!allowedTypes.includes(file.type)) {
        setErrors([
          {
            path: "logo",
            msg: "Only jpg, jpeg, png, and webp images are allowed",
          },
        ]);
        return;
      }

      setFormData({ ...formData, logo: file });

      // Create preview
      const reader = new FileReader();
      reader.onloadend = () => {
        setLogoPreview(reader.result);
      };
      reader.readAsDataURL(file);
    }
  };

  // About Us section helpers
  const patchAboutSections = (updater) => {
    setFormData((prev) => {
      const sections = updater([...(prev.aboutUs?.sections || [])]);
      return {
        ...prev,
        aboutUs: { ...prev.aboutUs, sections },
      };
    });
  };

  const onAboutSectionField = (index, field, value) => {
    patchAboutSections((list) => {
      const copy = [...list];
      copy[index] = { ...copy[index], [field]: value };
      return copy;
    });
  };

  const onAboutSectionImageChange = (index, file) => {
    if (!file) return;

    if (file.size > MAX_IMAGE_SIZE_BYTES) {
      setErrors([
        { path: "aboutUs", msg: SECTION_IMAGE_SIZE_ERROR },
      ]);
      return;
    }

    const allowedTypes = ["image/jpeg", "image/jpg", "image/png", "image/webp"];
    if (!allowedTypes.includes(file.type)) {
      setErrors([
        {
          path: "aboutUs",
          msg: "Only jpg, jpeg, png, and webp images are allowed",
        },
      ]);
      return;
    }

    const reader = new FileReader();
    reader.onloadend = () => {
      patchAboutSections((list) => {
        const copy = [...list];
        copy[index] = {
          ...copy[index],
          image: file,
          imagePreview: reader.result,
          clearImage: false,
        };
        return copy;
      });
    };
    reader.readAsDataURL(file);
  };

  const clearAboutSectionImage = (index) => {
    patchAboutSections((list) => {
      const copy = [...list];
      copy[index] = {
        ...copy[index],
        image: null,
        imagePreview: null,
        imageUrl: "",
        imageKey: "",
        clearImage: true,
      };
      return copy;
    });
  };

  const addAboutSection = () => {
    patchAboutSections((list) => [...list, emptyAboutSection()]);
  };

  const removeAboutSection = (index) => {
    patchAboutSections((list) => {
      if (list.length <= 1) return [emptyAboutSection()];
      return list.filter((_, i) => i !== index);
    });
  };

  const moveAboutSection = (index, delta) => {
    patchAboutSections((list) => {
      const j = index + delta;
      if (j < 0 || j >= list.length) return list;
      const copy = [...list];
      [copy[index], copy[j]] = [copy[j], copy[index]];
      return copy;
    });
  };

  const patchSocialLinks = (updater) => {
    setFormData((prev) => ({
      ...prev,
      socialLinks: updater([...(prev.socialLinks || [])]),
    }));
  };

  const onSocialLinkField = (index, field, value) => {
    patchSocialLinks((list) => {
      const copy = [...list];
      copy[index] = { ...copy[index], [field]: value };
      return copy;
    });
  };

  const addSocialLink = () => {
    patchSocialLinks((list) => {
      const nextPlatform = getNextAvailablePlatform(list);
      if (!nextPlatform) {
        return list;
      }
      return [...list, emptySocialLink(nextPlatform)];
    });
  };

  const removeSocialLink = (index) => {
    patchSocialLinks((list) => list.filter((_, i) => i !== index));
  };

  // Handle input changes
  const onChange = (e) => {
    if (!e.target) {
      return;
    }

    const { name, value, type, checked } = e.target;

    // Handle nested fields (aboutUs, contactUsPage)
    if (name.startsWith("aboutUs.") || name.startsWith("contactUsPage.")) {
      const [parent, child] = name.split(".");
      const processedValue = type === "checkbox" ? checked : value;
      setFormData({
        ...formData,
        [parent]: {
          ...formData[parent],
          [child]: processedValue,
        },
      });
    } else {
      // Handle regular fields and checkboxes
      setFormData({
        ...formData,
        [name]: type === "checkbox" ? checked : value,
      });
    }
  };

  // Handle form submission
  const onSubmit = (e) => {
    e.preventDefault();

    const form = e.currentTarget;
    if (form.checkValidity() === false) {
      e.preventDefault();
      e.stopPropagation();
      return;
    }

    setSubmitting(true);

    // Validation rules
    let validationRules = [
      {
        path: "name",
        msg: "Please provide a valid name.",
      },
    ];

    const errors = [
      ...validateForm(formData, validationRules),
      ...validateSocialLinks(formData.socialLinks),
    ];

    const contactPhone = formData.contactUsPage?.phone?.trim() || "";
    if (!contactPhone) {
      errors.push({
        path: "contactUsPage.phone",
        msg: "Please provide contact phone.",
      });
    }

    const contactEmail = formData.contactUsPage?.email?.trim() || "";
    if (!contactEmail) {
      errors.push({
        path: "contactUsPage.email",
        msg: "Please provide a valid email address.",
      });
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(contactEmail)) {
      errors.push({
        path: "contactUsPage.email",
        msg: "Please provide a valid email address.",
      });
    }

    const portfolioLink = formData.developedByLink?.trim() || "";
    if (portfolioLink) {
      try {
        const normalizedLink = /^https?:\/\//i.test(portfolioLink)
          ? portfolioLink
          : `https://${portfolioLink}`;
        const parsedUrl = new URL(normalizedLink);
        if (!["http:", "https:"].includes(parsedUrl.protocol)) {
          throw new Error("Invalid protocol");
        }
      } catch {
        errors.push({
          path: "developedByLink",
          msg: "Please provide a valid portfolio URL.",
        });
      }
    }

    if (errors.length) {
      setErrors(errors);
      setSubmitting(false);
      return;
    }

    // Prepare submit data
    const submitData = new FormData();
    submitData.append("name", formData.name);
    submitData.append("abbreviation", formData.abbreviation);
    submitData.append("developedBy", formData.developedBy);
    submitData.append("developedByLink", formData.developedByLink);

    // Append logo if selected
    if (formData.logo) {
      submitData.append("logo", formData.logo);
    }
    submitData.append(
      "socialMedia",
      JSON.stringify(buildSocialMediaForSubmit(formData.socialLinks)),
    );
    appendAboutContactSubmitData(submitData, formData);

    // Store submit data and show confirmation modal
    setPendingSubmitData(submitData);
    setShowConfirmModal(true);
    setSubmitting(false);
  };

  // Handle confirmation from modal
  const handleConfirmSave = (txn_password) => {
    if (pendingSubmitData) {
      // Add transaction password to submit data
      if (pendingSubmitData instanceof FormData) {
        pendingSubmitData.append("txn_password", txn_password);
        updateCommonSettings(pendingSubmitData);
      } else {
        const submitDataWithPassword = {
          ...pendingSubmitData,
          txn_password,
        };
        updateCommonSettings(submitDataWithPassword);
      }
      setShowConfirmModal(false);
      setPendingSubmitData(null);
      setDisabled(true); // Switch back to view mode after save
    }
  };

  const handleCloseModal = () => {
    setShowConfirmModal(false);
    setPendingSubmitData(null);
  };

  const onClickCancel = (e) => {
    e.preventDefault();
    // Reset form data to original settings
    if (commonSettings && Object.keys(commonSettings).length > 0) {
      setFormData({
        name: commonSettings.name || "",
        abbreviation: commonSettings.abbreviation || "",
        developedBy: commonSettings.developedBy || "",
        developedByLink: commonSettings.developedByLink || "",
        logo: null,
        logoUrl: commonSettings.logoUrl || "",
        socialLinks: normalizeSocialLinksFromApi(commonSettings.socialMedia),
        aboutUs: buildAboutUsFromSettings(commonSettings),
        contactUsPage: buildContactUsPageFromSettings(commonSettings),
      });
      if (commonSettings.logoUrl) {
        setLogoPreview(commonSettings.logoUrl);
      } else {
        setLogoPreview(null);
      }
    }
    toggleEdit();
  };

  if (loadingCommonSettings) {
    return (
      <Container>
        <AppBreadCrumb
          pageTitle="Application Settings"
          crumbs={[{ name: "Application Settings" }]}
        />
        <BouncingLoader />
      </Container>
    );
  }

  return (
    <Container fluid className="common-settings">
      <AppBreadCrumb
        pageTitle="Application Settings"
        crumbs={[{ name: "Application Settings" }]}
      />

      <Form
        onSubmit={(e) => onSubmit(e)}
        autoComplete="off"
        className="container"
      >
        <div className="common-settings__header">
          <div>
            <h2 className="common-settings__title">Application Settings</h2>
            <p className="common-settings__subtitle">
              Manage branding, contact details, and public page content from one
              place.
            </p>
          </div>
          <Button
            variant={null}
            className="btn btn--outline common-settings__edit-btn"
            onClick={toggleEdit}
          >
            {isDisabled ? <MdEdit size={18} /> : <FaRegEye size={18} />}
            <span>{isDisabled ? "Edit" : "Preview"}</span>
          </Button>
        </div>

        <GeneralInformationSection
          formData={formData}
          errorList={errorList}
          isDisabled={isDisabled}
          logoPreview={logoPreview}
          onChange={onChange}
          onLogoChange={onLogoChange}
        />

        <SocialMediaSection
          socialLinks={formData.socialLinks}
          isDisabled={isDisabled}
          onSocialLinkField={onSocialLinkField}
          addSocialLink={addSocialLink}
          removeSocialLink={removeSocialLink}
        />

        <AboutUsSection
          formData={formData}
          isDisabled={isDisabled}
          onChange={onChange}
          addAboutSection={addAboutSection}
          removeAboutSection={removeAboutSection}
          moveAboutSection={moveAboutSection}
          onAboutSectionField={onAboutSectionField}
          onAboutSectionImageChange={onAboutSectionImageChange}
          clearAboutSectionImage={clearAboutSectionImage}
        />

        <ContactUsSection
          formData={formData}
          errorList={errorList}
          isDisabled={isDisabled}
          onChange={onChange}
        />

        <div className="text-end pb-3">
          <Button
            className="me-2 btn btn--theme btn--disabled-theme"
            type="submit"
            disabled={submitting || loadingOnSubmit || isDisabled}
          >
            {submitting || loadingOnSubmit ? "Saving..." : "Save Changes"}
          </Button>
          <Button
            type="button"
            className="btn btn--danger btn--disabled-theme"
            onClick={onClickCancel}
            disabled={submitting || loadingOnSubmit || isDisabled}
          >
            Cancel
          </Button>
        </div>
      </Form>

      <VerificationConfirmModal
        show={showConfirmModal}
        handleClose={handleCloseModal}
        handleConfirm={handleConfirmSave}
        title="Confirm Settings Update"
        body="Please enter your transaction password to confirm the settings update."
        submitBtnText="Confirm & Save"
      />
    </Container>
  );
};

const mapStateToProps = (state) => ({
  errorList: state.errors,
  adminCommonSettings: state.adminCommonSettings,
});

export default connect(mapStateToProps, {
  setErrors,
  resetComponentStore,
  getCommonSettings,
  updateCommonSettings,
})(ApplicationSettings);
