# Setting Up the Airtable Database for Rootly  

This guide will walk you through setting up an **Airtable database** for Rootly. The database consists of four tables:  

- **Users**  
- **Teams**  
- **Lists**  
- **List Content**  

Each table has specific fields, and some fields link to other tables to maintain data relationships.  

---

## **1️⃣ Users Table**  
The `Users` table stores information about Rootly users.  

| Field Name       | Type                           |
|-----------------|-------------------------------|
| `User ID`       | Single Line Text              |
| `Name`          | Single Line Text              |
| `Email`         | Single Line Text or Email     |
| `Lists`         | Link to another record → Lists |
| `Teams`         | Link to another record → Teams |
| `Teams - Owner` | Auto Generated _(Do not create manually)_ |

---

## **2️⃣ Teams Table**  
The `Teams` table stores team details and their relationships with users and lists.  

| Field Name    | Type                               |
|--------------|-----------------------------------|
| `Team ID`    | Single Line Text                 |
| `Name`       | Single Line Text                 |
| `Description`| Single Line Text                 |
| `Leader`     | Link to another record → Users _(Team Owner)_  |
| `User ID`    | Link to another record → Users _(Team Members)_  |
| `Lists`      | Link to another record → Lists _(Team's Lists)_  |

---

## **3️⃣ Lists Table**  
The `Lists` table holds the structured trait lists.  

| Field Name     | Type                              |
|--------------|----------------------------------|
| `List ID`    | Single Line Text                |
| `Name`       | Single Line Text                |
| `Teams`      | Link to another record → Teams  |
| `Owner`      | Link to another record → Users  |
| `List-Content` | Link to another record → List Content |

---

## **4️⃣ List Content Table**  
The `List Content` table stores details about individual list items.  

| Field Name         | Type                              |
|-------------------|----------------------------------|
| `List Content ID` | Single Line Text                 |
| `List ID`        | Link to another record → Lists   |
| `List Name`      | Single Line Text                 |
| `Variable Db Id` | Single Line Text                 |
| `Custom Variables` | Single Line Text                 |

---

### **Final Steps**  
Once these tables are created, you can copy the id of each table and put them in the .env file that you are using to run Rootly. Make sure all field names are case-sensitive and links between tables are correctly configured.
