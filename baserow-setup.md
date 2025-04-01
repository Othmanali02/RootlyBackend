# Setting Up a Baserow Database for Rootly  

This guide will walk you through setting up a **Baserow database** for Rootly. The database consists of four tables:  

- **Users**  
- **Teams**  
- **Lists**  
- **List Content**  

Each table has specific fields, and some fields link to other tables to maintain data relationships.  

---

## **1️⃣ Users Table**  
The `Users` table stores information about Rootly users.  

| Field Name       | Type                         |
|-----------------|-----------------------------|
| `User ID`       | Single Text                 |
| `Name`          | Single Text                 |
| `Email`         | Single Text or Email        |
| `Lists`         | Link to another table → Lists  |
| `Teams`         | Link to another table → Teams  |
| `Teams - Owner` | Auto Generated _(Do not create manually)_ |

---

## **2️⃣ Teams Table**  
The `Teams` table stores team details and their relationships with users and lists.  

| Field Name    | Type                              |
|--------------|----------------------------------|
| `Team ID`    | Single Text                      |
| `Name`       | Single Text                      |
| `Description`| Single Text                      |
| `Leader`     | Link to another table → Users _(Team Owner)_  |
| `User ID`    | Link to another table → Users _(Team Members)_  |
| `Lists`      | Link to another table → Lists _(Team's Lists)_  |

---

## **3️⃣ Lists Table**  
The `Lists` table holds the structured trait lists.  

| Field Name     | Type                          |
|--------------|--------------------------------|
| `List ID`    | Single Text                    |
| `Name`       | Single Text                    |
| `Team ID`    | Link to another table → Teams  |
| `Owner`      | Link to another table → Users  |
| `List-Content` | Link to another table → List Content |

---

## **4️⃣ List Content Table**  
The `List Content` table stores details about individual list items.  

| Field Name         | Type                           |
|-------------------|-----------------------------|
| `List Content ID` | Single Text                  |
| `List ID`        | Link to another table → Lists |
| `List Name`      | Single Text                   |
| `Variable Db Id` | Single Text                   |
| `Custom Variables` | Single Text                   |

---

### **Final Steps**  
Once these tables are created, Rootly will be able to **store and manage ontology lists seamlessly**. Make sure all field names are **case-sensitive** and links between tables are correctly configured.  

_For any issues, check the Rootly documentation or reach out to the team._  
