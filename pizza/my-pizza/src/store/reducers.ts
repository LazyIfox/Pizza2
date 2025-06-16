import { UserState } from './types';

const initialState: UserState = {
  userLogin: null,
  is_staff: false,
  is_superuser: false,
  is_cook: false,
  draftOrderId: 0,
};

interface Action {
  type: string;
  payload?: any; 
}

const userReducer = (state = initialState, action: Action): UserState => {
  switch (action.type) {
    case 'LOGIN_USER':
      if (action.payload) {
        return {
          ...state,
          userLogin: action.payload.login,
          is_staff: action.payload.is_staff,
          is_superuser: action.payload.is_superuser,
          is_cook: action.payload.is_cook,
          draftOrderId: action.payload.draftOrderId,
        };
      }
      return state;
    case 'LOGOUT_USER':
      return {
        ...state,
        userLogin: null,
        is_staff: false,
        is_superuser: false,
        is_cook: false,
        draftOrderId: 0,
      };
      case 'CLEAR_DRAFT_ORDER_ID':
      return {
        ...state,
        draftOrderId: 0,
      };
      case 'UPDATE_DRAFT_ORDER_ID':
      return {
        ...state,
        draftOrderId: action.payload,
      };
    default:
      return state;
  }
};

export default userReducer;