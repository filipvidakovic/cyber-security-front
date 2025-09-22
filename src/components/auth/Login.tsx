import { useState, type ChangeEvent, type FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import AuthService, { type LoginData } from "../../services/AuthService";

interface LoginProps {
  onLogin?: (role: "USER" | "ADMIN" | "CA_USER") => void;
}

export default function Login({ onLogin }: LoginProps) {
  const [form, setForm] = useState<LoginData>({ email: "", password: "" });
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();

  const handleChange = (e: ChangeEvent<HTMLInputElement>) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);
    try {
      const data = await AuthService.login(form);
      if (onLogin && data.role) onLogin(data.role);
      navigate("/"); // Redirect to home after login
    } catch (err: any) {
      setError(err.message);
    }
  };

 return (
    <div className="container mt-5">
      <div className="row justify-content-center">
        <div className="col-md-6">
          <div className="card shadow-lg p-4">
            <h2 className="text-center mb-4">Login</h2>
            {error && <div className="alert alert-danger">{error}</div>}
            <form onSubmit={handleSubmit}>
              <div className="mb-3">
                <label className="form-label">Email</label>
                <input
                  type="text"
                  name="email"
                  className="form-control"
                  value={form.email}
                  onChange={handleChange}
                  required
                />
              </div>

              <div className="mb-3">
                <label className="form-label">Password</label>
                <input
                  type="password"
                  name="password"
                  className="form-control"
                  value={form.password}
                  onChange={handleChange}
                  required
                />
              </div>

              <button type="submit" className="btn btn-primary w-100">
                Login
              </button>
            </form>

            <p className="text-center mt-3">
              Don’t have an account?{" "}
              <a href="/register" className="text-decoration-none">
                Register here
              </a>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
