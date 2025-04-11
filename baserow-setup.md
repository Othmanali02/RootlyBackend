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

![userstable-baserow](https://github.com/user-attachments/assets/ddba0a49-8278-48b7-b86e-90833182b572)

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

![teamstable](https://github.com/user-attachments/assets/4ec244a6-861e-4ea4-9937-83e3b6cfdc06)

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

![liststable-baseorw](https://github.com/user-attachments/assets/45239f7f-2977-4158-96e9-b05a0a163154)

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

![list-content-baseorw](https://github.com/user-attachments/assets/5dfb50ef-9b7d-461c-8aea-d0c973d5c015)

---

### **Final Steps**  
Once these tables are created, you can copy the id of each table and put them in the .env file that you are using to run Rootly. Make sure all field names are **case-sensitive** and links between tables are correctly configured.  
