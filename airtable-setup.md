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

![Screenshot from 2025-04-01 21-20-14](https://github.com/user-attachments/assets/66d2eb3c-5290-48f9-800c-792a74c19e0a)

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

![Screenshot from 2025-04-01 21-20-40](https://github.com/user-attachments/assets/ef968360-ca92-4f08-a869-a6578be77466)

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

![Screenshot from 2025-04-01 21-20-25](https://github.com/user-attachments/assets/9932d460-2f02-4744-8bcd-ee2db31de553)

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

![Screenshot from 2025-04-01 21-20-51](https://github.com/user-attachments/assets/ac675a7b-4ad2-4f32-bcf6-e75b5f384a01)

---

### **Final Steps**  
Once these tables are created, you can copy the id of each table and put them in the .env file that you are using to run Rootly. Make sure all field names are case-sensitive and links between tables are correctly configured.
