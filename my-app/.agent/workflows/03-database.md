---
description: # Database Design — Firebase
---

## Collections

### 1. students

| Field       | Type       | Notes                 |
|-------------|------------|------------------------|
| id          | string     | Document ID            |
| name        | string     | required               |
| gr_number   | string     | unique GR              |
| class       | string     | e.g. 8-A               |
| created_at  | timestamp  | auto                   |

### 2. attendance

| Field       | Type       | Notes                               |
|-------------|------------|-------------------------------------|
| id          | string     | Document ID                         |
| student_id  | string     | Reference → students/{id}           |
| date        | string     | ISO Date (YYYY-MM-DD)               |
| time        | string     | optional                            |
| status      | string     | present/absent                      |

## Security Rules

- Only authenticated admin can read/write
- Validate data types
