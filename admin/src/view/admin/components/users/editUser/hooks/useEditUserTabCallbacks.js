import { useMemo } from "react";
import { TAB_KEYS } from "../editUserConstants";

const TAB_KEY_LIST = Object.values(TAB_KEYS);

export function useEditUserTabCallbacks({ onEdit, onCancel, onSave }) {
  return useMemo(
    () =>
      TAB_KEY_LIST.reduce((acc, tabKey) => {
        acc[tabKey] = {
          onEdit: () => onEdit(tabKey),
          onCancel: () => onCancel(tabKey),
          onSave: () => onSave(tabKey),
        };
        return acc;
      }, {}),
    [onEdit, onCancel, onSave],
  );
}
