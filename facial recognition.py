# install dependencies first:
# pip install flask face_recognition werkzeug

from flask import Flask, request, jsonify
import face_recognition
import os
from werkzeug.utils import secure_filename

app = Flask(_name_)

# folder to store uploaded images
UPLOAD_FOLDER = "uploads"
os.makedirs(UPLOAD_FOLDER, exist_ok=True)
app.config["UPLOAD_FOLDER"] = UPLOAD_FOLDER

# store nominee face encoding (in real system -> database / IPFS)
nominee_face_encoding = None

# -------------------------------
# 1. Register nominee face
# -------------------------------
@app.route("/register-face", methods=["POST"])
def register_face():
    global nominee_face_encoding

    if "image" not in request.files:
        return jsonify({"error": "No image uploaded"}), 400

    file = request.files["image"]
    filename = secure_filename(file.filename)
    filepath = os.path.join(app.config["UPLOAD_FOLDER"], filename)
    file.save(filepath)

    # encode the nominee face
    image = face_recognition.load_image_file(filepath)
    encodings = face_recognition.face_encodings(image)

    if len(encodings) == 0:
        return jsonify({"error": "No face detected"}), 400

    nominee_face_encoding = encodings[0]

    return jsonify({"message": "Nominee face registered successfully!"})


# -------------------------------
# 2. Verify nominee face
# -------------------------------
@app.route("/verify-face", methods=["POST"])
def verify_face():
    global nominee_face_encoding

    if nominee_face_encoding is None:
        return jsonify({"error": "No nominee registered yet"}), 400

    if "image" not in request.files:
        return jsonify({"error": "No image uploaded"}), 400

    file = request.files["image"]
    filename = secure_filename(file.filename)
    filepath = os.path.join(app.config["UPLOAD_FOLDER"], filename)
    file.save(filepath)

    # encode test face
    test_image = face_recognition.load_image_file(filepath)
    test_encodings = face_recognition.face_encodings(test_image)

    if len(test_encodings) == 0:
        return jsonify({"error": "No face detected"}), 400

    test_encoding = test_encodings[0]

    # compare with nominee face
    results = face_recognition.compare_faces([nominee_face_encoding], test_encoding)

    if results[0]:
        return jsonify({"success": True, "message": "Face verified ✅"})
    else:
        return jsonify({"success": False, "message": "Face does not match ❌"})


# -------------------------------
# Run server
# -------------------------------
if _name_ == "_main_":
    app.run(debug=True)