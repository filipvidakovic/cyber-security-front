import axios from "axios";
import type { CertificateTemplate } from "../model/CertificateTemplate";

const BASE_URL = import.meta.env.VITE_API_URL + "templates";

const getAuthHeader = () => {
  const token = localStorage.getItem("accessToken");
  return token ? { Authorization: `Bearer ${token}` } : {};
};

export const createTemplate = async (template: CertificateTemplate) => {
  const response = await axios.post(BASE_URL, template, {
    headers: getAuthHeader(),
  });
  return response.data;
};

export const getTemplates = async (): Promise<CertificateTemplate[]> => {
  const response = await axios.get(BASE_URL, {
    headers: getAuthHeader(),
  });
  return response.data;
};
