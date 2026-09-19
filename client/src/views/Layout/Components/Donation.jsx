import React, { useEffect, useState } from "react";
import { Container, Button } from "react-bootstrap";
import { connect } from "react-redux";
import { MdAccountBalance, MdQrCode2 } from "react-icons/md";
import {
  getActiveDonationButtons,
  getDonationSettings,
} from "@src/actions/donationActions";
import DonationModal from "@src/views/Common/Modal/DonationModal";
import BouncingLoader from "@src/views/Common/Loaders/BouncingLoader";
import TopDonations from "@src/views/Common/TopDonations";
import HomeSectionHeader from "./HomeSectionHeader";
import ScrollReveal from "./ScrollReveal";

const DEFAULT_TOP_DONATIONS_LIMIT = 20;

const Donation = ({
  getActiveDonationButtons,
  getDonationSettings,
  donationButtons,
  donationSettings,
  loadingDonationButtons,
  loadingDonationSettings,
}) => {
  const [showUPIModal, setShowUPIModal] = useState(false);
  const [showBankModal, setShowBankModal] = useState(false);
  const [selectedAmount, setSelectedAmount] = useState(null);
  const [isFixedAmount, setIsFixedAmount] = useState(false);

  useEffect(() => {
    getActiveDonationButtons();
    getDonationSettings();
  }, [getActiveDonationButtons, getDonationSettings]);

  // Support header / deep links to /#donation (including after client-side navigate)
  useEffect(() => {
    if (window.location.hash !== "#donation") return;
    if (loadingDonationSettings) return;
    if (donationSettings.donationEnabled === false) return;

    const frameId = window.requestAnimationFrame(() => {
      document
        .getElementById("donation")
        ?.scrollIntoView({ behavior: "smooth" });
    });
    return () => window.cancelAnimationFrame(frameId);
  }, [loadingDonationSettings, donationSettings.donationEnabled]);

  if (!donationSettings.donationEnabled) {
    return null;
  }

  const handleDonateClick = (button) => {
    if (button.type === "ANY") {
      setSelectedAmount(null);
      setIsFixedAmount(false);
    } else {
      setSelectedAmount(button.amount);
      setIsFixedAmount(true);
    }
    setShowUPIModal(true);
  };

  const handleBankDonateClick = () => {
    setSelectedAmount(null);
    setIsFixedAmount(false);
    setShowBankModal(true);
  };

  if (loadingDonationButtons || loadingDonationSettings) {
    return (
      <section id="donation" className="home-donation home-section-surface">
        <Container>
          <BouncingLoader />
        </Container>
      </section>
    );
  }

  const activeButtons = donationButtons.filter((btn) => btn.isActive);

  const sectionTitle = donationSettings.donationTitle || "Support Our Mission";
  const sectionTitleHighlight =
    donationSettings.donationTitleHighlight || "Empower Communities Together";
  const sectionMessage =
    donationSettings.donationMessage ||
    "Your contribution helps us drive education, culture, welfare, and community initiatives that create lasting impact.";
  const showTopDonations = donationSettings.topDonationsEnabled !== false;
  const topDonationsLimit =
    donationSettings.topDonationsLimit || DEFAULT_TOP_DONATIONS_LIMIT;

  return (
    <>
      <section id="donation" className="home-donation home-section-surface">
        <Container>
          <HomeSectionHeader
            title={
              <>
                {sectionTitle}
                {sectionTitleHighlight ? (
                  <span>{sectionTitleHighlight}</span>
                ) : null}
              </>
            }
            description={sectionMessage}
          />

          <ScrollReveal className="home-donation__panel home-donation__panel--split">
            <div className="home-donation__split">
              <div className="home-donation__column home-donation__column--upi">
                <div className="home-donation__panel-head">
                  <span className="home-donation__panel-icon" aria-hidden="true">
                    <MdQrCode2 />
                  </span>
                  <div className="home-donation__panel-copy">
                    <h3 className="home-donation__panel-title">UPI</h3>
                    <p className="home-donation__panel-desc">
                      Quick, secure donations in just a tap
                    </p>
                  </div>
                </div>

                <div className="home-donation__amounts">
                  {activeButtons.map((button) => (
                    <button
                      key={button._id}
                      type="button"
                      className="home-donation__amount-link"
                      onClick={() => handleDonateClick(button)}
                    >
                      {button.type === "ANY" ? (
                        <>
                          <span className="home-donation__amount-value">
                            {button.buttonText || "Donate"}
                          </span>
                          <span className="home-donation__amount-label">
                            Any Amount
                          </span>
                        </>
                      ) : (
                        <>
                          {button.buttonText ? (
                            <span className="home-donation__amount-value">
                              {button.buttonText}
                            </span>
                          ) : null}
                          <span className="home-donation__amount-label">
                            ₹{button.amount}
                          </span>
                        </>
                      )}
                    </button>
                  ))}
                </div>
              </div>

              <div className="home-donation__divider" aria-hidden="true" />

              <div className="home-donation__column home-donation__column--bank">
                <div className="home-donation__panel-head">
                  <span className="home-donation__panel-icon" aria-hidden="true">
                    <MdAccountBalance />
                  </span>
                  <div className="home-donation__panel-copy">
                    <h3 className="home-donation__panel-title">Bank</h3>
                    <p className="home-donation__panel-desc">
                      View bank details and submit your donation request.
                    </p>
                  </div>
                </div>

                <Button
                  size="sm"
                  variant="outline-primary"
                  className="home-donation__bank-btn"
                  onClick={handleBankDonateClick}
                >
                  Donate via Bank
                </Button>
              </div>
            </div>
          </ScrollReveal>

          {showTopDonations && (
            <ScrollReveal className="home-donation__top" delay={200}>
              <h3 className="home-donation__top-title">
                Top {topDonationsLimit} Donations
              </h3>
              <TopDonations limit={topDonationsLimit} />
            </ScrollReveal>
          )}
        </Container>
      </section>

      <DonationModal
        show={showUPIModal}
        handleClose={() => {
          setShowUPIModal(false);
          setSelectedAmount(null);
        }}
        paymentMode="UPI"
        initialAmount={selectedAmount}
        isFixedAmount={isFixedAmount}
        donationSettings={donationSettings}
      />

      <DonationModal
        show={showBankModal}
        handleClose={() => {
          setShowBankModal(false);
          setSelectedAmount(null);
        }}
        paymentMode="BANK"
        initialAmount={null}
        isFixedAmount={false}
        donationSettings={donationSettings}
      />
    </>
  );
};

const mapStateToProps = (state) => ({
  donationButtons: state.donation.donationButtons,
  donationSettings: state.donation.donationSettings,
  loadingDonationButtons: state.donation.loadingDonationButtons,
  loadingDonationSettings: state.donation.loadingDonationSettings,
});

export default connect(mapStateToProps, {
  getActiveDonationButtons,
  getDonationSettings,
})(Donation);
