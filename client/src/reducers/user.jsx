import { createSlice } from "@reduxjs/toolkit";

const initialState = {
  currentUser: [],
  loadingUser: false,
  error: {},
};

const userSlice = createSlice({
  name: "users",
  initialState: initialState,
  reducers: {
    userUpdated(state, action) {
      return {
        ...state,
        currentUser: action.payload,
        loadingUser: false,
      };
    },
    userError(state, action) {
      return {
        ...state,
        error: action.payload,
        loadingUser: false,
      };
    },
    loadingOnUserSubmit(state) {
      return {
        ...state,
        loadingUser: true,
      };
    },
  },
});

export const { userUpdated, userError, loadingOnUserSubmit } =
  userSlice.actions;
export default userSlice.reducer;
