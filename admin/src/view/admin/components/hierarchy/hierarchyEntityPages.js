import { HIERARCHY_ADMIN_ENTITIES } from "@src/config/hierarchyAdminConfig";
import { createAdminEntityActions } from "@src/utils/createAdminEntityActions";
import { createConnectedHierarchyList } from "./HierarchyEntityList";
import { createConnectedHierarchyForm } from "./HierarchyEntityForm";

const pages = Object.fromEntries(
  Object.entries(HIERARCHY_ADMIN_ENTITIES).map(([key, config]) => {
    const actions = createAdminEntityActions(config);
    return [
      key,
      {
        List: createConnectedHierarchyList(config, actions),
        Form: createConnectedHierarchyForm(config, actions),
      },
    ];
  }),
);

export function getHierarchyListPage(entityKey) {
  return pages[entityKey]?.List ?? null;
}

export function getHierarchyFormPage(entityKey) {
  return pages[entityKey]?.Form ?? null;
}
