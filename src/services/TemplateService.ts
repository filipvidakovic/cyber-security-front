import axios from "axios";
import type { CertificateTemplate } from "../model/CertificateTemplate";

const BASE_URL = import.meta.env.VITE_API_URL + "templates";

export const createTemplate = async (template: CertificateTemplate) => {
  const response = await axios.post(BASE_URL, template);
  return response.data;
};

export const getTemplates = async (): Promise<CertificateTemplate[]> => {
  const response = await axios.get(BASE_URL);
  return response.data;
};
