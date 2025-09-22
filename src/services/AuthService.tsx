import axios from "axios";
import { jwtDecode } from "jwt-decode";

export interface LoginData {
  username: string;
  password: string;
}

export interface RegisterData {
  email: string;
  password: string;
  confirmPassword: string;
  firstName: string;
  lastName: string;
  organization: string;
  userRole: "USER";
}

const API_URL = import.meta.env.VITE_API_URL;

class AuthService {
  async login(data: LoginData) {
    try {
      const response = await axios.post(`${API_URL}/login`, data);
      localStorage.setItem("token", response.data.IdToken);
      const claims: any = jwtDecode(response.data.IdToken);
      localStorage.setItem("username", claims.username!);
      localStorage.setItem("userId", claims.sub!);
      return response.data;
    } catch (error: any) {
      throw new Error(error.response?.data?.message || "Login failed");
    }
  }

  async register(data: RegisterData) {
    try {
      const response = await axios.post(`${API_URL}/register`, data);
      return response.data;
    } catch (error: any) {
      throw new Error(error.response?.data?.message || "Registration failed");
    }
  }

  logout() {
    localStorage.removeItem("token");
  }

  getToken() {
    return localStorage.getItem("token");
  }

  isAuthenticated() {
    return !!this.getToken();
  }

  async getUserInfo() {
    const username = localStorage.getItem("username");
    const token = localStorage.getItem("token");

    try {
      const response = await axios.get(`${API_URL}/users/${username}`, {
        headers: {
          "Content-Type": "application/json",
          ...(token && { Authorization: `Bearer ${token}` }),
        },
      });
      console.log(response.data)
      return response.data;
    } catch (error: any) {
      throw new Error(error.response?.data?.message || "Failed to fetch user info");
    }
  }
}

export default new AuthService();
