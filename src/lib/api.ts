import axios, {
  type AxiosHeaders,
  type Method,
  type RawAxiosRequestHeaders,
} from 'axios';
import {
  useMutation,
  useQuery,
  useQueryClient,
  type QueryKey,
} from '@tanstack/react-query';
import { API_URL } from '../env';
import { clearToken, getToken } from './auth';

/**
 * The ONLY file in this repo that imports axios — ESLint enforces it. All HTTP
 * goes through apiGet / apiPost / useGet / useMutate so there is exactly one
 * place that knows about the base URL, auth header, and 401 handling.
 */
const instance = axios.create({
  baseURL: API_URL,
  // Long, but not infinite: axios defaults to no timeout, so a dead API would
  // hang a spinner forever.
  timeout: 60_000,
  headers: {
    Accept: 'application/json',
    'Content-Type': 'application/json',
  },
});

instance.interceptors.response.use(
  (res) => res,
  (error: unknown) => {
    if (axios.isAxiosError(error) && error.response?.status === 401) {
      clearToken();
      // A hard navigation, deliberately: it also wipes in-memory React Query
      // state, which is what you want when auth is gone. Skip when already on
      // /login, or a bad password causes a reload loop.
      if (
        typeof window !== 'undefined' &&
        window.location.pathname !== '/login'
      ) {
        window.location.href = '/login';
      }
    }
    return Promise.reject(
      error instanceof Error ? error : new Error(String(error)),
    );
  },
);

export type TBackendError = {
  error?: { code: string; message: string; details?: unknown[] };
  message?: string | string[];
};

type TParams = Record<string, string | number | boolean | undefined>;

function authHeaders(): Record<string, string> {
  const token = getToken();
  return token ? { Authorization: `Bearer ${token}` } : {};
}

export async function apiGet<T>(url: string, params?: TParams): Promise<T> {
  const response = await instance.get<T>(url, {
    headers: authHeaders(),
    params,
  });
  return response.data;
}

export async function apiPost<T>(url: string, body?: unknown): Promise<T> {
  const response = await instance.post<T>(url, body, {
    headers: authHeaders(),
  });
  return response.data;
}

/** Raw blob fetch, for the CSV export download. */
export async function apiGetBlob(url: string, params?: TParams): Promise<Blob> {
  const response = await instance.get<Blob>(url, {
    headers: authHeaders(),
    params,
    responseType: 'blob',
  });
  return response.data;
}

export function extractErrorMessages(error: unknown): string[] {
  if (axios.isAxiosError(error)) {
    const data = error.response?.data as TBackendError | undefined;
    if (data?.error?.message) {
      const details = data.error.details;
      if (Array.isArray(details) && details.length > 0) {
        const issues = details
          .map((d) =>
            typeof d === 'object' && d !== null && 'message' in d
              ? String(d.message)
              : null,
          )
          .filter((m): m is string => m !== null);
        if (issues.length > 0) return issues;
      }
      return [data.error.message];
    }
    if (data?.message) {
      return Array.isArray(data.message) ? data.message : [data.message];
    }
    if (error.code === 'ECONNABORTED') {
      return ['The request timed out. Is the API running?'];
    }
    if (error.message) return [error.message];
  }
  if (error instanceof Error) return [error.message];
  return ['An unexpected error occurred'];
}

type MethodsHeaders = Partial<
  {
    [Key in Method as Lowercase<Key>]: AxiosHeaders;
  } & { common: AxiosHeaders }
>;

type THeaders = (RawAxiosRequestHeaders & MethodsHeaders) | AxiosHeaders;

export type TListMeta = {
  total: number;
  page: number;
  pageSize: number;
  hasNext: boolean;
  hasPrevious: boolean;
};

const DEFAULT_META: TListMeta = {
  total: 0,
  page: 1,
  pageSize: 20,
  hasNext: false,
  hasPrevious: false,
};

type TUseGet<T> = {
  /** Reads `{ data, meta }` and returns `{ result, meta }`. */
  isList?: boolean;
  url: string;
  key: QueryKey;
  params?: TParams;
  transform?: (data: unknown) => T;
  headers?: THeaders;
  enabled?: boolean;
  /** Per-query override of the 30s global default. */
  staleTime?: number;
  gcTime?: number;
  /** Pass `keepPreviousData` so month/page navigation doesn't blank the view. */
  placeholderData?: <U>(previous: U | undefined) => U | undefined;
  refetchInterval?: number | false;
};

export function useGet<T>({
  isList = false,
  key,
  params,
  transform,
  url,
  enabled,
  headers,
  staleTime,
  gcTime,
  placeholderData,
  refetchInterval,
}: TUseGet<T>) {
  return useQuery({
    queryKey: key,
    queryFn: async () => {
      const response = await instance.get(url, {
        headers: { ...authHeaders(), ...headers },
        params,
      });

      const payload: unknown = response.data;
      const meta =
        isList &&
        typeof payload === 'object' &&
        payload !== null &&
        'meta' in payload
          ? { ...DEFAULT_META, ...(payload as { meta: TListMeta }).meta }
          : DEFAULT_META;

      const raw =
        isList &&
        typeof payload === 'object' &&
        payload !== null &&
        'data' in payload
          ? payload.data
          : payload;

      const result =
        typeof transform === 'function' ? transform(raw) : (raw as T);

      return { result, meta, payload };
    },
    enabled,
    staleTime,
    gcTime,
    placeholderData,
    refetchInterval,
  });
}

type TMutationMethod = Exclude<Lowercase<Method>, 'get' | 'head' | 'options'>;

type TUseMutate<TVariables, TResponse> = {
  url: string | ((variables: TVariables) => string);
  method?: TMutationMethod;
  transform?: (data: unknown) => TResponse;
  headers?: THeaders;
  /** MANDATORY in practice — every mutation must declare what it invalidates. */
  invalidateKeys?: QueryKey[];
  onSuccess?: (data: TResponse, variables: TVariables) => void;
  onError?: (error: unknown, variables: TVariables) => void;
  onMutate?: (variables: TVariables) => unknown;
  onSettled?: () => void;
};

export function useMutate<TVariables, TResponse = unknown>({
  url,
  method = 'post',
  transform,
  headers,
  invalidateKeys,
  onSuccess,
  onError,
  onMutate,
  onSettled,
}: TUseMutate<TVariables, TResponse>) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (variables: TVariables) => {
      const resolvedUrl = typeof url === 'function' ? url(variables) : url;
      const response = await instance.request({
        url: resolvedUrl,
        method,
        data: variables,
        headers: { ...authHeaders(), ...headers },
      });
      return typeof transform === 'function'
        ? transform(response.data)
        : (response.data as TResponse);
    },
    onMutate,
    onSuccess: (data, variables) => {
      // Root-prefix keys match every variant (all months, all filter combos).
      // invalidateQueries only REFETCHES mounted queries, so a wide list is
      // correct by construction and cheap in practice.
      invalidateKeys?.forEach((key) => {
        void queryClient.invalidateQueries({ queryKey: key });
      });
      onSuccess?.(data, variables);
    },
    onError,
    onSettled,
  });
}
