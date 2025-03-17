# Rootly Backend

![logomockup6](https://github.com/user-attachments/assets/4cb7ab1c-9c3a-4134-9917-bb96bac182c3)

[![Node.js](https://img.shields.io/badge/Node.js-18.x-green.svg)](https://nodejs.org/)  
[![Express.js](https://img.shields.io/badge/Express.js-4.x-blue.svg)](https://expressjs.com/)  
[![License](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)  
[![Build](https://img.shields.io/github/actions/workflow/status/Othmanali02/Rootly/build.yml)](https://github.com/Othmanali02/Rootly/actions)  

Rootly Backend is the API powering **Rootly**, a collaborative ontology management web application. Rootly provides a structured and efficient way to manage resources such as **lists, teams, users, and CropOntology** data and allowing integration with applications using the BrAPI standard

---

## 🌿 Features

- 📄 **Lists** - Create, update, and share variable lists
- 👥 **Teams** - Manage team collaboration and access control
- 🏷 **Users** - Handle authentication and user management
- 🌿 **CropOntology** - Fetch and interact with ontology data
- 🔗 **BrAPI Standard** - Allows interoperability with other BrAPPs

---

## 🛠️ Tech Stack

- **Node.js** - Backend runtime
- **Express.js** - Web framework
- **Baserow / Airtable** - RESTful database integration
- **Docker** *(optional)* - Containerized deployment

---

## 📦 Database Configuration

Rootly supports **Baserow** and **Airtable** as a RESTful database backend. The choice depends on environment variables.

### 🔗 Supported Databases

| Service  | Logo |
|----------|------|
| **Airtable**  | ![Airtable](https://upload.wikimedia.org/wikipedia/commons/8/8f/Airtable_Logo.svg) |
| **Baserow**   | ![Baserow](https://baserow.io/_next/image?url=%2Fimg%2Fbranding%2Fbaserow-logo.png&w=256&q=75) |

### 🔧 Configuration

Set up the database selection in your `.env` file:

```env
BASEROW_TOKEN=your-baserow-token
AIRTABLE_API_KEY=your-airtable-api-key
```

- If **one** of these is set, Rootly will use that database.
- If **both** are set, Rootly defaults to **Airtable**.

you will need to rename ```dummyenv.env``` to .env and fill out the required enviornment variables
---

## 📦 Installation & Setup

### Prerequisites

Ensure you have the following installed:

- [Node.js](https://nodejs.org/) (v18+ recommended, I am using v23)
- [Docker](https://www.docker.com/) *(optional)*

### Installation

```bash
# Clone the repository
git clone https://github.com/Othmanali02/RootlyBackend.git
cd RootlyBackend

# Install dependencies
npm install

# Create a .env file
cp dummyenv.env .env
```

### Running the Server

```bash
npm start
```

The API should now be running at `http://localhost:3000/`.

---

## 🔗 API Resources


---

## 🤝 Contributing

We welcome contributions! To get started:

1. Fork the repository
2. Create a new branch (`RootlyBackend/very-cool-feature`)
3. Commit your changes
4. Push to your fork and open a pull request

---

## 📜 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.
