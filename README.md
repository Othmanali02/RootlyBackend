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

| Service  | Website |
|----------|----------|
|![airtablecropped](https://github.com/user-attachments/assets/15f199c0-d3db-48f5-a6f2-d8af05db148a) | https://airtable.com/
|![baserow](https://github.com/user-attachments/assets/bd187c9f-35a5-4906-a9e1-4e61075a58a7) | https://baserow.io/

### 🔧 Configuration

Set up the database selection in your `.env` file:

```env
BASEROW_TOKEN=your-baserow-token
AIRTABLE_API_KEY=your-airtable-api-key
```

- If **one** of these is set, Rootly will use that database.
- If **both** are set, Rootly defaults to **Airtable**.
- You will also need to rename ```dummyenv.env``` to .env and fill out the required enviornment variables


## Setting up the database:  
- `./baserow-setup.md`
- `./airtable-setup.md` 


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
