from flask import Flask, jsonify, request
from flask_cors import CORS
from flask_restx import Api, Resource

from mock_data import (
    find_curriculum_by_path,
    find_student,
    get_course_data,
    get_speciality_data,
    load_students,
    update_student,
)


app = Flask(__name__)
CORS(app)

api = Api(
    app,
    version="1.0",
    title="RSHU Mock API",
    description="Mock API для студентів і навчальних планів",
    doc="/docs",
)


@api.route("/students")
class Students(Resource):
    def get(self):
        group = request.args.get("group")
        speciality = request.args.get("speciality")

        students = load_students()
        if group:
            students = [item for item in students if item.get("group") == group]
        if speciality:
            students = [item for item in students if item.get("speciality") == speciality.upper()]

        return jsonify(students)


@api.route("/students/<int:student_id>")
class StudentById(Resource):
    def get(self, student_id):
        student = find_student(student_id)
        if not student:
            return {"error": "Студента не знайдено"}, 404
        return jsonify(student)


@api.route("/groups/<string:group>/students")
class StudentsByGroup(Resource):
    def get(self, group):
        students = [item for item in load_students() if item.get("group") == group]
        return jsonify(students)


@api.route("/curriculum/<string:speciality>/<int:course>")
class Curriculum(Resource):
    def get(self, speciality, course):
        course_data = get_course_data(speciality, course)
        speciality_data = get_speciality_data(speciality)
        if not speciality_data or not course_data:
            return {"error": "Навчальний план не знайдено"}, 404

        return jsonify(
            {
                "speciality": speciality.upper(),
                "degree": speciality_data.get("degree"),
                "code": speciality_data.get("code"),
                "admissionYear": speciality_data.get("admissionYear"),
                "course": course,
                "mandatorySubjects": course_data.get("mandatorySubjects", []),
                "optionalGroups": course_data.get("optionalGroups", []),
            }
        )


@api.route("/curriculum/<string:speciality>/<int:course>/optional")
class OptionalCurriculum(Resource):
    def get(self, speciality, course):
        course_data = get_course_data(speciality, course)
        if not course_data:
            return {"error": "Вибіркові дисципліни не знайдено"}, 404
        return jsonify(course_data.get("optionalGroups", []))


@api.route("/<string:degree>/<string:code>/<int:number>")
class LegacyCurriculum(Resource):
    def get(self, degree, code, number):
        payload = find_curriculum_by_path(degree, code, number)
        if payload is None:
            return {"error": "Навчальний план не знайдено"}, 404
        return jsonify(payload)


@api.route("/subjects/<int:student_id>")
class StudentSubjects(Resource):
    def get(self, student_id):
        student = find_student(student_id)
        if not student:
            return {"error": "Студента не знайдено"}, 404
        return jsonify(
            {
                "id": student.get("id"),
                "subjects": student.get("subjects", []),
                "optionalSubjects": student.get("optionalSubjects", []),
                "lastUpdated": student.get("lastUpdated"),
            }
        )

    def put(self, student_id):
        payload = request.get_json() or {}

        def updater(student):
            if "subjects" in payload:
                student["subjects"] = payload["subjects"]
            if "optionalSubjects" in payload:
                student["optionalSubjects"] = payload["optionalSubjects"]
            if "lastUpdated" in payload:
                student["lastUpdated"] = payload["lastUpdated"]
            return student

        updated = update_student(student_id, updater)
        if not updated:
            return {"error": "Студента не знайдено"}, 404
        return jsonify({"message": "Дані студента оновлено", "student": updated})


if __name__ == "__main__":
    app.run(debug=True, port=3001)
