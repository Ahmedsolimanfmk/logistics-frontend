import axios from "axios";

export const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL,
});

// 🔥 أهم جزء
api.interceptors.request.use((config) => {
  try {
    const token = localStorage.getItem("token");

    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }

    const companyId = localStorage.getItem("company_id");
    if (companyId) {
      config.headers["x-company-id"] = companyId;
    }
  } catch {}

  return config;
});