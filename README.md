# Project Tracker

A comprehensive project tracking application with strict JSON database schema enforcement that directly updates structured JSON files in the data/ folder.

## Features

- **Projects**: Create and manage projects with goals, objectives, and linked resources
- **Ideas**: Track ideas with keywords and associated tasks
- **Events**: Schedule and manage events with location and status tracking
- **Tasks**: Create tasks with due dates, status tracking, and subtasks
- **Subtasks**: Forward-only lifecycle management (Analyze → Development → Test → Production)
- **JSON Database**: Strict schema enforcement with referential integrity
- **Direct File Updates**: Automatically updates JSON files in data/ folder when you save
- **Database Validation**: Prevents invalid data and maintains clean JSON structure

## Installation & Setup

### Prerequisites
- Node.js (version 14 or higher)
- npm (Node Package Manager)

### Quick Start

1. **Install dependencies:**
   ```bash
   npm install
   ```

2. **Start the server:**
   ```bash
   npm start
   ```
   
   Or for development with auto-restart:
   ```bash
   npm run dev
   ```

3. **Open your browser:**
   Navigate to `http://localhost:3000`

## How It Works

The application uses a Node.js/Express server with strict database schema enforcement:

1. **Serves the web application** on `http://localhost:3000`
2. **Provides a REST API** that directly reads/writes JSON files in the `data/` folder
3. **Enforces strict schemas** - only allows exact database field structures
4. **Validates relationships** - ensures ID references exist between JSON files
5. **Automatically creates** JSON files if they don't exist
6. **Updates files instantly** when you click save buttons
7. **Maintains database integrity** with referential validation

### API Endpoints

- `GET /api/{type}` - Get all items (projects, ideas, events, tasks, subtasks)
- `POST /api/{type}` - Save new item or update existing item
- `DELETE /api/{type}/{id}` - Delete specific item by ID

### File Structure

```
project-tracker/
├── data/                 # JSON data files (auto-created)
│   ├── projects.json
│   ├── ideas.json
│   ├── events.json
│   ├── tasks.json
│   └── subtasks.json
├── js/                   # JavaScript modules
├── css/                  # Stylesheets
├── pages/                # HTML page templates
├── server.js             # Node.js server
└── package.json          # Dependencies
```

## Usage

1. **Start the server** with `npm start`
2. **Open the application** in your browser at `http://localhost:3000`
3. **Create projects, ideas, events, and tasks** using the interface
4. **Click save buttons** - data is automatically saved to JSON files in `data/` folder
5. **All changes are persistent** and immediately available

## Strict Database Schema

The application enforces exact JSON schemas with strict validation. **Only these fields are allowed** - any extra fields will be rejected.

### Projects (projects.json)
```json
{
  "id": "proj_xxx",
  "topic": "string",
  "planDueDate": "YYYY-MM-DD",
  "name": "string",
  "keywords": ["string"],
  "ideaId": ["idea_xxx"],
  "eventId": ["event_xxx"],
  "goal": "string",
  "objective": "string",
  "taskId": ["task_xxx"]
}
```

### Ideas (ideas.json)
```json
{
  "id": "idea_xxx",
  "topic": "string",
  "planDueDate": "YYYY-MM-DD",
  "name": "string",
  "keywords": ["string"],
  "goals": "string",
  "objectives": "string",
  "taskIds": ["task_xxx"]
}
```

### Events (events.json)
```json
{
  "id": "event_xxx",
  "name": "string",
  "type": "conference|workshop|meeting|webinar|social|launch|other",
  "eventDate": "YYYY-MM-DDTHH:mm",
  "duration": "number (hours)",
  "location": "string",
  "description": "string",
  "status": "planning|scheduled|in-progress|completed|cancelled"
}
```

### Tasks (tasks.json)
```json
{
  "id": "task_xxx",
  "name": "string",
  "dueDate": "YYYY-MM-DD",
  "doneStatus": "pending|incomplete|complete|overdue",
  "notes": "string",
  "subtaskIds": ["subtask_xxx"]
}
```

### Subtasks (subtasks.json)
```json
{
  "id": "subtask_xxx",
  "name": "string",
  "dueDate": "YYYY-MM-DD",
  "taskType": "Analyze|Development|Test|Production",
  "assignee": "string"
}
```

## Database Features

- **Strict Schema Enforcement**: Only allows exact fields specified above
- **Type Validation**: Arrays must be arrays, dates must be valid dates
- **Referential Integrity**: ID references are validated across JSON files
- **Required Fields**: Essential fields must be present and non-empty
- **Forward-Only Lifecycle**: Subtasks can only progress (Analyze → Development → Test → Production)
- **Clean JSON Output**: No extra fields or metadata pollute the database files

## Troubleshooting

### Server Not Starting
- Check if port 3000 is available
- Ensure Node.js is installed
- Run `npm install` to install dependencies

### Data Not Saving
- Ensure the server is running (`npm start`)
- Check browser console for schema validation errors
- Verify data/ folder has write permissions
- Check that all required fields are filled
- Ensure no extra fields are being submitted

### Schema Validation Errors
- Check browser console for specific validation messages
- Verify all array fields are properly formatted
- Ensure date fields use correct format (YYYY-MM-DD)
- Check that status fields use allowed values only
- Remove any extra fields not in the schema

### Relationship Validation Warnings
- Create referenced items before linking them
- Check that linked IDs exist in their respective JSON files
- Verify ID format matches schema (proj_xxx, idea_xxx, etc.)

### Files Not Updating
- Restart the server if needed
- Check server logs for validation error messages
- Ensure JSON files in data/ folder have valid schema structure
- Verify no corrupted JSON syntax in existing files

## Development

To contribute or modify:

1. **Install development dependencies:**
   ```bash
   npm install
   ```

2. **Run in development mode:**
   ```bash
   npm run dev
   ```

3. **The server will automatically restart** when you make changes to server.js

## Notes

- **Database-First Design**: JSON files serve as the primary database with strict schema enforcement
- **Schema Validation**: All data is validated before saving to prevent corruption
- **Referential Integrity**: ID relationships between files are automatically validated
- **Clean Data**: No extra metadata or timestamps pollute the JSON database files
- **Graceful Fallbacks**: Falls back to download mode if server is not available
- **Data Backup**: All data is backed up to localStorage as a secondary measure
- **Pretty JSON**: Files are formatted with proper indentation for easy reading
- **Auto-Creation**: Server automatically creates missing JSON files with empty arrays
- **Type Safety**: Arrays, dates, and status values are strictly type-checked