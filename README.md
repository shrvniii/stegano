# stegano
# 🔐 3D Steganography & Encryption Vault

A web application that hides secret messages inside **3D model files (.OBJ)** using **LSB steganography** and optional **AES encryption**.

This project combines **Computer Graphics (Three.js)** with a **Python Flask backend** to demonstrate secure data hiding inside 3D objects.

---

## 📌 Project Overview

The **3D Steganography & Encryption Vault** allows a user to:

1. Enter a secret message
2. Choose or upload a 3D `.OBJ` model
3. Encode the message invisibly inside the model's vertex color data
4. Share the encoded model
5. Decode the message using the correct password

The encoded model looks **visually identical** to the original.

---

## 🧠 Key Concepts Used

### Computer Graphics

* 3D Model Rendering using **Three.js**
* Vertex geometry and color channels
* OBJ file structure
* WebGL rendering pipeline

### Steganography

* **Least Significant Bit (LSB)** encoding inside vertex color values

### Cryptography

* AES-256 encryption
* PBKDF2 key stretching
* SHA-256 integrity verification

---

## 🛠 Technology Stack

### Frontend

* HTML5
* CSS3
* JavaScript
* Three.js
* OBJLoader
* OrbitControls

### Backend

* Python 3
* Flask

### Libraries

* cryptography
* qrcode
* Pillow

---

## 📁 Project Structure

```
stegano/
│
├── models/
│   └── teapot.obj
│
├── templates/
│   ├── index.html
│   └── encode.html
│
├── static/
│   ├── css/
│   │   └── style.css
│   └── js/
│       └── viewer.js
│
├── app.py
└── README.md
```

---

## 🚀 Running the Project

1. Navigate to the project folder

```
cd stegano
```

2. Start a local server

```
python -m http.server
```

3. Open the project in a browser

```
http://localhost:8000/templates/encode.html
```

You should see a **3D viewer displaying a teapot model**.

---

## 🎮 Current Features

✔ 3D model rendering using Three.js
✔ OBJ model loading
✔ OrbitControls (rotate / zoom / pan)
✔ Basic encode UI layout

---

## 🔜 Upcoming Features

* Secret message encoding using LSB steganography
* AES encryption support
* Smart model capacity detection
* QR code generation for file sharing
* Decoder page for extracting messages
* Before / after model comparison
* Vertex color visualizer

---

## 👥 Team

* **Samarth** – Backend & Cryptography
* **Shravani** – Frontend & 3D Viewer
* **Pari** – QR System & Decoder

---

## 🎯 Goal of the Project

To demonstrate how **hidden data can be stored inside 3D models without visible changes**, combining concepts from:

* Computer Graphics
* Cybersecurity
* Cryptography
* Web Development

---

## 📚 Educational Purpose

This project was developed as a **Computer Graphics + Python semester project** to explore real-world applications of steganography in digital media.

---
