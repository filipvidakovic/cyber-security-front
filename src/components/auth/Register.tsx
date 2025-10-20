import { useState, type ChangeEvent, type FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import AuthService, { type RegisterData } from "../../services/AuthService";
import zxcvbn from "zxcvbn";

interface RegisterProps {
  adminMode?: boolean;
}

export default function Register({ adminMode = false }: RegisterProps) {
  const [form, setForm] = useState<RegisterData>({
    email: "",
    password: "",
    confirmPassword: "",
    firstName: "",
    lastName: "",
    organization: "",
    userRole: adminMode ? "CA_USER" : "USER",
  });

  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [passwordScore, setPasswordScore] = useState<number>(0);
  const [passwordFeedback, setPasswordFeedback] = useState<string>("");

  const navigate = useNavigate();

  const handleChange = (e: ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setForm({ ...form, [name]: value });

    if (name === "password") {
      const strength = zxcvbn(value);
      setPasswordScore(strength.score);
      setPasswordFeedback(strength.feedback.suggestions.join(" "));
    }
  };

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    if (form.password !== form.confirmPassword) {
      setError("Passwords do not match!");
      return;
    }

    try {
      await AuthService.register(form);
      setSuccess(`User ${form.email} registered successfully.`);

      setForm({
        email: "",
        password: "",
        confirmPassword: "",
        firstName: "",
        lastName: "",
        organization: "",
        userRole: adminMode ? "CA_USER" : "USER",
      });

      setPasswordScore(0);
      setPasswordFeedback("");

      if (!adminMode) navigate("/login");
    } catch (err: any) {
      setError(err.message || "Registration failed.");
    }
  };

  // Password strength color bar
  const getStrengthColor = (score: number) => {
    switch (score) {
      case 0: return "bg-danger";
      case 1: return "bg-warning";
      case 2: return "bg-info";
      case 3: return "bg-primary";
      case 4: return "bg-success";
      default: return "bg-secondary";
    }
  };

  const strengthLabels = ["Very Weak", "Weak", "Fair", "Good", "Strong"];

  return (
    <div className="container mt-5">
      <div className="row justify-content-center">
        <div className="col-md-6">
          <div className="card shadow-lg p-4">
            <h2 className="text-center mb-4">
              {adminMode ? "Register CA User" : "Register"}
            </h2>

            {error && <div className="alert alert-danger">{error}</div>}
            {success && <div className="alert alert-success">{success}</div>}

            <form onSubmit={handleSubmit}>
              {/* Email */}
              <div className="mb-3">
                <label className="form-label">Email</label>
                <input
                  type="email"
                  name="email"
                  className="form-control"
                  value={form.email}
                  onChange={handleChange}
                  required
                />
              </div>

              {/* First/Last name */}
              <div className="row">
                <div className="col-md-6 mb-3">
                  <label className="form-label">First Name</label>
                  <input
                    type="text"
                    name="firstName"
                    className="form-control"
                    value={form.firstName}
                    onChange={handleChange}
                    required
                  />
                </div>
                <div className="col-md-6 mb-3">
                  <label className="form-label">Last Name</label>
                  <input
                    type="text"
                    name="lastName"
                    className="form-control"
                    value={form.lastName}
                    onChange={handleChange}
                    required
                  />
                </div>
              </div>

              {/* Organization */}
              <div className="mb-3">
                <label className="form-label">Organization</label>
                <input
                  type="text"
                  name="organization"
                  className="form-control"
                  value={form.organization}
                  onChange={handleChange}
                  required
                />
              </div>

              {/* Role */}
              <div className="mb-3">
                <label className="form-label">Role</label>
                <select
                  name="userRole"
                  className="form-select"
                  value={form.userRole}
                  onChange={handleChange}
                  required
                  disabled={adminMode}
                >
                  {adminMode ? (
                    <option value="CA_USER">CA User</option>
                  ) : (
                    <option value="USER">User</option>
                  )}
                </select>
              </div>

              {/* Password */}
              <div className="mb-3">
                <label className="form-label">Password</label>
                <input
                  type="password"
                  name="password"
                  className="form-control"
                  value={form.password}
                  onChange={handleChange}
                  required
                  minLength={8}
                  maxLength={64}
                />
                {form.password && (
                  <>
                    <div className="progress mt-2" style={{ height: "6px" }}>
                      <div
                        className={`progress-bar ${getStrengthColor(passwordScore)}`}
                        style={{ width: `${(passwordScore + 1) * 20}%` }}
                      ></div>
                    </div>
                    <small className="text-muted">
                      Strength: {strengthLabels[passwordScore]}{" "}
                      {passwordFeedback && `– ${passwordFeedback}`}
                    </small>
                  </>
                )}
              </div>

              {/* Confirm Password */}
              <div className="mb-3">
                <label className="form-label">Confirm Password</label>
                <input
                  type="password"
                  name="confirmPassword"
                  className="form-control"
                  value={form.confirmPassword}
                  onChange={handleChange}
                  required
                />
              </div>

              <button type="submit" className="btn btn-primary w-100">
                {adminMode ? "Register CA User" : "Register"}
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
