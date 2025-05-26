import { QueryClient, QueryFunction } from "@tanstack/react-query";
import { getAuthToken } from "./supabaseClient";

async function throwIfResNotOk(res: Response) {
  if (!res.ok) {
    // Clone the response to avoid "body stream already read" error
    const clonedRes = res.clone();
    
    try {
      // Try to parse as JSON first
      const errorData = await clonedRes.json();
      const error: any = new Error(errorData.message || errorData.error || `${res.status}: ${res.statusText}`);
      error.status = res.status;
      error.data = errorData;
      throw error;
    } catch (parseError) {
      // If JSON parsing fails, create a simple error
      const error: any = new Error(`${res.status}: ${res.statusText}`);
      error.status = res.status;
      throw error;
    }
  }
}

// Helper function to build URL with query parameters
function buildUrl(baseUrl: string, params?: Record<string, any>): string {
  if (!params) return baseUrl;
  
  const url = new URL(baseUrl, window.location.origin);
  
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null) {
      url.searchParams.append(key, String(value));
    }
  });
  
  return url.pathname + url.search;
}

export async function apiRequest<T = any>(
  method: string,
  url: string,
  data?: unknown | undefined,
  queryParams?: Record<string, any>,
): Promise<T> {
  // Build URL with query parameters if provided
  const fullUrl = queryParams ? buildUrl(url, queryParams) : url;
  
  // Get auth token if available
  let headers: Record<string, string> = data ? { "Content-Type": "application/json" } : {};
  
  try {
    const token = await getAuthToken();
    if (token) {
      headers = {
        ...headers,
        Authorization: `Bearer ${token}`
      };
    }
  } catch (error) {
    console.error("Error getting auth token:", error);
  }

  const res = await fetch(fullUrl, {
    method,
    headers,
    body: data ? JSON.stringify(data) : undefined,
    credentials: "include",
  });

  await throwIfResNotOk(res);
  
  // Return empty object for no content responses
  if (res.status === 204) {
    return {} as T;
  }
  
  // Check if content type is JSON
  const contentType = res.headers.get('content-type');
  
  // Try to parse the response as JSON
  if (contentType && contentType.includes('application/json')) {
    try {
      return await res.json() as T;
    } catch (jsonError) {
      console.error("Error parsing JSON response:", jsonError);
      return { message: "Failed to parse server response" } as T;
    }
  } else {
    // If not JSON, return the text as a message
    try {
      const text = await res.text();
      return { message: text } as T;
    } catch (textError) {
      console.error("Error reading response text:", textError);
      return { message: "Failed to read server response" } as T;
    }
  }
}

type UnauthorizedBehavior = "returnNull" | "throw";
export const getQueryFn: <T>(options: {
  on401: UnauthorizedBehavior;
}) => QueryFunction<T> =
  ({ on401: unauthorizedBehavior }) =>
  async ({ queryKey }) => {
    // Get auth token if available
    let headers: Record<string, string> = {};
    
    try {
      const token = await getAuthToken();
      if (token) {
        headers = {
          Authorization: `Bearer ${token}`
        };
      }
    } catch (error) {
      console.error("Error getting auth token:", error);
    }
    
    // Determine if queryKey is an array and extract params
    let url: string;
    let queryParams: Record<string, any> | undefined;
    
    if (Array.isArray(queryKey) && queryKey.length > 1 && typeof queryKey[0] === 'string') {
      url = queryKey[0];
      // If the second item is an object, treat it as query params
      if (queryKey.length > 1 && typeof queryKey[1] === 'object' && queryKey[1] !== null) {
        queryParams = queryKey[1] as Record<string, any>;
      }
    } else {
      url = queryKey[0] as string;
    }
    
    // Build full URL with query parameters if provided
    const fullUrl = queryParams ? buildUrl(url, queryParams) : url;
    
    const res = await fetch(fullUrl, {
      credentials: "include",
      headers
    });

    if (unauthorizedBehavior === "returnNull" && res.status === 401) {
      return null;
    }

    await throwIfResNotOk(res);
    
    // Return empty object for no content responses
    if (res.status === 204) {
      return {} as any;
    }
    
    // Check if content type is JSON
    const contentType = res.headers.get('content-type');
    
    // Try to parse the response as JSON
    if (contentType && contentType.includes('application/json')) {
      try {
        return await res.json();
      } catch (jsonError) {
        console.error("Error parsing JSON response:", jsonError);
        return { message: "Failed to parse server response" };
      }
    } else {
      // If not JSON, return the text as a message
      try {
        const text = await res.text();
        return { message: text };
      } catch (textError) {
        console.error("Error reading response text:", textError);
        return { message: "Failed to read server response" };
      }
    }
  };

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      queryFn: getQueryFn({ on401: "throw" }),
      refetchInterval: false,
      refetchOnWindowFocus: false,
      staleTime: Infinity,
      retry: false,
    },
    mutations: {
      retry: false,
    },
  },
});
