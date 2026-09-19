import React from "react";
import { Navigate, useLocation } from "react-router-dom";

const LEGACY_PATH_MAP = {
  communities: "community",
  vansh: "vansh",
  kul: "kul",
  khamp: "khamp",
  "sub-khamp": "subKhamp",
  subKhamp: "subKhamp",
  gotra: "gotra",
};

/**
 * Redirects legacy `/admin/communities`, `/admin/vansh`, etc. to
 * `/admin/community-management/:entityKey`.
 */
const HierarchyLegacyRedirect = () => {
  const location = useLocation();
  const segments = location.pathname.replace(/^\/admin\/?/, "").split("/");
  const legacySegment = segments[0];
  const entityKey = LEGACY_PATH_MAP[legacySegment];

  if (!entityKey) {
    return <Navigate to="/admin/dashboard" replace />;
  }

  const rest = segments.slice(1).join("/");
  const target = rest
    ? `/admin/community-management/${entityKey}/${rest}`
    : `/admin/community-management/${entityKey}`;

  return <Navigate to={`${target}${location.search}${location.hash}`} replace />;
};

export default HierarchyLegacyRedirect;
