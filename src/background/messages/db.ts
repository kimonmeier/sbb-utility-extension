type QueryRequest = {
  GET_EPMLOYEES: {
    payload: undefined;
    response: { success: boolean; employees?: { id: string; name: string; employeeIdentification: string }[]; error?: string };
  },
  GET_TOUREN: {
    payload: undefined;
    response: { success: boolean; touren?: { id: string; name: string; }[]; error?: string };
  },
}

type QueryRequestType = keyof QueryRequest

export type QueryMessage = {
  [T in QueryRequestType]: {
    dbType: T;
    payload: QueryRequest[T]["payload"];
    response: QueryRequest[T]["response"];
  }
}[QueryRequestType]

type PostCommandRequest = {
  INSERT_EMPLOYEE: {
    payload: { name: string; employeeIdentification: string };
    response: { success: boolean; error?: string };
  };
}

type PostCommandRequestType = keyof PostCommandRequest

export type PostCommandMessage = {
  [T in PostCommandRequestType]: {
    dbType: T;
    payload: PostCommandRequest[T]["payload"];
    response: PostCommandRequest[T]["response"];
  }
}[PostCommandRequestType]

type DeleteCommandRequest = {
  DELETE_EMPLOYEE: {
    payload: { employeeId: string };
    response: { success: boolean; error?: string };
  };
}

type DeleteCommandRequestType = keyof DeleteCommandRequest

export type DeleteCommandMessage = {
  [T in DeleteCommandRequestType]: {
    dbType: T;
    payload: DeleteCommandRequest[T]["payload"];
    response: DeleteCommandRequest[T]["response"];
  }
}[DeleteCommandRequestType]
