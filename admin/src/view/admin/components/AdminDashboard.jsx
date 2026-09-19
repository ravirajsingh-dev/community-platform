import React, { useEffect } from "react";
import { connect } from "react-redux";
import { Card, Col, Container, Row } from "react-bootstrap";

import AppBreadCrumb from "@src/view/commonComponents/dataTable/AppBreadCrumb";
import { getPaymentStats } from "@src/actions/adminPaymentsActions";
import { formatIndianNumber } from "@src/utils/helper";

const AdminDashboard = ({ getPaymentStats, paymentStats, loadingPaymentStats }) => {
  useEffect(() => {
    getPaymentStats();
  }, [getPaymentStats]);

  return (
    <Container fluid>
      <AppBreadCrumb pageTitle="Dashboard" crumbs={[{ name: "Dashboard" }]} />

      <Row className="g-3">
        <Col md={6} lg={3}>
          <Card className="common-panel-card h-100">
            <Card.Body>
              <div className="text-muted small">Today&apos;s Revenue</div>
              <div className="fs-4 fw-semibold">
                {loadingPaymentStats ? "..." : `₹${formatIndianNumber(paymentStats.todayRevenue)}`}
              </div>
            </Card.Body>
          </Card>
        </Col>
        <Col md={6} lg={3}>
          <Card className="common-panel-card h-100">
            <Card.Body>
              <div className="text-muted small">Pending Payments</div>
              <div className="fs-4 fw-semibold">
                {loadingPaymentStats ? "..." : paymentStats.pendingPayments}
              </div>
            </Card.Body>
          </Card>
        </Col>
        <Col md={6} lg={3}>
          <Card className="common-panel-card h-100">
            <Card.Body>
              <div className="text-muted small">Successful Payments</div>
              <div className="fs-4 fw-semibold">
                {loadingPaymentStats ? "..." : paymentStats.successfulPayments}
              </div>
            </Card.Body>
          </Card>
        </Col>
        <Col md={6} lg={3}>
          <Card className="common-panel-card h-100">
            <Card.Body>
              <div className="text-muted small">Total Revenue</div>
              <div className="fs-4 fw-semibold">
                {loadingPaymentStats ? "..." : `₹${formatIndianNumber(paymentStats.totalRevenue)}`}
              </div>
            </Card.Body>
          </Card>
        </Col>
      </Row>
    </Container>
  );
};

const mapStateToProps = (state) => ({
  paymentStats: state.adminPayments.paymentStats,
  loadingPaymentStats: state.adminPayments.loadingPaymentStats,
});

export default connect(mapStateToProps, { getPaymentStats })(AdminDashboard);
