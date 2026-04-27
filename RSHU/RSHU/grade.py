from datetime import date

from flask import Flask, jsonify, request
from flask_cors import CORS

from mock_data import (
    find_student,
    get_course_data,
    load_curriculum,
    load_students,
    update_student,
)


app = Flask(__name__)
CORS(app)


def get_student_or_404(student_id):
    student = find_student(student_id)
    if not student:
        return None, ({"error": "Студента не знайдено"}, 404)
    return student, None


@app.route("/students", methods=["GET"])
def get_students():
    group = request.args.get("group")
    speciality = request.args.get("speciality")

    students = load_students()
    if group:
        students = [item for item in students if item.get("group") == group]
    if speciality:
        students = [item for item in students if item.get("speciality") == speciality.upper()]

    return jsonify(students)


@app.route("/students/<int:student_id>", methods=["GET"])
def get_student(student_id):
    student, error = get_student_or_404(student_id)
    if error:
        return error
    return jsonify(student)


@app.route("/groups/<string:group>/students", methods=["GET"])
def get_students_by_group(group):
    students = [item for item in load_students() if item.get("group") == group]
    return jsonify(students)


@app.route("/subjects/<speciality>", methods=["GET"])
def optional_specialities(speciality):
    course = request.args.get("course", type=int)
    course_data = get_course_data(speciality, course)

    if not course_data:
        return jsonify({"error": "Навчальний план не знайдено"}), 404

    result = []
    for index, group in enumerate(course_data.get("optionalGroups", []), start=1):
        col = group.get("column", str(index))
        for subject in group.get("subjects", []):
            result.append(
                {
                    "colom": col,
                    "code": subject.get("id"),
                    "name": subject.get("name"),
                }
            )

    return jsonify(result)


@app.route("/subjects/optional/<speciality>", methods=["GET"])
def optional_specialities_subject(speciality):
    course = request.args.get("course", type=int)
    course_data = get_course_data(speciality, course)

    if not course_data:
        return jsonify({"error": "Навчальний план не знайдено"}), 404

    optional_speciality = []
    for index, group in enumerate(course_data.get("optionalGroups", []), start=1):
        col = group.get("column", str(index))
        column_group = []
        for subject in group.get("subjects", []):
            column_group.append(
                {
                    "id": subject.get("id"),
                    "column": col,
                    "name": subject.get("name"),
                }
            )
        optional_speciality.append(column_group)

    optional_rshu = load_curriculum().get("optionalCatalog", [])

    return jsonify(
        {
            "optional_rshu": optional_rshu,
            "optional_speciality": optional_speciality,
        }
    )


@app.route("/subjects/<int:id_student>", methods=["GET", "PUT"])
def handle_subjects(id_student):
    student, error = get_student_or_404(id_student)
    if error:
        return error

    if request.method == "GET":
        return jsonify(
            {
                "subjects": student.get("subjects", []) + student.get("optionalSubjects", []),
                "lastUpdated": student.get("lastUpdated"),
            }
        )

    data = request.get_json() or {}
    subjects = data.get("subjects", [])

    def updater(current_student):
        current_student["subjects"] = subjects
        current_student["lastUpdated"] = data.get("lastUpdated") or date.today().isoformat()
        return current_student

    updated = update_student(id_student, updater)
    return jsonify(
        {
            "status": "success",
            "student": updated,
        }
    )


@app.route("/optional_subjects", methods=["GET"])
def get_optional_subjects():
    subjects = load_curriculum().get("optionalCatalog", [])
    return jsonify(subjects)


@app.route("/optional_subjects/<int:id_student>", methods=["PUT"])
def put_optional_subjects(id_student):
    student, error = get_student_or_404(id_student)
    if error:
        return error

    data = request.get_json() or {}
    optional_subjects = data.get("optional_subjects", [])

    existing_by_id = {item.get("id"): item for item in student.get("optionalSubjects", [])}
    normalized_subjects = []
    for index, item in enumerate(optional_subjects, start=1):
        previous = existing_by_id.get(item.get("id"), {})
        normalized_subjects.append(
            {
                "id": item.get("id"),
                "name": item.get("name"),
                "cathedra": item.get("cathedra") or previous.get("cathedra"),
                "column": item.get("column") or previous.get("column") or str(index),
            }
        )

    def updater(current_student):
        current_student["optionalSubjects"] = normalized_subjects
        current_student["lastUpdated"] = date.today().isoformat()
        return current_student

    updated = update_student(id_student, updater)

    return jsonify(
        {
            "status": "success",
            "student": updated,
        }
    )


if __name__ == "__main__":
    app.run(debug=True, port=3000)
