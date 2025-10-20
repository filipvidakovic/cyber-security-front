import axios from "axios";

export interface LoginData {
  email: string;
  password: string;
}

export interface RegisterData {
  email: string;
  password: string;
  confirmPassword: string;
  firstName: string;
  lastName: string;
  organization: string;
  userRole: "ADMIN";
}

const API_URL = import.meta.env.VITE_API_URL + "auth";

class AuthService {
  async login(data: LoginData) {
    try {
      const response = await axios.post(`${API_URL}/login`, data);
      localStorage.setItem("email", response.data.email);
      localStorage.setItem("accessToken", response.data.accessToken);
      localStorage.setItem("refreshToken", response.data.refreshToken);
      localStorage.setItem("userRole", response.data.role);
      return response.data;
    } catch (error: any) {
      throw new Error(error.response?.data?.message || "Login failed");
    }
  }

  async register(data: RegisterData) {
    try {
      const response = await axios.post(`${API_URL}/signup`, data);
      console.log(`${API_URL}/signup`);
      return response.data;
    } catch (error: any) {
      throw new Error(error.response?.data?.message || "Registration failed");
    }
  }

  getUserRole(): "USER" | "ADMIN" | "CA_USER" | null {
    const role = localStorage.getItem("userRole");
    if (role === "USER" || role === "ADMIN" || role === "CA_USER") return role;
    return null;
  }

  logout() {
    localStorage.removeItem("email");
    localStorage.removeItem("accessToken");
    localStorage.removeItem("refreshToken");
    localStorage.removeItem("userRole");
  }

  getToken() {
    return localStorage.getItem("accessToken");
  }

  isAuthenticated() {
    return !!this.getToken();
  }

  async getUserInfo() {
    const email = localStorage.getItem("email");
    const token = localStorage.getItem("accessToken");

    try {
      const response = await axios.get(`${API_URL}/users/${email}`, {
        headers: {
          "Content-Type": "application/json",
          ...(token && { Authorization: `Bearer ${token}` }),
        },
      });
      console.log(response.data);
      return response.data;
    } catch (error: any) {
      throw new Error(
        error.response?.data?.message || "Failed to fetch user info"
      );
    }
  }
}

export default new AuthService();
