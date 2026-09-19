import React from "react";
import { Navigate, useParams } from "react-router-dom";
import { getHierarchyListPage } from "./hierarchyEntityPages";

const HierarchyEntityListRoute = () => {
  const { entityKey } = useParams();
  const ListPage = getHierarchyListPage(entityKey);

  if (!ListPage) {
    return <Navigate to="/admin/dashboard" replace />;
  }

  return <ListPage />;
};

export default HierarchyEntityListRoute;
