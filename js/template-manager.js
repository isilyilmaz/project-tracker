class TemplateManager {
    constructor() {
        this.currentTemplate = null;
        this.templateContent = null;
        this.templateSelection = null;
    }

    init() {
        this.templateContent = document.getElementById('template-content');
        this.templateSelection = document.getElementById('template-selection');
        
        if (!this.templateContent || !this.templateSelection) {
            console.error('Template elements not found');
            return;
        }

        this.bindEvents();
        this.showTemplateSelection();
    }

    bindEvents() {
        const templateCards = document.querySelectorAll('.template-card');
        templateCards.forEach(card => {
            const btn = card.querySelector('.template-btn');
            if (btn) {
                btn.addEventListener('click', (e) => {
                    e.preventDefault();
                    const template = card.getAttribute('data-template');
                    this.selectTemplate(template);
                });
            }
        });
    }

    async selectTemplate(templateName) {
        try {
            this.currentTemplate = templateName;
            
            // Update UI to show selected template
            this.updateTemplateSelection(templateName);
            
            // Load the template content
            const content = await this.loadTemplateContent(templateName);
            this.displayTemplate(content);
            
        } catch (error) {
            console.error('Error selecting template:', error);
            this.showError('Failed to load template. Please try again.');
        }
    }

    updateTemplateSelection(templateName) {
        const templateCards = document.querySelectorAll('.template-card');
        templateCards.forEach(card => {
            card.classList.remove('selected');
            if (card.getAttribute('data-template') === templateName) {
                card.classList.add('selected');
            }
        });
    }

    async loadTemplateContent(templateName) {
        const templateFiles = {
            'project-planner': 'project-planner.html',
            'idea-planner': 'idea-planner.html',
            'event-planner': 'event-planner.html'
        };

        const fileName = templateFiles[templateName];
        if (!fileName) {
            throw new Error(`Unknown template: ${templateName}`);
        }

        const response = await fetch(`pages/${fileName}`);
        if (!response.ok) {
            throw new Error(`Failed to load template: ${response.statusText}`);
        }

        return await response.text();
    }

    displayTemplate(content) {
        if (this.templateContent) {
            this.templateContent.innerHTML = content;
            this.templateContent.style.display = 'block';
            this.templateSelection.style.display = 'none';
            
            // Initialize template-specific functionality
            this.initializeTemplateFeatures();
        }
    }

    showTemplateSelection() {
        if (this.templateContent && this.templateSelection) {
            this.templateContent.style.display = 'none';
            this.templateSelection.style.display = 'block';
            this.currentTemplate = null;
            
            // Clear any selected state
            const templateCards = document.querySelectorAll('.template-card');
            templateCards.forEach(card => {
                card.classList.remove('selected');
            });
        }
    }

    initializeTemplateFeatures() {
        if (!this.currentTemplate) return;

        switch (this.currentTemplate) {
            case 'project-planner':
                this.initializeProjectPlanner();
                break;
            case 'idea-planner':
                this.initializeIdeaPlanner();
                break;
            case 'event-planner':
                this.initializeEventPlanner();
                break;
        }
    }

    initializeProjectPlanner() {
        // Initialize keywords functionality
        this.initializeKeywords('project');
        
        // Load dropdown options
        this.loadProjectDropdowns();
        
        // Bind form submission
        const form = document.getElementById('project-planner-form');
        if (form) {
            form.addEventListener('submit', (e) => {
                e.preventDefault();
                this.handleProjectSubmission(form);
            });
        }
    }

    initializeIdeaPlanner() {
        // Initialize keywords functionality
        this.initializeKeywords('idea');
        
        // Initialize task grid
        if (window.taskGrid) {
            window.taskGrid.initialize('idea-task-grid');
        }
        
        // Bind form submission
        const form = document.getElementById('idea-planner-form');
        if (form) {
            form.addEventListener('submit', (e) => {
                e.preventDefault();
                this.handleIdeaSubmission(form);
            });
        }
    }

    initializeEventPlanner() {
        // Bind form submission
        const form = document.getElementById('event-planner-form');
        if (form) {
            form.addEventListener('submit', (e) => {
                e.preventDefault();
                this.handleEventSubmission(form);
            });
        }
    }

    initializeKeywords(type) {
        const keywordsInput = document.getElementById(`${type}-keywords`);
        const keywordTags = document.getElementById(`${type}-keyword-tags`);
        
        if (!keywordsInput || !keywordTags) return;

        // Add keyword on Enter key
        keywordsInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                e.preventDefault();
                this.addKeyword(type);
            }
        });

        // Global function for button click
        window[`add${type.charAt(0).toUpperCase() + type.slice(1)}Keyword`] = () => {
            this.addKeyword(type);
        };
    }

    addKeyword(type) {
        const input = document.getElementById(`${type}-keywords`);
        const tagsContainer = document.getElementById(`${type}-keyword-tags`);
        const hiddenInput = document.getElementById(`${type}-keywords-hidden`);
        
        if (!input || !tagsContainer) return;

        const keyword = input.value.trim();
        if (keyword === '') return;

        // Check for duplicates
        const existingTags = tagsContainer.querySelectorAll('.keyword-tag');
        const existingKeywords = Array.from(existingTags).map(tag => 
            tag.textContent.replace('×', '').trim()
        );
        
        if (existingKeywords.includes(keyword)) {
            input.value = '';
            return;
        }

        // Create keyword tag
        const tag = document.createElement('span');
        tag.className = 'keyword-tag';
        tag.innerHTML = `
            ${keyword}
            <span class="remove" onclick="this.parentElement.remove(); window.templateManager.updateKeywordsHidden('${type}')">&times;</span>
        `;
        
        tagsContainer.appendChild(tag);
        input.value = '';
        
        // Update hidden input
        this.updateKeywordsHidden(type);
    }

    updateKeywordsHidden(type) {
        const tagsContainer = document.getElementById(`${type}-keyword-tags`);
        const hiddenInput = document.getElementById(`${type}-keywords-hidden`);
        
        if (!tagsContainer || !hiddenInput) return;

        const tags = tagsContainer.querySelectorAll('.keyword-tag');
        const keywords = Array.from(tags).map(tag => 
            tag.textContent.replace('×', '').trim()
        );
        
        hiddenInput.value = JSON.stringify(keywords);
    }

    async loadProjectDropdowns() {
        try {
            // Load ideas for multi-select dropdown
            const ideas = await window.dataManager.getAllIdeas();
            const ideaSelect = document.getElementById('linked-idea');
            if (ideaSelect) {
                ideaSelect.multiple = true;
                ideaSelect.innerHTML = '';
                ideas.forEach(idea => {
                    const option = document.createElement('option');
                    option.value = idea.id;
                    option.textContent = idea.name;
                    ideaSelect.appendChild(option);
                });
            }

            // Load events for multi-select dropdown
            const events = await window.dataManager.getAllEvents();
            const eventSelect = document.getElementById('linked-event');
            if (eventSelect) {
                eventSelect.multiple = true;
                eventSelect.innerHTML = '';
                events.forEach(event => {
                    const option = document.createElement('option');
                    option.value = event.id;
                    option.textContent = event.name;
                    eventSelect.appendChild(option);
                });
            }

            // Load tasks for multi-select dropdown
            const tasks = await window.dataManager.getAllTasks();
            const taskSelect = document.getElementById('linked-task');
            if (taskSelect) {
                taskSelect.multiple = true;
                taskSelect.innerHTML = '';
                tasks.forEach(task => {
                    const option = document.createElement('option');
                    option.value = task.id;
                    option.textContent = task.name;
                    taskSelect.appendChild(option);
                });
            }
        } catch (error) {
            console.error('Error loading dropdown data:', error);
        }
    }

    async handleProjectSubmission(form) {
        try {
            const formData = new FormData(form);
            const isEditMode = window.currentEditMode === 'edit' && window.currentEditProject;
            
            // Convert single selections to arrays for new schema
            const selectedIdeaIds = this.getSelectedValues('linked-idea');
            const selectedEventIds = this.getSelectedValues('linked-event'); 
            const selectedTaskIds = this.getSelectedValues('linked-task');
            
            // Database schema: { id, topic, planDueDate, name, keywords[], ideaId[], eventId[], goal, objective, taskId[] }
            const projectData = {
                id: isEditMode ? window.currentEditProject.id : window.idGenerator.generateId('proj'),
                topic: formData.get('topic'),
                planDueDate: formData.get('planDueDate'),
                name: formData.get('name'),
                keywords: JSON.parse(formData.get('keywords') || '[]'),
                ideaId: selectedIdeaIds,
                eventId: selectedEventIds,
                goal: formData.get('goal'),
                objective: formData.get('objective'),
                taskId: selectedTaskIds
            };

            if (isEditMode) {
                await window.dataManager.updateProject(projectData.id, projectData);
                this.showSuccess('Project updated successfully!');
            } else {
                await window.dataManager.saveProject(projectData);
                this.showSuccess('Project saved successfully!');
            }
            
            // Reset form and return to appropriate page after 2 seconds
            setTimeout(() => {
                form.reset();
                if (isEditMode) {
                    // Reset edit mode flags
                    window.currentEditMode = null;
                    window.currentEditProject = null;
                    // Navigate back to all-projects page
                    window.navigateToPage('all-projects');
                } else {
                    this.showTemplateSelection();
                }
            }, 2000);
            
        } catch (error) {
            console.error('Error saving project:', error);
            this.showError('Failed to save project. Please try again.');
        }
    }

    async handleIdeaSubmission(form) {
        try {
            const formData = new FormData(form);
            const isEditMode = window.currentEditMode === 'edit' && window.currentEditIdea;
            const taskIds = window.taskGrid ? window.taskGrid.getAllTaskIds() : [];
            
            // Database schema: { id, topic, planDueDate, name, keywords[], goals, objectives, taskIds[] }
            const ideaData = {
                id: isEditMode ? window.currentEditIdea.id : window.idGenerator.generateId('idea'),
                topic: formData.get('topic'),
                planDueDate: formData.get('planDueDate'),
                name: formData.get('name'),
                keywords: JSON.parse(formData.get('keywords') || '[]'),
                goals: formData.get('goals'),
                objectives: formData.get('objectives'),
                taskIds: taskIds
            };

            if (isEditMode) {
                await window.dataManager.updateIdea(ideaData.id, ideaData);
                this.showSuccess('Idea updated successfully!');
            } else {
                await window.dataManager.saveIdea(ideaData);
                this.showSuccess('Idea saved successfully!');
            }
            
            setTimeout(() => {
                form.reset();
                if (window.taskGrid) {
                    window.taskGrid.clearAllTasks();
                }
                if (isEditMode) {
                    window.currentEditMode = null;
                    window.currentEditIdea = null;
                    window.navigateToPage('all-ideas');
                } else {
                    this.showTemplateSelection();
                }
            }, 2000);
            
        } catch (error) {
            console.error('Error saving idea:', error);
            this.showError('Failed to save idea. Please try again.');
        }
    }

    async handleEventSubmission(form) {
        try {
            const formData = new FormData(form);
            const isEditMode = window.currentEditMode === 'edit' && window.currentEditEvent;
            
            // Database schema: { id, name, type, eventDate, duration, location, description, status }
            const eventData = {
                id: isEditMode ? window.currentEditEvent.id : window.idGenerator.generateId('event'),
                name: formData.get('name'),
                type: formData.get('type'),
                eventDate: formData.get('eventDate'),
                duration: formData.get('duration'),
                location: formData.get('location'),
                description: formData.get('description'),
                status: formData.get('status') || 'planning'
            };

            if (isEditMode) {
                await window.dataManager.updateEvent(eventData.id, eventData);
                this.showSuccess('Event updated successfully!');
            } else {
                await window.dataManager.saveEvent(eventData);
                this.showSuccess('Event saved successfully!');
            }
            
            setTimeout(() => {
                form.reset();
                if (isEditMode) {
                    window.currentEditMode = null;
                    window.currentEditEvent = null;
                    window.navigateToPage('all-events');
                } else {
                    this.showTemplateSelection();
                }
            }, 2000);
            
        } catch (error) {
            console.error('Error saving event:', error);
            this.showError('Failed to save event. Please try again.');
        }
    }

    showSuccess(message) {
        this.showMessage(message, 'success');
    }

    showError(message) {
        this.showMessage(message, 'error');
    }

    showMessage(message, type) {
        // Remove existing messages
        const existingMessages = document.querySelectorAll('.template-message');
        existingMessages.forEach(msg => msg.remove());

        // Create new message
        const messageDiv = document.createElement('div');
        messageDiv.className = `template-message ${type}`;
        messageDiv.innerHTML = message;
        messageDiv.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            padding: 1rem 1.5rem;
            border-radius: 5px;
            color: white;
            font-weight: 500;
            z-index: 1000;
            ${type === 'success' ? 'background-color: #28a745;' : 'background-color: #dc3545;'}
        `;

        document.body.appendChild(messageDiv);

        // Auto-remove after 5 seconds
        setTimeout(() => {
            if (messageDiv.parentNode) {
                messageDiv.parentNode.removeChild(messageDiv);
            }
        }, 5000);
    }

    loadProjectForEdit(project) {
        // Wait for the form to be loaded
        setTimeout(() => {
            const form = document.getElementById('project-planner-form');
            if (!form) {
                console.error('Project planner form not found for editing');
                return;
            }

            // Set form mode to edit
            window.currentEditMode = 'edit';
            window.currentEditProject = project;

            // Populate form fields
            this.populateProjectForm(form, project);

            // Update form title to indicate edit mode
            const titleElement = document.querySelector('.template-title');
            if (titleElement) {
                titleElement.textContent = `Edit Project: ${project.name}`;
            }

            // Update save button text
            const saveButton = form.querySelector('button[type="submit"]');
            if (saveButton) {
                saveButton.textContent = 'Update Project';
            }

        }, 200);
    }

    populateProjectForm(form, project) {
        // Populate basic fields
        const fields = {
            'project-topic': project.topic,
            'project-due-date': project.planDueDate,
            'project-name': project.name,
            'project-description': project.generalDescription,
            'linked-idea': project.ideaId,
            'linked-event': project.eventId,
            'project-goal': project.goal,
            'project-objective': project.objective
        };

        Object.entries(fields).forEach(([fieldId, value]) => {
            const field = form.querySelector(`#${fieldId}`);
            if (field && value) {
                field.value = value;
            }
        });

        // Populate array fields (ideaId, eventId, taskId)
        if (project.ideaId) {
            this.setSelectedValues('linked-idea', project.ideaId);
        }
        if (project.eventId) {
            this.setSelectedValues('linked-event', project.eventId);
        }
        if (project.taskId) {
            this.setSelectedValues('linked-task', project.taskId);
        }

        // Populate keywords
        if (project.keywords && project.keywords.length > 0) {
            const keywordsContainer = document.getElementById('project-keyword-tags');
            const hiddenInput = document.getElementById('project-keywords-hidden');
            
            if (keywordsContainer && hiddenInput) {
                keywordsContainer.innerHTML = '';
                project.keywords.forEach(keyword => {
                    const tag = document.createElement('span');
                    tag.className = 'keyword-tag';
                    tag.innerHTML = `
                        ${keyword}
                        <span class="remove" onclick="this.parentElement.remove(); window.templateManager.updateKeywordsHidden('project')">&times;</span>
                    `;
                    keywordsContainer.appendChild(tag);
                });
                hiddenInput.value = JSON.stringify(project.keywords);
            }
        }
    }

    loadIdeaForEdit(idea) {
        setTimeout(() => {
            const form = document.getElementById('idea-planner-form');
            if (!form) {
                console.error('Idea planner form not found for editing');
                return;
            }

            window.currentEditMode = 'edit';
            window.currentEditIdea = idea;

            this.populateIdeaForm(form, idea);

            const titleElement = document.querySelector('.template-title');
            if (titleElement) {
                titleElement.textContent = `Edit Idea: ${idea.name}`;
            }

            const saveButton = form.querySelector('button[type="submit"]');
            if (saveButton) {
                saveButton.textContent = 'Update Idea';
            }

        }, 200);
    }

    populateIdeaForm(form, idea) {
        const fields = {
            'idea-topic': idea.topic,
            'idea-due-date': idea.planDueDate,
            'idea-name': idea.name,
            'idea-goals': idea.goals,
            'idea-objectives': idea.objectives
        };

        Object.entries(fields).forEach(([fieldId, value]) => {
            const field = form.querySelector(`#${fieldId}`);
            if (field && value) {
                field.value = value;
            }
        });

        if (idea.keywords && idea.keywords.length > 0) {
            const keywordsContainer = document.getElementById('idea-keyword-tags');
            const hiddenInput = document.getElementById('idea-keywords-hidden');
            
            if (keywordsContainer && hiddenInput) {
                keywordsContainer.innerHTML = '';
                idea.keywords.forEach(keyword => {
                    const tag = document.createElement('span');
                    tag.className = 'keyword-tag';
                    tag.innerHTML = `
                        ${keyword}
                        <span class="remove" onclick="this.parentElement.remove(); window.templateManager.updateKeywordsHidden('idea')">&times;</span>
                    `;
                    keywordsContainer.appendChild(tag);
                });
                hiddenInput.value = JSON.stringify(idea.keywords);
            }
        }

        if (idea.taskIds && idea.taskIds.length > 0 && window.taskGrid) {
            setTimeout(() => {
                window.taskGrid.loadTasksForEdit(idea.taskIds);
            }, 300);
        }
    }

    loadEventForEdit(event) {
        setTimeout(() => {
            const form = document.getElementById('event-planner-form');
            if (!form) {
                console.error('Event planner form not found for editing');
                return;
            }

            window.currentEditMode = 'edit';
            window.currentEditEvent = event;

            this.populateEventForm(form, event);

            const titleElement = document.querySelector('.template-title');
            if (titleElement) {
                titleElement.textContent = `Edit Event: ${event.name}`;
            }

            const saveButton = form.querySelector('button[type="submit"]');
            if (saveButton) {
                saveButton.textContent = 'Update Event';
            }

        }, 200);
    }

    populateEventForm(form, event) {
        // Only populate fields that match the new simplified schema
        const fields = {
            'event-name': event.name,
            'event-type': event.type,
            'event-date': event.eventDate,
            'event-duration': event.duration,
            'event-location': event.location,
            'event-description': event.description,
            'event-status': event.status
        };

        Object.entries(fields).forEach(([fieldId, value]) => {
            const field = form.querySelector(`#${fieldId}`);
            if (field && value) {
                field.value = value;
            }
        });
    }

    getSelectedValues(elementId) {
        const element = document.getElementById(elementId);
        if (!element) return [];
        
        if (element.multiple) {
            // Multi-select element
            return Array.from(element.selectedOptions).map(option => option.value).filter(val => val);
        } else {
            // Single select element - return as array for consistency
            return element.value ? [element.value] : [];
        }
    }

    setSelectedValues(elementId, values) {
        const element = document.getElementById(elementId);
        if (!element || !Array.isArray(values)) return;
        
        if (element.multiple) {
            // Multi-select element
            Array.from(element.options).forEach(option => {
                option.selected = values.includes(option.value);
            });
        } else {
            // Single select element - use first value
            element.value = values.length > 0 ? values[0] : '';
        }
    }
}

// Initialize template manager when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    window.templateManager = new TemplateManager();
});