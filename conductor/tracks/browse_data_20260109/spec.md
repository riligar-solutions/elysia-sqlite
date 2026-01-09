# Spec: Browse Data View

## Goal
Provide a clean, "Content-First" interface for users to browse data within an SQLite database.

## Requirements
- **Table Selection:** A sidebar or dropdown to select from available tables in the database.
- **Data Grid:** A minimalist table view showing row data.
- **Pagination:** Support for navigating through large datasets (e.g., 50 rows per page).
- **Styling:** Adherence to the "Content-First" minimalist aesthetic with Dark Mode support.

## Technical Details
- **Backend:** New Elysia routes to fetch table list and paginated row data.
- **Frontend:** New React components (`TableSelector`, `DataGrid`, `Pagination`) integrated into the existing `App.jsx`.
- **API Endpoint:** `GET /api/tables` and `GET /api/tables/:name/rows?page=1&limit=50`.
