---
description: # Attendance Manager – New Updated Scenario (QR + GR-Based + Firebase + Sanity + Website Sync)
---

## 1. Purpose

This document defines how attendance will work using existing ID card QR codes that contain full student details.  
GR Number will be the **single unique key** used across the whole system.

---

## 2. QR Code Structure (Existing Cards)

### Example QR Text

```
Name: Muhammad Khuzaima
Father Name: Muhammad Hussain
Roll No: 101
GR NO: 2291
DOB: 2018-02-11
Issue: 2025-04-01
Expiry: 2026-02-11
Phone: 0312-3091081
```

### Extract Only This Field

```
GR NO: <number>
```

### Extraction Code (Client)

```js
const match = qrText.match(/GR NO:\s*(\d+)/i);
const grNo = match ? match[1] : null;
```

---

## 3. Why GR Number?

- GR Number is permanent  
- No need to update or reprint new ID cards  
- Multiple systems (Sanity, Firebase, Website) can use GR as a unique key  
- Scanning becomes consistent and future-proof  

---

## 4. Attendance Storage (Firebase)

### Data Structure

```
attendance/
  <GR_NO>/
     <YYYY-MM-DD>: {
        status: "present",
        timestamp: <serverTime>
     }
```

### Write Attendance

```js
import { ref, set } from "firebase/database";
import { db } from "../firebaseConfig";

export async function markAttendance(grNo) {
  const today = new Date().toISOString().split("T")[0];
  
  await set(ref(db, `attendance/${grNo}/${today}`), {
    status: "present",
    timestamp: Date.now()
  });
}
```

---

## 5. Student Records Source (Sanity)

# Sanity main api = <https://3u9cr7x9.api.sanity.io/v2023-10-10/data/query/production?query=*&perspective=drafts>

Sanity already contains:

*[_type == "student"]{
  _id,
  fullName,
  fatherName,
  grNumber,
  rollNumber,
  admissionFor,
  gender,
  dob,
  phoneNumber,
  whatsappNumber,
  guardianName,
  guardianContact,
  address,
  photo{
    asset->{
      url
    }
  }
}

### Fetching Student (Sanity)

```js
export const studentByGR = (grNo) => `
  *[_type == "student" && grNo == "${grNo}"][0]
`;
```

---

## 6. Connecting Attendance With Website (Next.js)

### Architecture

1. **Mobile App**  
   - scans QR  
   - extracts GR number  
   - writes attendance to Firebase  

2. **Next.js School Website**  
   - keeps using Sanity for student details  
   - pulls attendance directly from Firebase via server route  

3. **Admin Panel on Website**  
   - Can show:  
     - today’s attendance  
     - student history  
     - monthly reporting  

### Example Website API Route (Next.js → Firebase)

```ts
import { getDatabase, ref, get } from "firebase/database";

export default async function handler(req, res) {
  const { gr } = req.query;
  const db = getDatabase();
  const snap = await get(ref(db, `attendance/${gr}`));
  res.status(200).json(snap.val() || {});
}
```

---

## 7. No Schema Conflict

- Sanity remains master record for **student info**  
- Firebase becomes master record for **attendance data**  
- Both link via **GR Number**  
- No need to modify existing ID cards  

---

## 8. Final Flow Summary

### Step-by-step

1. Teacher opens app  
2. Scans ID card QR  
3. Code extracts GR NO  
4. App sends GR NO → Firebase  
5. Firebase saves attendance for today  
6. Next.js website pulls attendance from Firebase  
7. Website admin dashboard displays attendance with student info from Sanity  

**Result: A fully connected ecosystem without changing cards or duplicating data.**

---

## 9. Only One Rule

Use **GR Number** as the single source of truth across:

- QR Code  
- Firebase  
- Sanity  
- Website  
