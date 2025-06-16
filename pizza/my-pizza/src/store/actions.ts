export const loginUser = (login: string, is_staff: boolean, is_superuser: boolean, is_cook: boolean, draftOrderId: number) => ({
  type: 'LOGIN_USER',
  payload: { login, is_staff, is_superuser, is_cook, draftOrderId },
});

export const logoutUser = () => ({
  type: 'LOGOUT_USER',
});

export const updateDraftOrderId = (id: number) => ({
  type: 'UPDATE_DRAFT_ORDER_ID',
  payload: id,
});