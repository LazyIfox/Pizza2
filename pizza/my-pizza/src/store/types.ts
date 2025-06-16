export interface UserState {
  userLogin: string | null;
  is_staff: boolean;
  is_superuser: boolean;
  is_cook: boolean;
  draftOrderId: number;
}

export interface RootState {
  user: UserState;
}