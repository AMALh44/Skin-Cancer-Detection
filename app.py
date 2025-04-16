import os
import numpy as np
from flask import Flask, request, jsonify, render_template, session, send_from_directory
from tensorflow.keras.models import load_model
from tensorflow.keras.preprocessing import image
from werkzeug.utils import secure_filename
import requests
import os


app = Flask(__name__)
# Hardcoded SECRET_KEY (replace with a secure random string)
app.config["SECRET_KEY"] = "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"  # Example secure key
app.config['UPLOAD_FOLDER'] = "uploads"
os.makedirs(app.config['UPLOAD_FOLDER'], exist_ok=True)

# Hardcoded CHATBOT_API_KEY (replace with your actual OpenRouter API key)
CHATBOT_API_KEY = "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"


# Load trained model with error handling
try:
    MODEL_PATH = "skin_disease_model.h5"
    #MODEL_PATH = "skin_disease_model_6_class.h5"
    model = load_model(MODEL_PATH)
except Exception as e:
    print(f"Error loading model: {e}")
    model = None

# Define class labels
label_map = {
    0: "Actinic Keratosis",
    1: "Basal Cell Carcinoma",
    2: "Dermatofibroma",
    3: "Melanoma",
    4: "Nevus",
    5: "Vascular Lesion"
}

def preprocess_image(image_path):
    """Resize & normalize image for model input"""
    try:
        img = image.load_img(image_path, target_size=(75, 100))
        img_array = image.img_to_array(img)
        img_array = np.expand_dims(img_array, axis=0)
        img_array = (img_array - np.mean(img_array)) / np.std(img_array)
        return img_array
    except Exception as e:
        print(f"Error preprocessing image: {e}")
        return None

# Flask Routes
@app.route("/")
def home():
    return render_template("index.html")

@app.route("/upload", methods=["GET", "POST"])
def upload():
    if request.method == "POST":
        if "file" not in request.files:
            return jsonify({"error": "No file uploaded"}), 400

        file = request.files["file"]
        if file.filename == "":
            return jsonify({"error": "No selected file"}), 400

        filename = secure_filename(file.filename)
        file_path = os.path.join(app.config["UPLOAD_FOLDER"], filename)
        file.save(file_path)
        session["uploaded_file"] = filename
        

        return jsonify({"message": "File uploaded successfully", "file": filename})

    return render_template("upload.html")

@app.route("/results")
def results():
    if not model:
        return "Model not loaded", 500

    filename = session.get("uploaded_file")
    if not filename:
        return "No image uploaded", 400

    file_path = os.path.join(app.config["UPLOAD_FOLDER"], filename)
    img_array = preprocess_image(file_path)
    if img_array is None:
        return "Error processing image", 500

    predictions = model.predict(img_array)
    predicted_class = np.argmax(predictions, axis=1)[0]
    predicted_label = label_map.get(predicted_class, "Unknown")
    confidence = float(np.max(predictions))

    # Fetch AI-generated explanation
    # explanation = get_ai_explanation(predicted_label)
    
    explanation = session.get("explanation")
    if not explanation:
        explanation = get_ai_explanation(predicted_label)
        session["explanation"] = explanation  # Store explanation in session

    return render_template(
        "results.html",
        filename=filename,
        prediction=predicted_label,
        confidence=confidence,
        explanation=explanation
    )
    


@app.route("/symptom_checker", methods=["POST"])
def symptom_checker():
    data = request.json
    user_symptoms = data.get("symptoms", "").strip()

    if not user_symptoms:
        return jsonify({"response": "Please enter symptoms for diagnosis."})

    prompt = f"I have the following symptoms: {user_symptoms}. What could be the possible skin conditions, and what should I do next?"
    headers = {"Authorization": f"Bearer {CHATBOT_API_KEY}", "Content-Type": "application/json"}
    json_data = {"model": "google/gemini-2.5-pro-exp-03-25:free", "messages": [{"role": "user", "content": prompt}]}

    try:
        response = requests.post("https://openrouter.ai/api/v1/chat/completions", headers=headers, json=json_data)
        response.raise_for_status()
        ai_response = response.json().get("choices", [{}])[0].get("message", {}).get("content", "No response.")

        # Structure the response
        return jsonify({"possible_conditions": ai_response})
    except requests.RequestException as e:
        return jsonify({"response": f"Error: {str(e)}"}), 500



@app.route("/uploads/<filename>")
def get_uploaded_file(filename):
    return send_from_directory(app.config["UPLOAD_FOLDER"], filename)

def get_ai_explanation(disease_name):
    """Fetch an AI-generated explanation for a given disease, including symptoms, causes, treatment, and prevention."""
    if not CHATBOT_API_KEY:
        return "API key not configured"

    headers = {
        "Authorization": f"Bearer {CHATBOT_API_KEY}",
        "Content-Type": "application/json"
    }
    json_data = {
        "model": "google/gemini-2.5-pro-exp-03-25:free",
        "messages": [{"role": "user", "content": f"Explain {disease_name}. Include symptoms, causes, treatments, and prevention."}]
    }

    try:
        response = requests.post("https://openrouter.ai/api/v1/chat/completions", headers=headers, json=json_data)
        response.raise_for_status()
        data = response.json()

        # Extract explanation from AI response
        return data.get("choices", [{}])[0].get("message", {}).get("content", "No explanation available.")

    except requests.RequestException as e:
        return f"Error fetching AI response: {e}"



@app.route("/chatbot", methods=["GET"])
def chatbot_page():
    return render_template("chatbot.html")

@app.route("/chat", methods=["POST"])
def chatbot():
    data = request.json
    user_query = data.get("message", "").strip()
    if not user_query:
        return jsonify({"response": "Please enter a valid question."})
    
    prompt = f"You are a medical assistant. Answer this medical question carefully: {user_query}"

    headers = {"Authorization": f"Bearer {CHATBOT_API_KEY}", "Content-Type": "application/json"}
    json_data = {"model": "google/gemini-2.5-pro-exp-03-25:free", 
                "messages": [{"role": "system", "content": "You are a medical AI assistant specialized in dermatology and general health."},
                             {"role": "user", "content": prompt}]}

    try:
        response = requests.post("https://openrouter.ai/api/v1/chat/completions", headers=headers, json=json_data)
        response.raise_for_status()
        ai_response = response.json().get("choices", [{}])[0].get("message", {}).get("content", "No response.")
        return jsonify({"response": ai_response})
    except requests.RequestException as e:
        return jsonify({"response": f"Error: {str(e)}"}), 500

@app.route("/about")
def about():
    return render_template("about.html")


if __name__ == "__main__":
    app.run(debug=True, host="0.0.0.0", port=5000)




