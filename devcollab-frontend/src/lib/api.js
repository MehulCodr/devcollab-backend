export const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL;

const ACCESS_TOKEN_KEY = "devcollab_access_token";
const REFRESH_TOKEN_KEY = "devcollab_refresh_token";

const authStorage = {
  get(key) {
    if (typeof window === "undefined") {
      return null;
    }

    return window.localStorage.getItem(key);
  },
  set(key, value) {
    if (typeof window === "undefined" || !value) {
      return;
    }

    window.localStorage.setItem(key, value);
  },
  remove(key) {
    if (typeof window === "undefined") {
      return;
    }

    window.localStorage.removeItem(key);
  }
};

export const setAuthTokens = ({ accessToken, refreshToken } = {}) => {
  authStorage.set(ACCESS_TOKEN_KEY, accessToken);
  authStorage.set(REFRESH_TOKEN_KEY, refreshToken);
};

export const clearAuthTokens = () => {
  authStorage.remove(ACCESS_TOKEN_KEY);
  authStorage.remove(REFRESH_TOKEN_KEY);
};

const getRefreshToken = () => authStorage.get(REFRESH_TOKEN_KEY);
const getAccessToken = () => authStorage.get(ACCESS_TOKEN_KEY);


const notifyAuthFailed = () => {
  if (typeof window === "undefined") {
    return;
  }

  window.dispatchEvent(new Event("devcollab:auth-failed"));
};

const shouldAttachAuth = (endpoint, auth) =>
  auth !== false &&
  !["/auth/login", "/auth/register", "/auth/refresh-token"].includes(endpoint);

const parseResponse = async (response) => {
  const text = await response.text();

  if (!text) {
    return {};
  }

  try {
    return JSON.parse(text);
  } catch (error) {
    return {
      message: text
    };
  }
};

const refreshAuthTokens = async () => {
  const refreshToken = getRefreshToken();

  if (!refreshToken) {
    return false;
  }

  const response = await fetch(`${API_BASE_URL}/auth/refresh-token`, {
    method: "POST",
    credentials: "include",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      refreshToken
    })
  });

  const data = await parseResponse(response);

  if (!response.ok) {
    clearAuthTokens();
    return false;
  }

  setAuthTokens(data.data);
  return true;
};

const createError = (data, response) => {
  const error = new Error(data.message || "Something went wrong");
  error.status = response.status;
  error.data = data;
  return error;
};

export const apiRequest = async (endpoint, options = {}) => {
  const {
    auth,
    skipAuthRefresh,
    headers: optionHeaders,
    ...fetchOptions
  } = options;

  const isFormData =
    typeof FormData !== "undefined" && fetchOptions.body instanceof FormData;

  const headers = isFormData
    ? {
        ...(optionHeaders || {})
      }
    : {
        "Content-Type": "application/json",
        ...(optionHeaders || {})
      };

  const accessToken = getAccessToken();

  if (accessToken && shouldAttachAuth(endpoint, auth) && !headers.Authorization) {
    headers.Authorization = `Bearer ${accessToken}`;
  }

  const response = await fetch(`${API_BASE_URL}${endpoint}`, {
    ...fetchOptions,
    credentials: "include",
    headers
  });

  let data = await parseResponse(response);

  if (response.status === 401 && !skipAuthRefresh && endpoint !== "/auth/refresh-token") {
    const refreshed = await refreshAuthTokens();

    if (refreshed) {
      return apiRequest(endpoint, {
        ...options,
        skipAuthRefresh: true
      });
    }
  }

  if (!response.ok) {
    if (response.status === 401 && shouldAttachAuth(endpoint, auth)) {
      clearAuthTokens();
      notifyAuthFailed();
    }

    throw createError(data, response);
  }

  return data;
};
