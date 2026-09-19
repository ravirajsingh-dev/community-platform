const PortalItems = [
  // Public
  {
    label: "Home",
    path: "/",
    isAuth: false,
  },
  {
    label: "About Us",
    path: "/about-us",
    isAuth: false,
  },
  {
    label: "Contact Us",
    path: "/contact-us",
    isAuth: false,
  },

  // Protected (logged-in)
  {
    label: "Dashboard",
    path: "/user/dashboard",
    isAuth: true,
  },
  {
    label: "Family",
    isAuth: true,
    children: [
      {
        label: "Search Member",
        path: "/user/search-member",
      },
      {
        label: "Add Family",
        path: "/user/family",
      },
      {
        label: "Family Tree",
        path: "/user/family-tree",
      },
    ],
  },
  {
    label: "Matrimonial",
    path: "/user/matrimonial",
    isAuth: true,
  },
  {
    label: "My Account",
    path: "/user/my-account",
    isAuth: true,
  },
];

/** Flatten menu leaves (for dashboard quick actions, etc.) */
export const flattenPortalItems = (items = PortalItems) =>
  items.flatMap((item) => {
    if (item.children?.length) {
      return item.children.map((child) => ({
        ...child,
        isAuth: child.isAuth ?? item.isAuth,
      }));
    }
    return [item];
  });

export default PortalItems;
