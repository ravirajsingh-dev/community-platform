import React from "react";
import { Navigate, useParams } from "react-router-dom";
import { getHierarchyFormPage } from "./hierarchyEntityPages";

const HierarchyEntityFormRoute = () => {
  const { entityKey } = useParams();
  const FormPage = getHierarchyFormPage(entityKey);

  if (!FormPage) {
    return <Navigate to="/admin/dashboard" replace />;
  }

  return <FormPage />;
};

export default HierarchyEntityFormRoute;
