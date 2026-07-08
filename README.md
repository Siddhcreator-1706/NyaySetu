# NyaySetu

A comprehensive querying interface designed to view and manage judicial cases and related information with role-based access control.

## Overview

NyaySetu is built with a modern web stack:
- **Frontend**: React (Vite), Tailwind CSS, TypeScript
- **Backend**: Node.js (Express), TypeScript
- **Database**: PostgreSQL (via Prisma ORM)

## Prerequisites

Before you begin, ensure you have the following installed on your local machine:
- [Node.js](https://nodejs.org/) (v18 or higher recommended)
- [npm](https://www.npmjs.com/) (comes with Node.js)
- A running instance of PostgreSQL (or a hosted DB like Neon)

## Local Development Setup

Follow these steps to get the project running locally.

### 1. Clone the Repository
```bash
git clone <repository_url>
cd NyaySetu
```

### 2. Install Dependencies

The project is split into a `client` (frontend) and `server` (backend). You need to install dependencies for both.

**For the Backend:**
```bash
cd server
npm install
```

**For the Frontend:**
```bash
cd ../client
npm install
```

### 3. Configure Environment Variables

Navigate to the `server` directory and set up your environment variables:
```bash
cd ../server
```

Create a `.env` file in the `server` directory and configure it:
```env
DATABASE_URL="postgresql://user:password@localhost:5432/yourdbname?schema=public"
PORT=5000
```
*(Make sure to replace the `DATABASE_URL` with your actual PostgreSQL connection string).*

### 4. Database Initialization

From within the `server` directory, run the following commands to initialize your database schema and generate the Prisma client:

```bash
npx prisma generate
npx prisma db push
```

## Running the Application

To run the application locally, you will need to start both the backend server and the frontend client concurrently. Open **two separate terminal windows**.

**Terminal 1: Start the Backend Server**
```bash
cd server
npm run dev
```
*The server will start running on `http://localhost:5000` (by default).*

**Terminal 2: Start the Frontend Client**
```bash
cd client
npm run dev
```
*The client will start running on `http://localhost:5173`.*

## Usage

- Open your browser and navigate to `http://localhost:5173`.
- Use the **SQL Editor** to run queries directly against the judicial database.
- Save and organize useful queries for quick access.
- Monitor query performance and errors in the **Query History** tab.
