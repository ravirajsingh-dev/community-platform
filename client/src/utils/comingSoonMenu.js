/**
 * Merge static portal menu items with admin-configured Coming Soon entries.
 * Guests → public `/coming-soon/:slug`
 * Logged-in → protected `/user/coming-soon/:slug`
 *
 * Coming Soon items are grouped under a single "Coming Soon" dropdown.
 */
export const getComingSoonPath = (slug, { isAuthenticated = false } = {}) => {
  if (!slug) return isAuthenticated ? "/user/coming-soon" : "/coming-soon";
  return isAuthenticated
    ? `/user/coming-soon/${slug}`
    : `/coming-soon/${slug}`;
};

export const getComingSoonMenuItems = (
  commonSettings,
  { isAuthenticated = false } = {},
) => {
  const comingSoon = commonSettings?.comingSoon;
  if (!comingSoon || comingSoon.enabled === false) return [];

  const items = Array.isArray(comingSoon.menuItems)
    ? comingSoon.menuItems
    : [];

  const children = items
    .filter((item) => item && item.label && item.slug)
    .slice()
    .sort((a, b) => (a.order ?? 0) - (b.order ?? 0))
    .map((item) => ({
      label: item.label,
      path: getComingSoonPath(item.slug, { isAuthenticated }),
      slug: item.slug,
      isComingSoon: true,
    }));

  if (children.length === 0) return [];

  return [
    {
      label: "Coming Soon",
      isAuth: false,
      isComingSoon: true,
      children,
    },
  ];
};

export const buildClientMenuItems = ({
  isAuthenticated,
  user,
  commonSettings,
  portalItems,
  requiresMembershipAction,
}) => {
  const loggedIn = Boolean(isAuthenticated);
  const membershipRestricted =
    loggedIn && requiresMembershipAction?.(user);

  // Guest → public only; logged-in → protected only
  const staticItems = portalItems
    .filter((item) => (loggedIn ? item.isAuth : !item.isAuth))
    .filter((item) => {
      if (!membershipRestricted) return true;
      if (item.path === "/user/dashboard") return true;
      // Hide dropdown parents (and other leaves) while membership is restricted
      return false;
    });

  const comingSoonGroup = getComingSoonMenuItems(commonSettings, {
    isAuthenticated: loggedIn,
  });

  return [...staticItems, ...comingSoonGroup];
};
