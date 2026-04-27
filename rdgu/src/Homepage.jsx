import { useState } from "react";
import { useEffect } from "react";
import api from "./api";
import './Css/App.css'


function Homepage() {
  const [students, setStudents] = useState([]);
  const [selectedStudentId, setSelectedStudentId] = useState("");
  const [student, setStudent] = useState(null);
  const [year, setYear] = useState(null);
  const [options, setOptions] = useState([]);
  const [selected, setSelected] = useState({});
  const [savedSelection, setSavedSelection] = useState(null);
  const [status, setStatus] = useState({ loading: true, error: "", success: "" });

  useEffect(() => {
    let ignore = false;

    async function loadData() {
      try {
        const studentsResp = await api.get("/api/electives/students");
        if (ignore) return;
        const rows = studentsResp.data.students || [];
        setStudents(rows);

        if (rows.length > 0) {
          setSelectedStudentId(String(rows[0].id));
        }

        setStatus((prev) => ({ ...prev, loading: false }));
      } catch (err) {
        const message = err?.response?.data?.message || "Не вдалося завантажити дані";
        setStatus({ loading: false, error: message, success: "" });
      }
    }

    loadData();
    return () => {
      ignore = true;
    };
  }, []);

  useEffect(() => {
    if (!selectedStudentId) return;

    let ignore = false;

    async function loadStudentData() {
      try {
        setStatus((prev) => ({ ...prev, error: "", success: "" }));

        const studentResp = await api.get(`/api/electives/student/${selectedStudentId}`);
        if (ignore) return;
        setStudent(studentResp.data.student || null);

        const optionsResp = await api.get("/api/electives/options", {
          params: { studentId: selectedStudentId },
        });
        if (ignore) return;
        setYear(optionsResp.data.year);
        setOptions(optionsResp.data.options || []);

        const existing = await api.get("/api/electives/my-selection", {
          params: {
            studentId: selectedStudentId,
            year: optionsResp.data.year,
          },
        });
        if (ignore) return;

        if (existing.data.selection) {
          setSavedSelection(existing.data.selection);
          const selectedFromDb = {};
          for (const item of existing.data.selection.selections || []) {
            selectedFromDb[item.column] = {
              id: item.id,
              name: item.name,
            };
          }
          setSelected(selectedFromDb);
        } else {
          setSavedSelection(null);
          setSelected({});
        }
      } catch (err) {
        const message = err?.response?.data?.message || "Не вдалося завантажити дані студента";
        setStatus((prev) => ({ ...prev, error: message }));
      }
    }

    loadStudentData();

    return () => {
      ignore = true;
    };
  }, [selectedStudentId]);

  const handleSelect = (pairId, subject) => {
    if (savedSelection) return;
    setSelected((prev) => ({
      ...prev,
      [pairId]: subject,
    }));
  };

  const handleConfirm = async () => {
    try {
      setStatus((prev) => ({ ...prev, error: "", success: "" }));

      const payload = Object.entries(selected).map(([column, subject]) => ({
        column,
        id: subject.id,
        name: subject.name,
      }));

      await api.post("/api/electives/confirm", {
        studentId: Number(selectedStudentId),
        year,
        selections: payload,
      });

      const existing = await api.get("/api/electives/my-selection", {
        params: {
          studentId: selectedStudentId,
          year,
        },
      });

      setSavedSelection(existing.data.selection || null);
      setStatus((prev) => ({ ...prev, success: "Вибір успішно підтверджено" }));
    } catch (err) {
      const message = err?.response?.data?.message || "Не вдалося підтвердити вибір";
      setStatus((prev) => ({ ...prev, error: message }));
    }
  };

  const allColumnsSelected = options.length > 0 && options.every((group) => selected[group.column]);

  if (status.loading) {
    return (
      <div className="app">
        <p>Завантаження...</p>
      </div>
    );
  }

  return (
    <div className="app">
      <header className="header">
        <div className="logo">РДГУ</div>
        <h1>Вибіркові дисципліни</h1>
        <div className="student-switcher">
          <label htmlFor="student-select">Студент:</label>
          <select
            id="student-select"
            value={selectedStudentId}
            onChange={(e) => setSelectedStudentId(e.target.value)}
          >
            {students.map((row) => (
              <option key={row.id} value={row.id}>
                {row.name} ({row.group})
              </option>
            ))}
          </select>
        </div>
        <p>
          {student?.name || "-"} | {student?.speciality || "Без спеціальності"} | курс {student?.course || "-"}
        </p>
        {year && <p>Вибір на навчальний рік: {year}</p>}
      </header>

      {status.error && <p className="error-banner">{status.error}</p>}
      {status.success && <p className="success-banner">{status.success}</p>}
      {savedSelection && (
        <p className="info-banner">Вибір уже підтверджено. Змінити його може тільки адміністратор.</p>
      )}

      <main className="content">
        {options.map((pair) => (
          <div className="pair-card" key={pair.column}>
            <h3>Група {pair.column}</h3>
            <div className="subjects">
              {pair.subjects.map((subj) => (
                <label key={subj.id} className="subject-option">
                  <input
                    type="radio"
                    name={pair.column}
                    value={subj.id}
                    disabled={Boolean(savedSelection)}
                    checked={selected[pair.column]?.id === subj.id}
                    onChange={() => handleSelect(pair.column, subj)}
                  />
                  {subj.id}: {subj.name}
                </label>
              ))}
            </div>
          </div>
        ))}
      </main>

      {!savedSelection && (
        <div className="actions">
          <button type="button" onClick={handleConfirm} disabled={!allColumnsSelected}>
            Підтвердити вибір
          </button>
        </div>
      )}

      <footer className="footer">
        <h2>Обрані дисципліни:</h2>
        <ul>
          {Object.entries(selected).map(([pairId, subj]) => (
            <li key={pairId}>
              <strong>{pairId}:</strong> {subj.id} - {subj.name}
            </li>
          ))}
        </ul>
      </footer>
    </div>
  );
} 

export default Homepage;
