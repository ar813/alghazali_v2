---
description: # QR Attendance Workflow
---

## 1. Add Student

- Enter name, class
- Auto-generate GR number
- Generate QR from GR number
- Save student to Firebase Firestore

## 2. Attendance Scan Flow

1. Open Scan Screen
2. Camera reads QR
3. Extract GR number
4. Query Firestore:
   collection('students').where('gr_number', '==', scanned_value)
5. If found → check attendance for today
6. If not marked → insert attendance record
7. Show success confirmation

## 3. Error Handling

- Unknown QR → red warning card
- Already marked → show timestamp
- Offline mode → save in queue (optional)
