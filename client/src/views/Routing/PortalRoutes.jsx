import { createBrowserRouter, Navigate } from "react-router-dom";

// Layouts
import PublicLayout from "../Layout/PublicLayout";
import PortalLayout from "../Layout/PortalLayout";

// Auth Components
import Register from "../Auth/Register";
import Login from "../Auth/Login";

// Public Components
import Home from "../Layout/Home/Home";
import AboutUs from "../Layout/AboutUs/AboutUs";
import ContactUs from "../Layout/ContactUs/ContactUs";
import LegalContentPage from "../Layout/Legal/LegalContentPage";

// Dashboard Component
import Dashboard from "../Layout/Dashboard/Dashboard";
import RenewMembership from "../Layout/Membership/RenewMembership";

// Profile / My Account
import MyAccount from "../Layout/MyAccount/MyAccount";

// Search Member Component
import SearchMember from "../Layout/SearchMember/SearchMember";
import MemberDetails from "../Layout/SearchMember/MemberDetails";

// Password Components
import SetTransactionPassword from "../Layout/Passwords/SetTransactionPassword";
import ChangeTransactionPassword from "../Layout/Passwords/ChangeTransactionPassword";
import TransactionPasswordIndex from "../Layout/Passwords/TransactionPasswordIndex";
import FamilyManage from "../Layout/Family/FamilyManage";
import FamilyTreePage from "../Layout/Family/FamilyTreePage";
import MatrimonialIndex from "../Layout/Matrimonial/MatrimonialIndex";
import MatrimonialMatches from "../Layout/Matrimonial/MatrimonialMatches";
import MatrimonialList from "../Layout/Matrimonial/MatrimonialList";
import MatrimonialProfileView from "../Layout/Matrimonial/MatrimonialProfileView";
import ComingSoonPage from "../Layout/ComingSoon/ComingSoonPage";

// Common Components
import NotFoundPage from "../Common/NotFound/NotFoundPage";

const PortalRoutes = createBrowserRouter([
  // Public Routes (Unauthenticated)
  {
    path: "/register",
    name: "Register",
    element: <Register />,
  },
  {
    path: "/login",
    name: "Login",
    element: <Login />,
  },
  {
    path: "/",
    element: <PublicLayout />,
    children: [
      {
        path: "/",
        name: "Home Page",
        element: <Home />,
      },
      {
        path: "/contact-us",
        name: "Contact US",
        element: <ContactUs />,
      },
      {
        path: "/about-us",
        name: "About US",
        element: <AboutUs />,
      },
      {
        path: "/privacy-policy",
        name: "Privacy Policy",
        element: <LegalContentPage />,
      },
      {
        path: "/terms-and-conditions",
        name: "Terms & Conditions",
        element: <LegalContentPage />,
      },
      {
        path: "/returns-and-refunds",
        name: "Refunds",
        element: <LegalContentPage />,
      },
      {
        path: "/coming-soon",
        name: "Coming Soon",
        element: <ComingSoonPage />,
      },
      {
        path: "/coming-soon/:slug",
        name: "Coming Soon Feature",
        element: <ComingSoonPage />,
      },
      // {
      //   path: "/forgot-password",
      //   name: "Forgot Password",
      //   element: <ForgotPassword />,
      // },
    ],
  },

  // Authenticated Routes (Protected by PortalLayout)
  {
    path: "/user",
    element: <PortalLayout />,
    children: [
      // Dashboard
      {
        path: "dashboard",
        element: <Dashboard />,
      },

      {
        path: "renew-membership",
        element: <RenewMembership />,
      },

      // My Account Section
      {
        path: "my-account",
        element: <MyAccount />,
      },
      {
        path: "profile",
        element: <Navigate to="/user/my-account" replace />,
      },

      // Search Member Section
      {
        path: "search-member",
        element: <SearchMember />,
      },
      {
        path: "member-details/:user_id",
        element: <MemberDetails />,
      },

      // Password Management Section
      {
        path: "change-login-password",
        element: <Navigate to="/user/my-account?tab=password" replace />,
      },
      {
        path: "set-transaction-password",
        element: <SetTransactionPassword />,
      },
      {
        path: "change-transaction-password",
        element: <ChangeTransactionPassword />,
      },
      {
        path: "transaction-password",
        element: <TransactionPasswordIndex />,
      },
      {
        path: "family",
        element: <FamilyManage />,
      },
      {
        path: "family-tree",
        element: <FamilyTreePage />,
      },

      // Matrimonial
      {
        path: "matrimonial",
        element: <MatrimonialIndex />,
      },
      {
        path: "matrimonial/list",
        element: <MatrimonialList />,
      },
      {
        path: "matrimonial/matches",
        element: <MatrimonialMatches />,
      },
      {
        path: "matrimonial/profile/:id",
        element: <MatrimonialProfileView />,
      },

      // Coming Soon (admin-configured sidebar features)
      {
        path: "coming-soon",
        element: <ComingSoonPage />,
      },
      {
        path: "coming-soon/:slug",
        element: <ComingSoonPage />,
      },

      // 404 Page
      {
        path: "*",
        element: <NotFoundPage />,
      },
    ],
  },
  {
    path: "*",
    element: <NotFoundPage />,
  },
]);

export default PortalRoutes;
