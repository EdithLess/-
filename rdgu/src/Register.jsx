import { useState } from "react";
import api from "./api";
import { useNavigate } from "react-router-dom";
import "./Css/Register.css";

function Register() {
  const navigate = useNavigate?.() || (() => {});
  const [mode, setMode] = useState("register");
  const [form, setForm] = useState({
    name: "",
    email: "",
    password: "",
    studentId: "",
    course: "",
    speciality: "",
    group: "",
  });
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    try {
      if (mode === "login") {
        if (!form.email || !form.password) {
          setError("Будь ласка, введіть усі дані");
          return;
        }
        setError("");
        const { data } = await api.post("/auth/login", {
          email: form.email,
          password: form.password,
        });
        setSuccess(true);
        // Navigate to home
        navigate("/home");
        console.log("✅ Вхід успішний:", data);
      } else {
        if (!form.name || !form.email || !form.password) {
          setError("Будь ласка, введіть усі дані");
          return;
        }
        setError("");
        const { data } = await api.post("/auth/register", {
          name: form.name,
          email: form.email,
          password: form.password,
          studentId: form.studentId,
          course: form.course,
          speciality: form.speciality,
          group: form.group,
        });
        setSuccess(true);
        navigate("/home");
        console.log("✅ Реєстрація успішна:", data);
      }
    } catch (err) {
      const msg = err?.response?.data?.message || "Помилка сервера";
      setError(msg);
      setSuccess(false);
    }
  };

  return (
    <div className="register-page">
      <div className="register-card">
        <h1>{mode === "register" ? "Реєстрація" : "Вхід"}</h1>
        <h2>Рівненський державний гуманітарний університет</h2>

        <div className="toggle-buttons">
          <button
            className={mode === "register" ? "active" : ""}
            onClick={() => {
              setMode("register");
              setError("");
              setSuccess(false);
            }}
          >
            Реєстрація
          </button>
          <button
            className={mode === "login" ? "active" : ""}
            onClick={() => {
              setMode("login");
              setError("");
              setSuccess(false);
            }}
          >
            Вхід
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          {mode === "register" && (
            <>
              <label>
                Ім’я:
                <input
                  type="text"
                  name="name"
                  value={form.name}
                  onChange={handleChange}
                  required
                />
              </label>

              <label>
                ID студента (для API РШУ):
                <input
                  type="number"
                  name="studentId"
                  value={form.studentId}
                  onChange={handleChange}
                />
              </label>

              <label>
                Курс:
                <input
                  type="number"
                  min="1"
                  max="6"
                  name="course"
                  value={form.course}
                  onChange={handleChange}
                  required
                />
              </label>

              <label>
                Спеціальність (наприклад, SPZ):
                <input
                  type="text"
                  name="speciality"
                  value={form.speciality}
                  onChange={handleChange}
                  required
                />
              </label>

              <label>
                Група:
                <input
                  type="text"
                  name="group"
                  value={form.group}
                  onChange={handleChange}
                  required
                />
              </label>
            </>
          )}

          <label>
            Університетська пошта:
            <input
              type="email"
              name="email"
              value={form.email}
              onChange={handleChange}
              required
            />
          </label>

          <label>
            Пароль:
            <input
              type="password"
              name="password"
              value={form.password}
              onChange={handleChange}
              required
            />
          </label>

          {error && <p className="error">{error}</p>}
          {success && (
            <p className="success">
              ✅ {mode === "register" ? "Реєстрація" : "Вхід"} успішний!
            </p>
          )}

          <button type="submit">
            {mode === "register" ? "Зареєструватися" : "Увійти"}
          </button>
        </form>

        <p className="test-mode-note">
          Тестовий режим: використовується базова локальна реєстрація та вхід.
        </p>
      </div>
    </div>
  );
}

export default Register;
