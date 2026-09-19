import AdminDashboard from "@src/view/admin/components/AdminDashboard";
import NoAccessPage from "@src/view/admin/components/NoAccessPage";

// Application Settings
import ApplicationSettings from "@src/view/admin/components/ApplicationSettings/ApplicationSettings";
import LegalPagesManagement from "@src/view/admin/components/LegalPages/LegalPagesManagement";
import ComingSoonSettings from "@src/view/admin/components/ComingSoon/ComingSoonSettings";

// Users Section
import UsersList from "@src/view/admin/components/users/UsersList";
import EditUser from "@src/view/admin/components/users/EditUser";
import AddUserLayout from "@src/view/admin/components/users/AddUserLayout";

// Media Management
import SliderList from "../admin/components/Slider/SliderList";
import GalleryList from "../admin/components/Gallery/GalleryList";
import VideoList from "../admin/components/Video/VideoList";
import AddVideoLayout from "../admin/components/Video/AddVideoLayout";
import EditVideoLayout from "../admin/components/Video/EditVideoLayout";
import NewsList from "../admin/components/News/NewsList";
import AddNewsLayout from "../admin/components/News/AddNewsLayout";
import EditNewsLayout from "../admin/components/News/EditNewsLayout";
import HowItWorksManagement from "../admin/components/HowItWorks/HowItWorksManagement";
// Donation Management
import DonationButtonsList from "../admin/components/Donation/DonationButtonsList";
import DonationRequestsList from "../admin/components/Donation/DonationRequestsList";
import DonationSettings from "../admin/components/Donation/DonationSettings";

// Membership Management
import MembershipPlansList from "../admin/components/Membership/MembershipPlansList";
import MembershipSettings from "../admin/components/Membership/MembershipSettings";
import PaymentsList from "../admin/components/Payments/PaymentsList";
import WalletsList from "../admin/components/Wallet/WalletsList";
import AdminAdjustmentsList from "../admin/components/Wallet/AdminAdjustmentsList";

// Sub-Admin Management
import SubAdminsList from "../admin/components/subAdmins/SubAdminsList";
import CreateSubAdmin from "../admin/components/subAdmins/CreateSubAdmin";
import EditSubAdmin from "../admin/components/subAdmins/EditSubAdmin";

// Community Management
import HierarchyEntityListRoute from "../admin/components/hierarchy/HierarchyEntityListRoute";
import HierarchyEntityFormRoute from "../admin/components/hierarchy/HierarchyEntityFormRoute";
import HierarchyLegacyRedirect from "../admin/components/hierarchy/HierarchyLegacyRedirect";
import PendingApprovalsList from "../admin/components/hierarchy/PendingApprovalsList";
import HierarchySettings from "../admin/components/HierarchySettings/HierarchySettings";
import ChangePassword from "../admin/components/ChangePassword/ChangePassword";
import MyAccount from "../admin/components/MyAccount/MyAccount";
import MatrimonialApplicationsList from "../admin/components/Matrimonial/MatrimonialApplicationsList";
import FamilyManager from "../admin/components/Family/FamilyManager";

// Location Management
import VillageList from "../admin/components/Village/VillageList";
import VillageForm from "../admin/components/Village/VillageForm";

const AdminRoutes = [
  {
    path: "dashboard",
    name: "Admin Dashboard",
    element: <AdminDashboard />,
  },

  // Application Settings
  {
    path: "application-settings",
    name: "Application Settings",
    element: <ApplicationSettings />,
  },
  {
    path: "legal-pages",
    name: "Legal & policy pages",
    element: <LegalPagesManagement />,
  },
  {
    path: "coming-soon",
    name: "Coming Soon",
    element: <ComingSoonSettings />,
  },

  // Users Section
  {
    path: "users-list",
    name: "Users List",
    element: <UsersList />,
  },
  {
    path: "users/add",
    name: "Add User",
    element: <AddUserLayout />,
  },
  {
    path: "users/edit/:user_id/*",
    name: "Users All Details",
    element: <EditUser />,
  },

  // Media Management
  {
    path: "slider",
    name: "Slider Banners",
    element: <SliderList />,
  },
  {
    path: "gallery",
    name: "Image Gallery",
    element: <GalleryList />,
  },
  {
    path: "video",
    name: "Videos",
    element: <VideoList />,
  },
  {
    path: "video/add",
    name: "Add Video",
    element: <AddVideoLayout />,
  },
  {
    path: "video/edit/:id",
    name: "Edit Video",
    element: <EditVideoLayout />,
  },
  {
    path: "news",
    name: "News",
    element: <NewsList />,
  },
  {
    path: "news/add",
    name: "Add News",
    element: <AddNewsLayout />,
  },
  {
    path: "news/edit/:id",
    name: "Edit News",
    element: <EditNewsLayout />,
  },
  {
    path: "how-it-works",
    name: "How Our Platform Works",
    element: <HowItWorksManagement />,
  },

  // Donation Management
  {
    path: "donation/settings",
    name: "Donation Settings",
    element: <DonationSettings />,
  },
  {
    path: "donation/buttons",
    name: "Donation Buttons",
    element: <DonationButtonsList />,
  },
  {
    path: "donation/requests",
    name: "Donation Requests",
    element: <DonationRequestsList />,
  },

  // Membership Management
  {
    path: "membership/settings",
    name: "Membership Settings",
    element: <MembershipSettings />,
  },
  {
    path: "membership-plans",
    name: "Membership Plans",
    element: <MembershipPlansList />,
  },
  {
    path: "payments",
    name: "Payment Transactions",
    element: <PaymentsList />,
  },
  {
    path: "wallets",
    name: "Wallets",
    element: <WalletsList />,
  },
  {
    path: "wallets/admin-adjustments",
    name: "Wallet Adjustment History",
    element: <AdminAdjustmentsList />,
  },

  // Matrimonial Management
  {
    path: "matrimonial/applications",
    name: "Matrimonial Applications",
    element: <MatrimonialApplicationsList />,
  },

  // Sub-Admin Management
  {
    path: "sub-admins",
    name: "Sub-Admins",
    element: <SubAdminsList />,
  },
  {
    path: "sub-admins/create",
    name: "Create Sub-Admin",
    element: <CreateSubAdmin />,
  },
  {
    path: "sub-admins/edit/:id",
    name: "Edit Sub-Admin",
    element: <EditSubAdmin />,
  },
  // Community Management
  {
    path: "community-management/pending",
    name: "Pending Approvals",
    element: <PendingApprovalsList />,
  },
  {
    path: "community-management/hierarchy-settings",
    name: "Hierarchy Settings",
    element: <HierarchySettings />,
  },
  {
    path: "community-management/:entityKey/add",
    name: "Add Hierarchy Entity",
    element: <HierarchyEntityFormRoute />,
  },
  {
    path: "community-management/:entityKey/edit/:id",
    name: "Edit Hierarchy Entity",
    element: <HierarchyEntityFormRoute />,
  },
  {
    path: "community-management/:entityKey",
    name: "Hierarchy Entity List",
    element: <HierarchyEntityListRoute />,
  },
  // Legacy hierarchy routes (bookmarks)
  {
    path: "communities",
    name: "Communities Legacy",
    element: <HierarchyLegacyRedirect />,
  },
  {
    path: "communities/*",
    name: "Communities Legacy Nested",
    element: <HierarchyLegacyRedirect />,
  },
  {
    path: "vansh",
    name: "Vansh Legacy",
    element: <HierarchyLegacyRedirect />,
  },
  {
    path: "vansh/*",
    name: "Vansh Legacy Nested",
    element: <HierarchyLegacyRedirect />,
  },
  {
    path: "kul",
    name: "Kul Legacy",
    element: <HierarchyLegacyRedirect />,
  },
  {
    path: "kul/*",
    name: "Kul Legacy Nested",
    element: <HierarchyLegacyRedirect />,
  },
  {
    path: "khamp",
    name: "Khamp Legacy",
    element: <HierarchyLegacyRedirect />,
  },
  {
    path: "khamp/*",
    name: "Khamp Legacy Nested",
    element: <HierarchyLegacyRedirect />,
  },
  {
    path: "sub-khamp",
    name: "Sub-Khamp Legacy",
    element: <HierarchyLegacyRedirect />,
  },
  {
    path: "sub-khamp/*",
    name: "Sub-Khamp Legacy Nested",
    element: <HierarchyLegacyRedirect />,
  },
  {
    path: "gotra",
    name: "Gotra Legacy",
    element: <HierarchyLegacyRedirect />,
  },
  {
    path: "gotra/*",
    name: "Gotra Legacy Nested",
    element: <HierarchyLegacyRedirect />,
  },

  // My Account (profile + passwords)
  {
    path: "my-account",
    name: "My Account",
    element: <MyAccount />,
  },

  // Legacy route — redirects handled in layout; kept for direct links
  {
    path: "change-password",
    name: "Change Password",
    element: <ChangePassword />,
  },

  // Family / Vanshavriksh
  {
    path: "family",
    name: "Family Management",
    element: <FamilyManager />,
  },

  // Location Management
  {
    path: "villages",
    name: "Villages",
    element: <VillageList />,
  },
  {
    path: "villages/add",
    name: "Add Village",
    element: <VillageForm />,
  },
  {
    path: "villages/edit/:id",
    name: "Edit Village",
    element: <VillageForm />,
  },

  // No Access Page
  {
    path: "no-access",
    name: "No Access",
    element: <NoAccessPage />,
  },
];

export default AdminRoutes;
