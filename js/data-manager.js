class DataManager {
    constructor() {
        this.apiBase = 'http://localhost:3000/api';
        this.dataFiles = {
            projects: 'data/projects.json',
            ideas: 'data/ideas.json',
            events: 'data/events.json',
            tasks: 'data/tasks.json',
            subtasks: 'data/subtasks.json'
        };
        this.cache = {};
        this.serverMode = true; // Flag to indicate server mode
        this.initializeData();
    }

    async initializeData() {
        // Pre-load all data files into cache
        for (const [type, file] of Object.entries(this.dataFiles)) {
            await this.loadDataFile(type);
        }
    }

    async loadDataFile(type) {
        try {
            let response;
            if (this.serverMode) {
                // Try to load from server API first
                try {
                    response = await fetch(`${this.apiBase}/${type}`);
                    if (response.ok) {
                        this.cache[type] = await response.json();
                        console.log(`Loaded ${type} from server API`);
                        return this.cache[type];
                    }
                } catch (serverError) {
                    console.warn(`Server not available, falling back to local files for ${type}`);
                    this.serverMode = false;
                }
            }
            
            // Fallback to local file loading
            response = await fetch(this.dataFiles[type]);
            if (response.ok) {
                this.cache[type] = await response.json();
                console.log(`Loaded ${type} from local file`);
            } else {
                console.warn(`Could not load ${type} data file, initializing empty array`);
                this.cache[type] = [];
            }
        } catch (error) {
            console.warn(`Error loading ${type} data:`, error);
            this.cache[type] = [];
        }
        return this.cache[type];
    }

    async saveDataFile(type) {
        try {
            console.log(`Saving ${type} data:`, this.cache[type]);
            
            if (this.serverMode) {
                // Try to save via server API
                try {
                    const response = await fetch(`${this.apiBase}/${type}`, {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                        },
                        body: JSON.stringify(this.cache[type])
                    });

                    if (response.ok) {
                        const result = await response.json();
                        console.log(`Successfully saved ${type} to server:`, result);
                        this.showNotification(`${type}.json file updated successfully in data/ folder!`, 'success');
                        return true;
                    } else {
                        throw new Error(`Server responded with status: ${response.status}`);
                    }
                } catch (serverError) {
                    console.warn(`Server save failed for ${type}, falling back to download:`, serverError);
                    this.serverMode = false;
                }
            }
            
            // Fallback to download method
            const jsonContent = JSON.stringify(this.cache[type], null, 2);
            
            // Update localStorage as backup storage
            localStorage.setItem(`${type}`, JSON.stringify(this.cache[type]));
            localStorage.setItem(`backup_${type}`, JSON.stringify(this.cache[type]));
            
            // Automatically download the updated JSON file
            this.downloadJSONFile(type, jsonContent);
            
            // Show success notification
            this.showNotification(`Server not available. ${type}.json file downloaded - move it to your data/ folder.`, 'warning');
            
            return true;
        } catch (error) {
            console.error(`Error saving ${type} data:`, error);
            throw error;
        }
    }

    downloadJSONFile(type, jsonContent) {
        try {
            // Create blob with JSON content
            const blob = new Blob([jsonContent], { type: 'application/json' });
            
            // Create download link
            const url = URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            link.download = `${type}.json`;
            link.style.display = 'none';
            
            // Trigger download
            document.body.appendChild(link);
            link.click();
            
            // Cleanup
            document.body.removeChild(link);
            URL.revokeObjectURL(url);
            
            console.log(`Downloaded ${type}.json file`);
        } catch (error) {
            console.error(`Error downloading ${type}.json:`, error);
            // Fallback to clipboard copying
            this.showJSONForFileUpdate(type, jsonContent);
        }
    }

    async copyToClipboard(text) {
        try {
            if (navigator.clipboard && window.isSecureContext) {
                await navigator.clipboard.writeText(text);
                return true;
            } else {
                // Fallback for older browsers
                const textArea = document.createElement('textarea');
                textArea.value = text;
                textArea.style.position = 'fixed';
                textArea.style.left = '-999999px';
                textArea.style.top = '-999999px';
                document.body.appendChild(textArea);
                textArea.focus();
                textArea.select();
                const successful = document.execCommand('copy');
                document.body.removeChild(textArea);
                return successful;
            }
        } catch (error) {
            console.error('Error copying to clipboard:', error);
            return false;
        }
    }

    showJSONForFileUpdate(type, jsonContent) {
        const modal = document.createElement('div');
        modal.className = 'json-update-modal';
        modal.innerHTML = `
            <div class="json-update-content">
                <div class="json-update-header">
                    <h3>💾 Update ${type}.json File</h3>
                    <button class="close-instructions" onclick="this.parentElement.parentElement.parentElement.remove()">×</button>
                </div>
                <div class="json-update-body">
                    <div class="update-step">
                        <div class="step-number">1</div>
                        <div class="step-content">
                            <strong>Copy JSON Data</strong>
                            <p>Click the button below to copy the updated JSON data to your clipboard.</p>
                        </div>
                    </div>
                    <div class="update-step">
                        <div class="step-number">2</div>
                        <div class="step-content">
                            <strong>Update File</strong>
                            <p>Open <code>data/${type}.json</code> in your editor and paste the new content.</p>
                        </div>
                    </div>
                    <div class="update-step">
                        <div class="step-number">3</div>
                        <div class="step-content">
                            <strong>Save & Refresh</strong>
                            <p>Save the file and refresh your browser to see the changes.</p>
                        </div>
                    </div>
                    <div class="json-preview">
                        <h4>Preview (first 500 characters):</h4>
                        <pre class="json-preview-text">${jsonContent.substring(0, 500)}${jsonContent.length > 500 ? '...' : ''}</pre>
                    </div>
                </div>
                <div class="json-update-actions">
                    <button class="btn btn-primary" onclick="window.dataManager.copyJSONToClipboard('${type}')">
                        📋 Copy to Clipboard
                    </button>
                    <button class="btn btn-secondary" onclick="this.parentElement.parentElement.parentElement.remove()">
                        Close
                    </button>
                    <button class="btn btn-info" onclick="window.dataManager.showFullJSON('${type}')">
                        👁️ View Full JSON
                    </button>
                </div>
            </div>
        `;
        
        // Style the modal
        modal.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            background: rgba(0, 0, 0, 0.5);
            display: flex;
            align-items: center;
            justify-content: center;
            z-index: 1000;
        `;
        
        document.body.appendChild(modal);
        
        // Auto-remove after 30 seconds
        setTimeout(() => {
            if (modal.parentElement) {
                modal.remove();
            }
        }, 30000);
    }

    async copyJSONToClipboard(type) {
        try {
            const jsonContent = JSON.stringify(this.cache[type], null, 2);
            const success = await this.copyToClipboard(jsonContent);
            
            if (success) {
                this.showNotification('JSON data copied to clipboard! Paste it into data/' + type + '.json', 'success');
            } else {
                this.showNotification('Failed to copy to clipboard. Please use the View Full JSON option.', 'error');
            }
        } catch (error) {
            console.error('Error copying JSON:', error);
            this.showNotification('Error copying JSON: ' + error.message, 'error');
        }
    }

    showFullJSON(type) {
        const jsonContent = JSON.stringify(this.cache[type], null, 2);
        const modal = document.createElement('div');
        modal.className = 'full-json-modal';
        modal.innerHTML = `
            <div class="full-json-content">
                <div class="full-json-header">
                    <h3>Full JSON Content for ${type}.json</h3>
                    <button class="close-instructions" onclick="this.parentElement.parentElement.parentElement.remove()">×</button>
                </div>
                <div class="full-json-body">
                    <div class="json-actions">
                        <button class="btn btn-primary" onclick="window.dataManager.selectAllJSON()">
                            Select All
                        </button>
                        <button class="btn btn-secondary" onclick="window.dataManager.copyJSONToClipboard('${type}')">
                            Copy to Clipboard
                        </button>
                    </div>
                    <textarea id="full-json-textarea" readonly class="full-json-textarea">${jsonContent}</textarea>
                </div>
            </div>
        `;
        
        modal.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            background: rgba(0, 0, 0, 0.5);
            display: flex;
            align-items: center;
            justify-content: center;
            z-index: 1001;
        `;
        
        document.body.appendChild(modal);
    }

    selectAllJSON() {
        const textarea = document.getElementById('full-json-textarea');
        if (textarea) {
            textarea.select();
            textarea.setSelectionRange(0, 99999); // For mobile devices
        }
    }

    showNotification(message, type = 'info') {
        const notification = document.createElement('div');
        notification.className = `data-notification data-notification-${type}`;
        notification.innerHTML = `
            <span>${message}</span>
            <button onclick="this.parentElement.remove()">&times;</button>
        `;
        
        notification.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            background: ${type === 'success' ? '#28a745' : type === 'error' ? '#dc3545' : '#17a2b8'};
            color: white;
            padding: 1rem 1.5rem;
            border-radius: 5px;
            z-index: 1001;
            box-shadow: 0 4px 6px rgba(0,0,0,0.1);
            max-width: 400px;
        `;

        document.body.appendChild(notification);

        setTimeout(() => {
            if (notification.parentElement) {
                notification.remove();
            }
        }, 5000);
    }

    // Generic data methods
    async getData(type) {
        if (!this.cache[type]) {
            await this.loadDataFile(type);
        }
        return [...this.cache[type]]; // Return copy to prevent direct modification
    }

    async addData(type, item) {
        if (!this.cache[type]) {
            await this.loadDataFile(type);
        }
        
        // Validate database schema (strict)
        this.validateSchema(type, item);
        
        // Validate relationships between JSON files
        await this.validateRelationships(type, item);
        
        this.cache[type].push(item);
        await this.saveDataFile(type);
        return item;
    }

    async updateData(type, id, updatedItem) {
        if (!this.cache[type]) {
            await this.loadDataFile(type);
        }

        const index = this.cache[type].findIndex(item => item.id === id);
        if (index === -1) {
            throw new Error(`${type} with id ${id} not found`);
        }

        const mergedItem = { ...this.cache[type][index], ...updatedItem };

        // Validate database schema (strict)
        this.validateSchema(type, mergedItem);

        // Validate relationships between JSON files
        await this.validateRelationships(type, mergedItem);

        this.cache[type][index] = mergedItem;
        await this.saveDataFile(type);
        return this.cache[type][index];
    }

    async deleteData(type, id) {
        if (!this.cache[type]) {
            await this.loadDataFile(type);
        }

        const initialLength = this.cache[type].length;
        this.cache[type] = this.cache[type].filter(item => item.id !== id);

        if (this.cache[type].length === initialLength) {
            throw new Error(`${type} with id ${id} not found`);
        }

        if (this.serverMode) {
            // Try to delete via server API
            try {
                const response = await fetch(`${this.apiBase}/${type}/${id}`, {
                    method: 'DELETE',
                });

                if (response.ok) {
                    console.log(`Successfully deleted ${type} ${id} from server`);
                    return true;
                } else {
                    console.warn(`Server delete failed, updating with current cache`);
                }
            } catch (serverError) {
                console.warn(`Server delete failed for ${type} ${id}, updating with current cache:`, serverError);
            }
        }

        // Fallback to saving entire updated array
        await this.saveDataFile(type);
        return true;
    }

    validateSchema(type, item) {
        // Strict database schemas - only allow these exact fields
        const schemas = {
            projects: ['id', 'topic', 'planDueDate', 'name', 'keywords', 'ideaId', 'eventId', 'goal', 'objective', 'taskId'],
            ideas: ['id', 'topic', 'planDueDate', 'name', 'keywords', 'goals', 'objectives', 'taskIds'],
            events: ['id', 'name', 'type', 'eventDate', 'duration', 'location', 'description', 'status'],
            tasks: ['id', 'name', 'dueDate', 'doneStatus', 'notes', 'subtaskIds'],
            subtasks: ['id', 'name', 'dueDate', 'taskType', 'assignee']
        };

        const allowedFields = schemas[type];
        if (!allowedFields) {
            throw new Error(`Invalid data type: ${type}`);
        }

        // STRICT VALIDATION: Check for extra fields not in schema
        const itemFields = Object.keys(item);
        const extraFields = itemFields.filter(field => !allowedFields.includes(field));
        if (extraFields.length > 0) {
            throw new Error(`Invalid fields for ${type}: ${extraFields.join(', ')}. Only allowed: ${allowedFields.join(', ')}`);
        }

        // Check required fields exist
        const requiredFields = {
            projects: ['id', 'topic', 'planDueDate', 'name'],
            ideas: ['id', 'topic', 'planDueDate', 'name'],
            events: ['id', 'name', 'type', 'eventDate'],
            tasks: ['id', 'name', 'dueDate', 'doneStatus'],
            subtasks: ['id', 'name', 'dueDate', 'taskType']
        };

        if (requiredFields[type]) {
            const missingFields = requiredFields[type].filter(field => !item.hasOwnProperty(field) || item[field] === '' || item[field] === null || item[field] === undefined);
            if (missingFields.length > 0) {
                throw new Error(`Missing required fields for ${type}: ${missingFields.join(', ')}`);
            }
        }

        // Check for required array fields and validate they are arrays
        const arrayFields = {
            projects: ['keywords', 'ideaId', 'eventId', 'taskId'],
            ideas: ['keywords', 'taskIds'],
            tasks: ['subtaskIds']
        };

        if (arrayFields[type]) {
            arrayFields[type].forEach(field => {
                // Ensure array fields are initialized as arrays
                if (!item.hasOwnProperty(field)) {
                    item[field] = [];
                } else if (!Array.isArray(item[field])) {
                    throw new Error(`${field} must be an array in ${type}, received: ${typeof item[field]}`);
                }
            });
        }

        // Validate subtask taskType (forward-only lifecycle)
        if (type === 'subtasks' && item.taskType) {
            const validTypes = ['Analyze', 'Development', 'Test', 'Production'];
            if (!validTypes.includes(item.taskType)) {
                throw new Error(`Invalid taskType: ${item.taskType}. Must be one of: ${validTypes.join(', ')}`);
            }
        }

        // Validate task doneStatus
        if (type === 'tasks' && item.doneStatus) {
            const validStatuses = ['pending', 'incomplete', 'complete', 'overdue'];
            if (!validStatuses.includes(item.doneStatus)) {
                throw new Error(`Invalid doneStatus: ${item.doneStatus}. Must be one of: ${validStatuses.join(', ')}`);
            }
        }

        // Validate event status
        if (type === 'events' && item.status) {
            const validStatuses = ['planning', 'scheduled', 'in-progress', 'completed', 'cancelled'];
            if (!validStatuses.includes(item.status)) {
                throw new Error(`Invalid status: ${item.status}. Must be one of: ${validStatuses.join(', ')}`);
            }
        }

        // Validate date fields
        const dateFields = {
            projects: ['planDueDate'],
            ideas: ['planDueDate'],
            events: ['eventDate'],
            tasks: ['dueDate'],
            subtasks: ['dueDate']
        };

        if (dateFields[type]) {
            dateFields[type].forEach(field => {
                if (item[field] && item[field] !== '') {
                    const date = new Date(item[field]);
                    if (isNaN(date.getTime())) {
                        throw new Error(`Invalid date format for ${field}: ${item[field]}`);
                    }
                }
            });
        }
    }

    async validateRelationships(type, item) {
        // Validate ID references between JSON files for database integrity
        try {
            if (type === 'projects') {
                // Validate ideaId references
                if (item.ideaId && item.ideaId.length > 0) {
                    const allIdeas = await this.getAllIdeas();
                    const ideaIds = allIdeas.map(idea => idea.id);
                    const invalidIdeaIds = item.ideaId.filter(id => !ideaIds.includes(id));
                    if (invalidIdeaIds.length > 0) {
                        throw new Error(`Invalid idea references: ${invalidIdeaIds.join(', ')}`);
                    }
                }

                // Validate eventId references
                if (item.eventId && item.eventId.length > 0) {
                    const allEvents = await this.getAllEvents();
                    const eventIds = allEvents.map(event => event.id);
                    const invalidEventIds = item.eventId.filter(id => !eventIds.includes(id));
                    if (invalidEventIds.length > 0) {
                        throw new Error(`Invalid event references: ${invalidEventIds.join(', ')}`);
                    }
                }

                // Validate taskId references
                if (item.taskId && item.taskId.length > 0) {
                    const allTasks = await this.getAllTasks();
                    const taskIds = allTasks.map(task => task.id);
                    const invalidTaskIds = item.taskId.filter(id => !taskIds.includes(id));
                    if (invalidTaskIds.length > 0) {
                        throw new Error(`Invalid task references: ${invalidTaskIds.join(', ')}`);
                    }
                }
            }

            if (type === 'ideas') {
                // Validate taskIds references
                if (item.taskIds && item.taskIds.length > 0) {
                    const allTasks = await this.getAllTasks();
                    const taskIds = allTasks.map(task => task.id);
                    const invalidTaskIds = item.taskIds.filter(id => !taskIds.includes(id));
                    if (invalidTaskIds.length > 0) {
                        throw new Error(`Invalid task references: ${invalidTaskIds.join(', ')}`);
                    }
                }
            }

            if (type === 'tasks') {
                // Validate subtaskIds references
                if (item.subtaskIds && item.subtaskIds.length > 0) {
                    const allSubtasks = await this.getAllSubtasks();
                    const subtaskIds = allSubtasks.map(subtask => subtask.id);
                    const invalidSubtaskIds = item.subtaskIds.filter(id => !subtaskIds.includes(id));
                    if (invalidSubtaskIds.length > 0) {
                        throw new Error(`Invalid subtask references: ${invalidSubtaskIds.join(', ')}`);
                    }
                }
            }
        } catch (error) {
            console.warn(`Relationship validation warning for ${type}:`, error.message);
            // For now, we'll warn but not fail - relationships might be created in different order
        }
    }

    // Project-specific methods
    async getAllProjects() {
        return await this.getData('projects');
    }

    async getProject(id) {
        const projects = await this.getAllProjects();
        return projects.find(project => project.id === id);
    }

    async saveProject(projectData) {
        // Ensure arrays for new schema
        projectData.keywords = projectData.keywords || [];
        projectData.ideaId = projectData.ideaId || [];
        projectData.eventId = projectData.eventId || [];
        projectData.taskId = projectData.taskId || [];
        
        return await this.addData('projects', projectData);
    }

    async updateProject(id, projectData) {
        return await this.updateData('projects', id, projectData);
    }

    async deleteProject(id) {
        return await this.deleteData('projects', id);
    }

    // Idea-specific methods
    async getAllIdeas() {
        return await this.getData('ideas');
    }

    async getIdea(id) {
        const ideas = await this.getAllIdeas();
        return ideas.find(idea => idea.id === id);
    }

    async saveIdea(ideaData) {
        ideaData.keywords = ideaData.keywords || [];
        ideaData.taskIds = ideaData.taskIds || [];
        
        return await this.addData('ideas', ideaData);
    }

    async updateIdea(id, ideaData) {
        return await this.updateData('ideas', id, ideaData);
    }

    async deleteIdea(id) {
        // Delete associated tasks
        const idea = await this.getIdea(id);
        if (idea && idea.taskIds) {
            for (const taskId of idea.taskIds) {
                await this.deleteTask(taskId);
            }
        }
        return await this.deleteData('ideas', id);
    }

    // Event-specific methods
    async getAllEvents() {
        return await this.getData('events');
    }

    async getEvent(id) {
        const events = await this.getAllEvents();
        return events.find(event => event.id === id);
    }

    async saveEvent(eventData) {
        return await this.addData('events', eventData);
    }

    async updateEvent(id, eventData) {
        return await this.updateData('events', id, eventData);
    }

    async deleteEvent(id) {
        return await this.deleteData('events', id);
    }

    // Task-specific methods
    async getAllTasks() {
        return await this.getData('tasks');
    }

    async getTask(id) {
        const tasks = await this.getAllTasks();
        return tasks.find(task => task.id === id);
    }

    async saveTask(taskData) {
        taskData.subtaskIds = taskData.subtaskIds || [];
        
        return await this.addData('tasks', taskData);
    }

    async updateTask(id, taskData) {
        return await this.updateData('tasks', id, taskData);
    }

    async deleteTask(id) {
        // Delete associated subtasks
        const task = await this.getTask(id);
        if (task && task.subtaskIds) {
            for (const subtaskId of task.subtaskIds) {
                await this.deleteSubtask(subtaskId);
            }
        }
        
        // Remove task from any ideas that reference it
        const ideas = await this.getAllIdeas();
        for (const idea of ideas) {
            if (idea.taskIds && idea.taskIds.includes(id)) {
                const updatedTaskIds = idea.taskIds.filter(taskId => taskId !== id);
                await this.updateIdea(idea.id, { taskIds: updatedTaskIds });
            }
        }
        
        // Remove task from any projects that reference it
        const projects = await this.getAllProjects();
        for (const project of projects) {
            if (project.taskId && project.taskId.includes(id)) {
                const updatedTaskIds = project.taskId.filter(taskId => taskId !== id);
                await this.updateProject(project.id, { taskId: updatedTaskIds });
            }
        }
        
        return await this.deleteData('tasks', id);
    }

    async getTasksByIds(taskIds) {
        const allTasks = await this.getAllTasks();
        return allTasks.filter(task => taskIds.includes(task.id));
    }

    // Subtask-specific methods
    async getAllSubtasks() {
        return await this.getData('subtasks');
    }

    async getSubtask(id) {
        const subtasks = await this.getAllSubtasks();
        return subtasks.find(subtask => subtask.id === id);
    }

    async saveSubtask(subtaskData) {
        // Default to Analyze stage if not specified
        subtaskData.taskType = subtaskData.taskType || 'Analyze';
        
        return await this.addData('subtasks', subtaskData);
    }

    async updateSubtask(id, subtaskData) {
        // Validate lifecycle progression
        if (subtaskData.taskType) {
            const currentSubtask = await this.getSubtask(id);
            if (currentSubtask) {
                this.validateSubtaskProgression(currentSubtask.taskType, subtaskData.taskType);
            }
        }
        
        return await this.updateData('subtasks', id, subtaskData);
    }

    async deleteSubtask(id) {
        // Remove subtask from any tasks that reference it
        const tasks = await this.getAllTasks();
        for (const task of tasks) {
            if (task.subtaskIds && task.subtaskIds.includes(id)) {
                const updatedSubtaskIds = task.subtaskIds.filter(subtaskId => subtaskId !== id);
                await this.updateTask(task.id, { subtaskIds: updatedSubtaskIds });
            }
        }
        
        return await this.deleteData('subtasks', id);
    }

    async getSubtasksByIds(subtaskIds) {
        const allSubtasks = await this.getAllSubtasks();
        return allSubtasks.filter(subtask => subtaskIds.includes(subtask.id));
    }

    validateSubtaskProgression(currentType, newType) {
        const lifecycle = ['Analyze', 'Development', 'Test', 'Production'];
        const currentIndex = lifecycle.indexOf(currentType);
        const newIndex = lifecycle.indexOf(newType);
        
        if (currentIndex === -1 || newIndex === -1) {
            throw new Error(`Invalid task type. Must be one of: ${lifecycle.join(', ')}`);
        }
        
        if (newIndex < currentIndex) {
            throw new Error(`Cannot regress from ${currentType} to ${newType}. Subtask lifecycle only moves forward.`);
        }
    }

    async advanceSubtaskStage(subtaskId) {
        const subtask = await this.getSubtask(subtaskId);
        if (!subtask) {
            throw new Error(`Subtask with id ${subtaskId} not found`);
        }
        
        const lifecycle = ['Analyze', 'Development', 'Test', 'Production'];
        const currentIndex = lifecycle.indexOf(subtask.taskType);
        
        if (currentIndex === lifecycle.length - 1) {
            throw new Error('Subtask is already at the final stage (Production)');
        }
        
        const nextStage = lifecycle[currentIndex + 1];
        return await this.updateSubtask(subtaskId, { taskType: nextStage });
    }

    // Utility methods
    async exportAllData() {
        try {
            const data = {
                projects: await this.getAllProjects(),
                ideas: await this.getAllIdeas(),
                events: await this.getAllEvents(),
                tasks: await this.getAllTasks(),
                subtasks: await this.getAllSubtasks(),
                exportDate: new Date().toISOString(),
                version: '2.0'
            };
            
            return JSON.stringify(data, null, 2);
        } catch (error) {
            console.error('Error exporting data:', error);
            throw error;
        }
    }

    async importAllData(jsonData) {
        try {
            const data = typeof jsonData === 'string' ? JSON.parse(jsonData) : jsonData;
            
            if (data.projects) {
                this.cache.projects = data.projects;
                await this.saveDataFile('projects');
            }
            if (data.ideas) {
                this.cache.ideas = data.ideas;
                await this.saveDataFile('ideas');
            }
            if (data.events) {
                this.cache.events = data.events;
                await this.saveDataFile('events');
            }
            if (data.tasks) {
                this.cache.tasks = data.tasks;
                await this.saveDataFile('tasks');
            }
            if (data.subtasks) {
                this.cache.subtasks = data.subtasks;
                await this.saveDataFile('subtasks');
            }
            
            return true;
        } catch (error) {
            console.error('Error importing data:', error);
            throw error;
        }
    }

    async clearAllData() {
        try {
            Object.keys(this.cache).forEach(type => {
                this.cache[type] = [];
            });
            
            // Save empty arrays to all files
            for (const type of Object.keys(this.cache)) {
                await this.saveDataFile(type);
            }
            
            // Reset ID counters
            if (window.idGenerator) {
                window.idGenerator.resetCounters();
            }
            
            return true;
        } catch (error) {
            console.error('Error clearing data:', error);
            throw error;
        }
    }

    // Statistics methods
    async getStatistics() {
        try {
            const [projects, ideas, events, tasks, subtasks] = await Promise.all([
                this.getAllProjects(),
                this.getAllIdeas(),
                this.getAllEvents(),
                this.getAllTasks(),
                this.getAllSubtasks()
            ]);

            const taskStats = this.getTaskStatistics(tasks);
            const subtaskStats = this.getSubtaskStatistics(subtasks);

            return {
                projects: {
                    total: projects.length,
                    withTasks: projects.filter(p => p.taskId && p.taskId.length > 0).length
                },
                ideas: {
                    total: ideas.length,
                    withTasks: ideas.filter(i => i.taskIds && i.taskIds.length > 0).length
                },
                events: {
                    total: events.length,
                    upcoming: events.filter(e => new Date(e.eventDate) > new Date()).length,
                    completed: events.filter(e => e.status === 'completed').length
                },
                tasks: taskStats,
                subtasks: subtaskStats
            };
        } catch (error) {
            console.error('Error getting statistics:', error);
            return {};
        }
    }

    getTaskStatistics(tasks) {
        return {
            total: tasks.length,
            complete: tasks.filter(t => t.doneStatus === 'complete').length,
            pending: tasks.filter(t => t.doneStatus === 'pending').length,
            overdue: tasks.filter(t => t.doneStatus === 'overdue').length,
            incomplete: tasks.filter(t => t.doneStatus === 'incomplete').length,
            withSubtasks: tasks.filter(t => t.subtaskIds && t.subtaskIds.length > 0).length
        };
    }

    getSubtaskStatistics(subtasks) {
        return {
            total: subtasks.length,
            analyze: subtasks.filter(s => s.taskType === 'Analyze').length,
            development: subtasks.filter(s => s.taskType === 'Development').length,
            test: subtasks.filter(s => s.taskType === 'Test').length,
            production: subtasks.filter(s => s.taskType === 'Production').length
        };
    }

    // Migration method for localStorage data
    async migrateFromLocalStorage() {
        try {
            console.log('Starting migration from localStorage...');
            
            // Get old localStorage data
            const oldProjects = JSON.parse(localStorage.getItem('projectPlans') || '[]');
            const oldIdeas = JSON.parse(localStorage.getItem('ideaPlans') || '[]');
            const oldEvents = JSON.parse(localStorage.getItem('events') || '[]');
            const oldTasks = JSON.parse(localStorage.getItem('tasks') || '[]');

            // Transform to new schema
            const newProjects = oldProjects.map(p => ({
                id: p.id,
                topic: p.topic,
                planDueDate: p.planDueDate,
                name: p.name,
                keywords: p.keywords || [],
                ideaId: p.ideaId ? [p.ideaId] : [], // Convert to array
                eventId: p.eventId ? [p.eventId] : [], // Convert to array
                goal: p.goal,
                objective: p.objective,
                taskId: [] // New field
            }));

            const newIdeas = oldIdeas.map(i => ({
                id: i.id,
                topic: i.topic,
                planDueDate: i.planDueDate,
                name: i.name,
                keywords: i.keywords || [],
                goals: i.goals,
                objectives: i.objectives,
                taskIds: i.taskIds || []
            }));

            const newEvents = oldEvents.map(e => ({
                id: e.id,
                name: e.name,
                type: e.type,
                eventDate: e.eventDate,
                duration: e.duration,
                location: e.location,
                description: e.description,
                status: e.status || 'planning'
            }));

            const newTasks = oldTasks.map(t => ({
                id: t.id,
                name: t.name || t.taskText,
                dueDate: t.dueDate,
                doneStatus: t.doneStatus,
                notes: t.notes || '',
                subtaskIds: []
            }));

            // Save to cache
            this.cache.projects = newProjects;
            this.cache.ideas = newIdeas;
            this.cache.events = newEvents;
            this.cache.tasks = newTasks;
            this.cache.subtasks = [];

            // Save to files
            await Promise.all([
                this.saveDataFile('projects'),
                this.saveDataFile('ideas'),
                this.saveDataFile('events'),
                this.saveDataFile('tasks'),
                this.saveDataFile('subtasks')
            ]);

            console.log('Migration completed successfully');
            return true;
        } catch (error) {
            console.error('Migration failed:', error);
            throw error;
        }
    }
}

// Initialize global data manager
window.dataManager = new DataManager();