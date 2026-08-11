# 📚 Bookmarked

> A Letterboxd-style book tracking and social reading app — built for readers who take their books seriously.

---

## Overview

**Bookmarked** is a mobile-first book tracking application inspired by Letterboxd. Users can log books they've read, rate and review them, build custom shelves, follow other readers, and discover new books through personalised recommendations. The app is designed for casual readers, avid bookworms, and book clubs alike.

Built by **+232**.

---

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React Native |
| Backend | ASP.NET Core Web API |
| Database | PostgreSQL |
| ORM | Entity Framework Core |
| Authentication | JWT (JSON Web Tokens) |
| API Docs & Testing | Swagger + Postman |

---

## Project Structure

```
bookmarked/
├── frontend/        # React Native mobile app (iOS & Android)
└── backend/         # ASP.NET Core Web API
```

---

## Features

- 📖 **Book Tracking** — Log books as Read, Currently Reading, Want to Read, DNF, On Hold, or Re-reading
- ⭐ **Ratings & Reviews** — Half-star ratings (1–5), rich text reviews, spoiler warnings, private notes
- 🗂️ **Custom Shelves** — Unlimited user-created collections and public/private lists
- 👤 **User Profiles** — Avatars, bios, favourite books, reading stats, and annual goals
- 🤝 **Social Features** — One-way following, activity feed, reading comparisons, book clubs
- 🔍 **Discovery** — Search books/authors/users, filter by language/year/rating/award, personalised recommendations
- 📊 **Reading Stats** — Full stats page with yearly Reading Wrapped shareable card
- 🔔 **Notifications** — New followers, likes, comments, mentions, reading goal reminders
- 🌍 **Multilingual** — Books shown under one entry with edition/language options

---

## Book Data Sources

- [Google Books API](https://developers.google.com/books)
- [Open Library (Internet Archive)](https://openlibrary.org/developers/api)

---

## Getting Started

### Prerequisites

- Node.js (v18+)
- .NET SDK (v8+)
- PostgreSQL
- Git

### Clone the Repository

```bash
git clone https://github.com/your-username/bookmarked.git
cd bookmarked
```

### Backend Setup

```bash
cd backend
dotnet restore
dotnet ef database update
dotnet run
```

API will be available at `http://localhost:5000`
Swagger docs at `http://localhost:5000/swagger`

### Frontend Setup

```bash
cd frontend
npm install
npx expo start
```

---

## Target Audience

Young adults (18–35), book club members, and avid readers looking for a cleaner, more social alternative to Goodreads.

---

## Design

Light mode only. Color palette inspired by +232's visual identity: olive/moss/army green and beige tones.

---

## Status

🚧 Currently in active development — beta launch planned for a closed group of under 100 users.

---

## License

This project is private. All rights reserved © +232.
