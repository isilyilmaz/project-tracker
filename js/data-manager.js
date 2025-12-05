class DataManager {
    constructor() {
        this.storageKeys = {
            projects: 'projectPlans',
            ideas: 'ideaPlans',
            events: 'events',
            tasks: 'tasks'
        };
        this.initializeStorage();
    }

    initializeStorage() {
        // Initialize empty arrays if no data exists
        Object.values(this.storageKeys).forEach(key => {
            if (!localStorage.getItem(key)) {
                localStorage.setItem(key, JSON.stringify([]));
            }
        });
    }

    // Generic storage methods
    async getData(type) {
        try {
            const key = this.storageKeys[type];
            if (!key) throw new Error(`Unknown data type: ${type}`);
            
            const data = localStorage.getItem(key);
            return data ? JSON.parse(data) : [];
        } catch (error) {
            console.error(`Error getting ${type} data:`, error);
            return [];
        }
    }

    async saveData(type, data) {
        try {
            const key = this.storageKeys[type];
            if (!key) throw new Error(`Unknown data type: ${type}`);
            
            localStorage.setItem(key, JSON.stringify(data));
            return true;
        } catch (error) {
            console.error(`Error saving ${type} data:`, error);
            throw error;
        }
    }

    async addData(type, item) {
        try {
            const currentData = await this.getData(type);
            currentData.push(item);
            await this.saveData(type, currentData);
            return item;
        } catch (error) {
            console.error(`Error adding ${type}:`, error);
            throw error;
        }
    }

    async updateData(type, id, updatedItem) {
        try {
            const currentData = await this.getData(type);
            const index = currentData.findIndex(item => item.id === id);
            
            if (index === -1) {
                throw new Error(`${type} with id ${id} not found`);
            }
            
            currentData[index] = { ...currentData[index], ...updatedItem };
            await this.saveData(type, currentData);
            return currentData[index];
        } catch (error) {
            console.error(`Error updating ${type}:`, error);
            throw error;
        }
    }

    async deleteData(type, id) {
        try {
            const currentData = await this.getData(type);
            const filteredData = currentData.filter(item => item.id !== id);
            
            if (filteredData.length === currentData.length) {
                throw new Error(`${type} with id ${id} not found`);
            }
            
            await this.saveData(type, filteredData);
            return true;
        } catch (error) {
            console.error(`Error deleting ${type}:`, error);
            throw error;
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
        return await this.addData('ideas', ideaData);
    }

    async updateIdea(id, ideaData) {
        return await this.updateData('ideas', id, ideaData);
    }

    async deleteIdea(id) {
        // Also delete associated tasks
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
        return await this.addData('tasks', taskData);
    }

    async updateTask(id, taskData) {
        return await this.updateData('tasks', id, taskData);
    }

    async deleteTask(id) {
        // Remove task from any ideas that reference it
        const ideas = await this.getAllIdeas();
        for (const idea of ideas) {
            if (idea.taskIds && idea.taskIds.includes(id)) {
                const updatedTaskIds = idea.taskIds.filter(taskId => taskId !== id);
                await this.updateIdea(idea.id, { taskIds: updatedTaskIds });
            }
        }
        
        return await this.deleteData('tasks', id);
    }

    async getTasksByIds(taskIds) {
        const allTasks = await this.getAllTasks();
        return allTasks.filter(task => taskIds.includes(task.id));
    }

    // Utility methods
    async exportAllData() {
        try {
            const data = {
                projects: await this.getAllProjects(),
                ideas: await this.getAllIdeas(),
                events: await this.getAllEvents(),
                tasks: await this.getAllTasks(),
                exportDate: new Date().toISOString()
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
            
            if (data.projects) await this.saveData('projects', data.projects);
            if (data.ideas) await this.saveData('ideas', data.ideas);
            if (data.events) await this.saveData('events', data.events);
            if (data.tasks) await this.saveData('tasks', data.tasks);
            
            return true;
        } catch (error) {
            console.error('Error importing data:', error);
            throw error;
        }
    }

    async clearAllData() {
        try {
            Object.values(this.storageKeys).forEach(key => {
                localStorage.setItem(key, JSON.stringify([]));
            });
            
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

    // Search methods
    async searchProjects(query, filters = {}) {
        const projects = await this.getAllProjects();
        return this.filterAndSearch(projects, query, filters);
    }

    async searchIdeas(query, filters = {}) {
        const ideas = await this.getAllIdeas();
        return this.filterAndSearch(ideas, query, filters);
    }

    async searchTasks(query, filters = {}) {
        const tasks = await this.getAllTasks();
        return this.filterAndSearch(tasks, query, filters);
    }

    filterAndSearch(data, query, filters) {
        let filtered = data;

        // Apply filters
        if (filters.status) {
            filtered = filtered.filter(item => item.status === filters.status);
        }
        
        if (filters.dateFrom) {
            filtered = filtered.filter(item => 
                new Date(item.planDueDate || item.eventDate || item.dueDate) >= new Date(filters.dateFrom)
            );
        }
        
        if (filters.dateTo) {
            filtered = filtered.filter(item => 
                new Date(item.planDueDate || item.eventDate || item.dueDate) <= new Date(filters.dateTo)
            );
        }

        // Apply search query
        if (query && query.trim()) {
            const searchTerm = query.toLowerCase();
            filtered = filtered.filter(item => {
                const searchableText = [
                    item.name,
                    item.topic,
                    item.description,
                    item.generalDescription,
                    item.goals,
                    item.objectives,
                    ...(item.keywords || [])
                ].join(' ').toLowerCase();
                
                return searchableText.includes(searchTerm);
            });
        }

        return filtered;
    }

    // Statistics methods
    async getStatistics() {
        try {
            const [projects, ideas, events, tasks] = await Promise.all([
                this.getAllProjects(),
                this.getAllIdeas(),
                this.getAllEvents(),
                this.getAllTasks()
            ]);

            const taskStats = this.getTaskStatistics(tasks);

            return {
                projects: {
                    total: projects.length,
                    active: projects.filter(p => p.status !== 'completed').length,
                    completed: projects.filter(p => p.status === 'completed').length
                },
                ideas: {
                    total: ideas.length
                },
                events: {
                    total: events.length,
                    upcoming: events.filter(e => new Date(e.eventDate) > new Date()).length,
                    completed: events.filter(e => e.status === 'completed').length
                },
                tasks: taskStats
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
            incomplete: tasks.filter(t => t.doneStatus === 'incomplete').length
        };
    }
}

// Initialize global data manager
window.dataManager = new DataManager();