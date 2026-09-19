import {
  FaTachometerAlt,
  FaSlidersH,
  FaCog,
  FaFileContract,
  FaUserCog,
  FaImages,
  FaPhotoVideo,
  FaPlay,
  FaNewspaper,
  FaUsers,
  FaSitemap,
  FaUsersCog,
  FaHandHoldingHeart,
  FaHeart,
  FaCogs,
  FaLayerGroup,
  FaMapMarkerAlt,
  FaClock,
  FaTasks,
  FaCreditCard,
  FaRocket,
} from "react-icons/fa";
import { MdFamilyRestroom } from "react-icons/md";
import { BiUser, BiNetworkChart } from "react-icons/bi";
import { filterMenuByPermissions } from "@src/utils/permissions";

const PORTAL_MENU = [
  {
    key: "dashboard",
    label: "Dashboard",
    path: "/admin/dashboard",
    Icon: FaTachometerAlt,
  },
  {
    key: "settings",
    label: "Settings",
    Icon: FaSlidersH,
    children: [
      {
        key: "application-settings",
        label: "Application Settings",
        path: "/admin/application-settings",
        Icon: FaCog,
      },
      {
        key: "legal-pages",
        label: "Legal & policy pages",
        path: "/admin/legal-pages",
        Icon: FaFileContract,
      },
      {
        key: "coming-soon",
        label: "Coming Soon",
        path: "/admin/coming-soon",
        Icon: FaRocket,
      },
      {
        key: "my-account",
        label: "My Account",
        path: "/admin/my-account",
        Icon: FaUserCog,
      },
      {
        key: "media-management",
        label: "Media Management",
        Icon: FaImages,
        children: [
          {
            key: "slider-banners",
            label: "Slider Banners",
            path: "/admin/slider",
            Icon: FaPhotoVideo,
          },
          {
            key: "image-gallery",
            label: "Our Gallery",
            path: "/admin/gallery",
            Icon: FaImages,
          },
          {
            key: "videos",
            label: "Videos",
            path: "/admin/video",
            Icon: FaPlay,
          },
          {
            key: "news",
            label: "News",
            path: "/admin/news",
            Icon: FaNewspaper,
          },
          {
            key: "how-it-works",
            label: "How Our Platform Works",
            path: "/admin/how-it-works",
            Icon: FaTasks,
          },
        ],
      },
    ],
  },
  {
    key: "users-list",
    label: "Users List",
    path: "/admin/users-list",
    Icon: FaUsers,
  },
  {
    key: "family",
    label: "Family",
    path: "/admin/family",
    Icon: FaSitemap,
  },
  {
    key: "sub-admins",
    label: "Sub-Admins",
    path: "/admin/sub-admins",
    Icon: FaUsersCog,
  },
  {
    key: "donations",
    label: "Donations",
    Icon: FaHandHoldingHeart,
    children: [
      {
        key: "donation-settings",
        label: "Donation Settings",
        path: "/admin/donation/settings",
        Icon: FaCogs,
      },
      {
        key: "donation-buttons",
        label: "Donation Buttons",
        path: "/admin/donation/buttons",
        Icon: FaHandHoldingHeart,
      },
      {
        key: "donation-requests",
        label: "Donation Requests",
        path: "/admin/donation/requests",
        Icon: FaHandHoldingHeart,
      },
    ],
  },
  {
    key: "membership",
    label: "Membership Management",
    Icon: FaCreditCard,
    children: [
      {
        key: "membership-settings",
        label: "Membership Settings",
        path: "/admin/membership/settings",
        Icon: FaCogs,
      },
      {
        key: "membership-plans",
        label: "Membership Plans",
        path: "/admin/membership-plans",
        Icon: FaCreditCard,
      },
      {
        key: "payments",
        label: "Payment Transactions",
        path: "/admin/payments",
        Icon: FaCreditCard,
      },
      {
        key: "wallets",
        label: "Wallets",
        path: "/admin/wallets",
        Icon: FaCreditCard,
      },
      {
        key: "wallet-admin-adjustments",
        label: "Wallet Adjustment History",
        path: "/admin/wallets/admin-adjustments",
        Icon: FaCreditCard,
      },
    ],
  },
  {
    key: "matrimonial",
    label: "Matrimonial",
    path: "/admin/matrimonial/applications",
    Icon: FaHeart,
  },
  {
    key: "community-management",
    label: "Community Management",
    Icon: FaLayerGroup,
    children: [
      {
        key: "hierarchy-settings",
        label: "Hierarchy Settings",
        path: "/admin/community-management/hierarchy-settings",
        Icon: FaCogs,
      },
      {
        key: "pending-approvals",
        label: "Pending Approvals",
        path: "/admin/community-management/pending",
        Icon: FaClock,
      },

      {
        key: "communities",
        label: "Communities",
        path: "/admin/community-management/community",
        Icon: FaUsers,
      },
      {
        key: "vansh",
        label: "Vansh",
        path: "/admin/community-management/vansh",
        Icon: MdFamilyRestroom,
      },
      {
        key: "kul",
        label: "Kul",
        path: "/admin/community-management/kul",
        Icon: BiUser,
      },
      {
        key: "khamp",
        label: "Khamp",
        path: "/admin/community-management/khamp",
        Icon: FaSitemap,
      },
      {
        key: "subKhamp",
        label: "Sub-Khamp",
        path: "/admin/community-management/subKhamp",
        Icon: FaSitemap,
      },
      {
        key: "gotra",
        label: "Gotra",
        path: "/admin/community-management/gotra",
        Icon: BiNetworkChart,
      },
    ],
  },
  {
    key: "location-management",
    label: "Location Management",
    Icon: FaMapMarkerAlt,
    children: [
      {
        key: "villages",
        label: "Villages",
        path: "/admin/villages",
        Icon: FaMapMarkerAlt,
      },
    ],
  },
];

const cloneMenu = (items) =>
  items.map((item) => ({
    ...item,
    children: item.children ? cloneMenu(item.children) : undefined,
  }));

/** Menu for sidebar — filtered by RSF admin permissions */
export const getSidebarMenu = (isAuthenticated, admin) => {
  if (!isAuthenticated || !admin) return [];
  return filterMenuByPermissions(cloneMenu(PORTAL_MENU), admin);
};

const flattenMenuLeaves = (items) =>
  items.flatMap((item) => {
    if (item.children?.length) {
      return flattenMenuLeaves(item.children);
    }
    if (item.path) {
      return [
        {
          label: item.label,
          path: item.path,
          Icon: item.Icon,
        },
      ];
    }
    return [];
  });

/** Leaf items for collapsed icon-only list */
export const flattenMenuForCollapsed = (menu) => flattenMenuLeaves(menu);

export default PORTAL_MENU;
