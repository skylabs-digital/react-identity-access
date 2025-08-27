export type ErrorType = 'AUTH' | 'VALIDATION' | 'TRANSACTION' | 'NAVIGATION' | 'BUSINESS';

export interface ErrorResponse {
  success: false;
  error?: {
    code: string;
  };
  message?: string;
  type?: ErrorType;
  validation?: Record<string, string>;
}

export interface ResponseMeta {
  total: number;
  page: number;
  limit: number;
  totalPages: number;
  hasNext: boolean;
  hasPrev: boolean;
}

export interface ResponseEnvelope<T = undefined> {
  success: true;
  message?: string;
  data: T;
  meta?: ResponseMeta;
}

export type ApiResponse<T = undefined> = ResponseEnvelope<T> | ErrorResponse;

// Helper functions
export const createSuccessResponse = <T>(
  data: T,
  message?: string,
  meta?: ResponseMeta
): ResponseEnvelope<T> => ({
  success: true,
  message,
  data,
  meta,
});

export const createErrorResponse = (
  message: string,
  code?: string,
  type?: ErrorType,
  validation?: Record<string, string>
): ErrorResponse => ({
  success: false,
  message,
  error: code ? { code } : undefined,
  type,
  validation,
});

export const isSuccessResponse = <T>(response: ApiResponse<T>): response is ResponseEnvelope<T> => {
  return response.success === true;
};

export const isErrorResponse = (response: ApiResponse<any>): response is ErrorResponse => {
  return response.success === false;
};
