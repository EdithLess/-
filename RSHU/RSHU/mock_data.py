from __future__ import annotations

import json
from pathlib import Path
from typing import Any


BASE_DIR = Path(__file__).resolve().parent
MOCK_DATA_DIR = BASE_DIR / "mock_data"
STUDENTS_FILE = MOCK_DATA_DIR / "students.json"
CURRICULUM_FILE = MOCK_DATA_DIR / "curriculum.json"


def _load_json(path: Path) -> Any:
    with path.open("r", encoding="utf-8") as file:
        return json.load(file)


def _save_json(path: Path, payload: Any) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    with path.open("w", encoding="utf-8") as file:
        json.dump(payload, file, ensure_ascii=False, indent=2)


def load_students() -> list[dict[str, Any]]:
    return _load_json(STUDENTS_FILE)


def save_students(students: list[dict[str, Any]]) -> None:
    _save_json(STUDENTS_FILE, students)


def load_curriculum() -> dict[str, Any]:
    return _load_json(CURRICULUM_FILE)


def find_student(student_id: int) -> dict[str, Any] | None:
    for student in load_students():
        if student.get("id") == student_id:
            return student
    return None


def update_student(student_id: int, updater) -> dict[str, Any] | None:
    students = load_students()
    for index, student in enumerate(students):
        if student.get("id") == student_id:
            updated = updater(dict(student))
            students[index] = updated
            save_students(students)
            return updated
    return None


def get_speciality_data(speciality: str) -> dict[str, Any] | None:
    curriculum = load_curriculum()
    return curriculum.get("specialities", {}).get(speciality.upper())


def get_course_data(speciality: str, course: int | None = None) -> dict[str, Any] | None:
    speciality_data = get_speciality_data(speciality)
    if not speciality_data:
        return None

    courses = speciality_data.get("courses", {})
    if course is not None and str(course) in courses:
        return courses[str(course)]

    first_course_key = next(iter(courses), None)
    if first_course_key is None:
        return None
    return courses[first_course_key]


def find_curriculum_by_path(degree: str, code: str, number: int) -> list[dict[str, Any]] | None:
    curriculum = load_curriculum().get("specialities", {})
    for speciality_data in curriculum.values():
        if speciality_data.get("degree") == degree and speciality_data.get("code") == code:
            course_data = speciality_data.get("courses", {}).get(str(number))
            if course_data:
                return course_data.get("optionalGroups", [])
    return None
