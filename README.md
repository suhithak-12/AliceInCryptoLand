# 🔐 Alice in CryptoLand — Attribute-Based Encrypted Messenger

Alice in CryptoLand is a prototype secure messaging application that demonstrates **attribute-based access control for encrypted messages**.

Instead of giving every member of a chat access to every encrypted message, a sender can specify required attributes such as `Admin`, `Manager`, or `Developer`. Only users whose assigned attributes satisfy the message requirements are allowed to decrypt it.

The project combines a **Flask REST API**, a browser-based JavaScript frontend, and **AES-GCM encryption using the Web Crypto API**.

> **Note:** This project is an educational prototype. Its attribute-based encryption model demonstrates the concept of Attribute-Based Encryption (ABE), but it is **not a production cryptographic ABE implementation**.

---

## ✨ Features

* Create and join chat rooms
* Request approval before entering a chat
* Chat creators act as a **Trusted Authority**
* Assign attributes to individual users
* Update user attributes at any time
* Send normal plaintext messages
* Send encrypted messages protected by required attributes
* AES-GCM encryption performed in the browser
* SHA-256-based key derivation from selected attributes
* Users without the required attributes see a locked-message indicator
* Automatic message refreshing
* Simple REST API built with Flask
* Multi-user testing through separate browser sessions

---

## 🔑 How Attribute-Based Access Works

Each user in a chat can be assigned attributes.

For example:

```text
Alice
├── Admin
└── Developer

Bob
├── Manager
└── Developer

Charlie
└── Member
```

A sender can then protect a message using one or more required attributes.

For example:

```text
Required attributes:
Manager + Developer
```

Bob satisfies both requirements and can decrypt the message.

Alice has `Developer` but not `Manager`, so she cannot access it.

Charlie has neither required attribute and cannot access it.

The application therefore follows an **ALL-required-attributes policy**.

---

## 🔐 Encryption

Encrypted messages are handled client-side in `app.js`.

The application:

1. Takes the selected required attributes.
2. Sorts and combines the attributes.
3. Hashes them using **SHA-256**.
4. Imports the resulting value as an **AES-GCM key**.
5. Generates a random 12-byte initialization vector.
6. Encrypts the message using the browser's Web Crypto API.
7. Stores the ciphertext, IV, and required attributes.

Before attempting decryption, the client checks whether the current user possesses every required attribute.

### Important Security Notice

This is a demonstration of attribute-based **access control**, not a cryptographically complete CP-ABE or KP-ABE system.

Because encryption keys are deterministically derived from attribute names, this implementation should **not be used to protect real sensitive information**.

A production implementation would require proper cryptographic key generation, authentication, secure key distribution, persistent storage, and a real ABE construction.

---

## 🛠 Tech Stack

**Backend**

* Python
* Flask
* Flask-CORS

**Frontend**

* HTML
* CSS
* Vanilla JavaScript
* Fetch API

**Cryptography**

* Web Crypto API
* AES-GCM
* SHA-256

**Storage**

* Python in-memory dictionaries

No database is currently required.

---

## 📁 Project Structure

```text
AliceInCryptoLand/
│
├── app.py
│   └── Flask backend and REST API
│
├── index.html
│   └── Application interface and styling
│
├── app.js
│   └── Frontend logic, API communication,
│       attribute checks, and encryption
│
├── image.png
│
├── DemoPictures/
│   └── Application screenshots
│
└── README.md
```

---

## 🚀 Getting Started

### Prerequisites

Make sure you have:

* Python 3.8+
* pip
* A modern browser such as Chrome, Firefox, Edge, or Safari

Clone the repository:

```bash
git clone <your-repository-url>
cd AliceInCryptoLand
```

Install the required Python packages:

```bash
pip install flask flask-cors
```

---

## ▶️ Running the Application

Start the Flask backend:

```bash
python app.py
```

The API will run on:

```text
http://localhost:5000
```

The Flask application listens on `0.0.0.0`, which also allows testing from other devices on the same network when configured appropriately.

Next, serve the frontend from the project directory:

```bash
python -m http.server 8000
```

Then open:

```text
http://localhost:8000
```

in your browser.

---

## 💬 Using the Application

### 1. Log In

Enter your:

* Name
* Email address

The prototype automatically creates a user if the email has not previously been registered.

---

### 2. Create a Chat

Select **Create Chat** and enter a chat name.

The creator automatically becomes the chat's **Trusted Authority** and receives:

```text
Admin
Creator
```

attributes.

---

### 3. Join a Chat

Another user can:

1. Select **Join Chat**
2. Choose an available chat
3. Send a join request
4. Wait for approval from the creator

---

### 4. Approve Users

The chat creator can open **Manage Users** and review pending requests.

When approving a user, the creator can assign attributes such as:

```text
Admin
Manager
Developer
Member
Guest
```

Custom comma-separated attributes can also be assigned.

---

### 5. Send an Encrypted Message

Enter a message and enable encryption.

Select the attributes required to access the message.

For example:

```text
☑ Manager
☑ Developer
```

The application encrypts the message before sending it to the Flask server.

A recipient must possess **both** attributes to decrypt it.

---

## 🧪 Example Test

Create three users:

```text
Alice → Admin, Developer
Bob   → Manager, Developer
Eve   → Member
```

Send:

```text
"Production deployment begins tonight."
```

with:

```text
Required attributes: Manager + Developer
```

### Result

| User  | Access       |
| ----- | ------------ |
| Alice | 🔒 Locked    |
| Bob   | 🔓 Decrypted |
| Eve   | 🔒 Locked    |

Bob is the only user who possesses every required attribute.

---

## 🌐 API Endpoints

| Method | Endpoint                        | Description                  |
| ------ | ------------------------------- | ---------------------------- |
| `POST` | `/api/register`                 | Register or retrieve a user  |
| `POST` | `/api/sessions/create`          | Create a chat session        |
| `POST` | `/api/sessions/join`            | Request to join a session    |
| `POST` | `/api/sessions/<id>/approve`    | Approve a pending user       |
| `POST` | `/api/sessions/<id>/attributes` | Update user attributes       |
| `POST` | `/api/sessions/<id>/messages`   | Send a message               |
| `GET`  | `/api/sessions/<id>/messages`   | Retrieve messages            |
| `GET`  | `/api/sessions/<id>/info`       | Retrieve session information |
| `GET`  | `/api/users/<id>/sessions`      | Retrieve a user's sessions   |
| `GET`  | `/api/sessions/list`            | List available sessions      |

---

## 🧪 Testing Multiple Users

Because the backend stores users and sessions in memory, the easiest way to test the access-control system is with multiple browser contexts.

For example:

```text
Normal Chrome window → Alice
Incognito window     → Bob
Firefox              → Eve
```

Create a chat with Alice, request access using Bob and Eve, and assign each user different attributes.

You can then send encrypted messages with different policies and verify which users can decrypt them.

---

## ⚠️ Current Limitations

This project is intended as a prototype and currently has several limitations:

* User and message data is stored only in memory
* Restarting the Flask server deletes all application data
* Authentication is minimal
* There is no persistent database
* There is no production session management
* Messages are retrieved through polling rather than WebSockets
* Attribute names are used to derive encryption keys
* The implementation is not true cryptographic Attribute-Based Encryption
* The Flask development server runs with debug mode enabled

---

## 🔮 Possible Improvements

Future versions could include:

* True CP-ABE or KP-ABE cryptography
* Secure user authentication
* OAuth2
* PostgreSQL or MongoDB persistence
* Cryptographically secure key distribution
* JWT/session authentication
* WebSocket-based real-time messaging
* File encryption and sharing
* Message deletion and editing
* User profiles
* Read receipts
* Typing indicators
* Push notifications
* Searchable chat history
* HTTPS deployment
* Docker support

---

## 🎓 Educational Purpose

Alice in CryptoLand was created as an educational cryptography project to explore how **attributes and access policies can control access to encrypted information**.

The project demonstrates the basic idea behind Attribute-Based Encryption:

> Access to encrypted information can depend on **what attributes a user possesses**, rather than simply who the user is.

This prototype translates that concept into a familiar chat application where permissions can be changed and their effects observed immediately.

---

## 👥 Team

* Benjamin Mannal
* Suhitha Kantareddy
* Tristan Coull

---

## 📄 License

Created as an educational project for **CS/IT5041 — Cryptography**.

Unless a separate license file is added to the repository, the project should be considered educational/coursework code rather than licensed for unrestricted redistribution.

---

## ⚠️ Disclaimer

This application is a **proof-of-concept educational project** and should not be used to transmit or store sensitive, confidential, or production data.

For real-world applications, use established cryptographic libraries, proper authentication, secure key-management infrastructure, persistent storage, HTTPS, and independently reviewed security protocols.
