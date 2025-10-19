import axios from "axios";

const API_URL = import.meta.env.VITE_API_URL + "cert";

const getAuthHeader = () => {
  const token = localStorage.getItem("accessToken"); // adjust key if needed
  return token ? { Authorization: `Bearer ${token}` } : {};
};

export const createRoot = async (
  cn: string,
  ttlDays: number
): Promise<number> => {
  const reqBody = { cn, ttlDays };
  console.log(API_URL);
  try {
    const res = await axios.post(`${API_URL}/root`, reqBody, {
      headers: getAuthHeader(), // includes JWT
    });

    return res.data; // ID of the new Root certificate
  } catch (err: any) {
    console.error(
      "Error creating root certificate:",
      err.response?.data || err.message
    );
    throw err;
  }
};

export const createIntermediate = async (
  issuerId: number,
  cn: string,
  ttlDays: number
) => {
  const res = await axios.post(
    `${API_URL}/intermediate`,
    { issuerId, cn, ttlDays },
    {
      headers: getAuthHeader(),
    }
  );
  return res.data;
};

export const issueEeAutogen = async (
  issuerId: number,
  cn: string,
  ttlDays: number,
  storePrivateKey: boolean
) => {
  const res = await axios.post(
    `${API_URL}/ee/autogen`,
    { issuerId, cn, ttlDays, storePrivateKey },
    {
      headers: getAuthHeader(),
    }
  );
  return res.data;
};

export const issueEeFromCsr = async (
  issuerId: number,
  ttlDays: number,
  csrFile: File
) => {
  const formData = new FormData();
  formData.append("csr", csrFile);
  formData.append("issuerId", String(issuerId));
  formData.append("ttlDays", String(ttlDays));

  const res = await axios.post(`${API_URL}/ee/from-csr`, formData, {
    headers: { "Content-Type": "multipart/form-data", ...getAuthHeader() },
  });
  return res.data;
};

export const downloadP12 = async (id: number, password: string) => {
  const res = await axios.get(`${API_URL}/${id}/download.p12`, {
    responseType: "blob",
    headers: {
      "X-P12-Password": password,
      ...getAuthHeader(),
    },
  });

  // Trigger download
  const url = window.URL.createObjectURL(new Blob([res.data]));
  const link = document.createElement("a");
  link.href = url;
  link.setAttribute("download", `cert-${id}.p12`);
  document.body.appendChild(link);
  link.click();
  link.remove();
};

export const getAllCertificates = async () => {
  try {
    const headers = getAuthHeader();
    const res = await axios.get(`${API_URL}/admin`, { headers });

    return res.data;
  } catch (err: any) {
    throw err;
  }
};

export const getUserCertificates = async () => {
  const res = await axios.get(`${API_URL}/user`, {
    headers: getAuthHeader(),
  });
  return res.data;
};

export const getIssuers = async () => {
  try {
    const res = await axios.get(`${API_URL}/issuers`, {
      headers: getAuthHeader(),
    });
    console.log(res.data);
    return res.data;
  } catch (err: any) {
    console.error("Error fetching issuers:", err.response?.data || err.message);
    throw err;
  }
};
