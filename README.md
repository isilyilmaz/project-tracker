# Project Tracker

A comprehensive project tracking application that directly updates JSON files using modern browser File System Access API.

## Features

- **Projects**: Create and manage projects with goals, objectives, and linked resources
- **Ideas**: Track ideas with keywords and associated tasks
- **Events**: Schedule and manage events with location and status tracking
- **Tasks**: Create tasks with due dates, status tracking, and subtasks
- **Subtasks**: Forward-only lifecycle management (Analyze → Development → Test → Production)
- **Direct File Updates**: Uses File System Access API to directly modify JSON files in data/ folder
- **Schema Validation**: Strict JSON schema enforcement with referential integrity
- **Browser Storage Fallback**: Uses localStorage for unsupported browsers

## Installation & Setup

### Prerequisites
- Modern browser with File System Access API support (Chrome/Edge 86+)
- Any static file server (Python, Node.js, or live-server)

### Quick Start

1. **Serve the files locally:**
   ```bash
   # Using Python
   python3 -m http.server 8080

   # Using Node.js (if you have it)
   npx http-server -p 8080

   # Using live-server (if installed)
   live-server --port=8080
   ```

2. **Open your browser:**
   Navigate to `http://localhost:8080`

3. **Grant file access:**
   When you save data, the browser will prompt you to select the location for your JSON files

## How It Works

The application uses modern browser File System Access API for direct file modification:

1. **Client-side only** - no server required
2. **Direct file access** - saves directly to your local `data/` folder
3. **Strict schema enforcement** - only allows exact field structures
4. **Relationship validation** - ensures ID references exist between files
5. **Instant updates** - files are modified immediately when you click save
6. **Fallback support** - uses localStorage for unsupported browsers

### File Structure

```
project-tracker/
├── data/                 # JSON data files (you choose location)
│   ├── projects.json
│   ├── ideas.json
│   ├── events.json
│   ├── tasks.json
│   └── subtasks.json
├── js/                   # JavaScript modules
├── css/                  # Stylesheets
├── pages/                # HTML page templates
└── index.html            # Main application
```

## Usage

1. **Serve the files** using any static file server
2. **Open the application** in your browser
3. **Create projects, ideas, events, and tasks** using the interface
4. **Click save buttons** - browser will prompt for file location on first save
5. **All changes are saved directly** to your chosen JSON files

## Browser Compatibility

### Full Support (File System Access API)
- **Chrome 86+**: Direct file modification
- **Edge 86+**: Direct file modification

### Fallback Support (localStorage)
- **Firefox**: Data saved to browser storage
- **Safari**: Data saved to browser storage
- **Older browsers**: Data saved to browser storage

## Strict Schema Enforcement

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

## Key Features

- **Schema Validation**: Only allows exact fields specified above
- **Type Checking**: Arrays must be arrays, dates must be valid dates
- **Referential Integrity**: ID references are validated across JSON files
- **Required Fields**: Essential fields must be present and non-empty
- **Forward-Only Lifecycle**: Subtasks can only progress (Analyze → Development → Test → Production)
- **Clean JSON Output**: No extra fields or metadata pollute the files

## Troubleshooting

### File Access Not Working
- Ensure you're using Chrome 86+ or Edge 86+
- Check that you granted file system permissions
- Try refreshing the page and granting permissions again

### Data Not Saving
- Check browser console for schema validation errors
- Verify all required fields are filled
- Ensure no extra fields are being submitted
- For unsupported browsers, data is saved to localStorage

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

## Development

This is a pure client-side application. To modify:

1. **Edit JavaScript files** in the `js/` folder
2. **Modify HTML templates** in the `pages/` folder
3. **Update styles** in the `css/` folder
4. **Test with any static file server**

## Technical Notes

- **Client-Side Architecture**: Pure browser-based application, no server dependencies
- **Modern Web APIs**: Uses File System Access API for direct file operations
- **Progressive Enhancement**: Falls back gracefully to localStorage
- **Schema-First Design**: JSON files maintain strict structure
- **Type Safety**: Arrays, dates, and status values are strictly validated
- **Clean Data**: No metadata or timestamps pollute the JSON files
- **Instant Updates**: Files are modified immediately upon save