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
        
        // Initialize click outside handler for dropdowns
        this.initializeDropdownOutsideClick();
        
        // Bind form submission
        const form = document.getElementById('project-planner-form');
        if (form) {
            form.addEventListener('submit', (e) => {
                e.preventDefault();
                this.handleProjectSubmission(form);
            });
        }
    }

    initializeDropdownOutsideClick() {
        document.addEventListener('click', (event) => {
            const isDropdownClick = event.target.closest('.custom-dropdown');
            if (!isDropdownClick) {
                // Close all dropdowns
                const allDropdowns = document.querySelectorAll('.dropdown-content');
                const allTriggers = document.querySelectorAll('.dropdown-trigger');
                
                allDropdowns.forEach(dd => dd.classList.remove('active'));
                allTriggers.forEach(trigger => trigger.classList.remove('active'));
            }
        });
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
        // Initialize resources functionality (like keywords)
        this.initializeResources();
        
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

    initializeResources() {
        const resourcesInput = document.getElementById('event-resources');
        const resourceTags = document.getElementById('event-resource-tags');
        
        if (!resourcesInput || !resourceTags) return;

        // Add resource on Enter key
        resourcesInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                e.preventDefault();
                this.addResource();
            }
        });

        // Global function for button click
        window.addEventResource = () => {
            this.addResource();
        };
    }

    addResource() {
        const input = document.getElementById('event-resources');
        const tagsContainer = document.getElementById('event-resource-tags');
        const hiddenInput = document.getElementById('event-resources-hidden');
        
        if (!input || !tagsContainer) return;

        const resource = input.value.trim();
        if (resource === '') return;

        // Check for duplicates
        const existingTags = tagsContainer.querySelectorAll('.keyword-tag');
        const existingResources = Array.from(existingTags).map(tag => 
            tag.textContent.replace('×', '').trim()
        );
        
        if (existingResources.includes(resource)) {
            input.value = '';
            return;
        }

        // Create resource tag
        const tag = document.createElement('span');
        tag.className = 'keyword-tag';
        tag.innerHTML = `
            ${resource}
            <span class="remove" onclick="this.parentElement.remove(); window.templateManager.updateResourcesHidden()">&times;</span>
        `;
        
        tagsContainer.appendChild(tag);
        input.value = '';
        
        // Update hidden input
        this.updateResourcesHidden();
    }

    updateResourcesHidden() {
        const tagsContainer = document.getElementById('event-resource-tags');
        const hiddenInput = document.getElementById('event-resources-hidden');
        
        if (!tagsContainer || !hiddenInput) return;

        const tags = tagsContainer.querySelectorAll('.keyword-tag');
        const resources = Array.from(tags).map(tag => 
            tag.textContent.replace('×', '').trim()
        );
        
        hiddenInput.value = JSON.stringify(resources);
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
            // Store reference to ideas, events and tasks data for filtering
            this.allIdeas = await window.dataManager.getAllIdeas();
            this.allEvents = await window.dataManager.getAllEvents();
            this.allTasks = await window.dataManager.getAllTasks();
            
            // Initialize selected arrays
            this.selectedIdeas = this.selectedIdeas || [];
            this.selectedEvents = this.selectedEvents || [];
            
            // Load enhanced dropdowns
            this.loadIdeasDropdown();
            this.loadEventsDropdown();

            // Initialize tasks grid (initially empty with helper text)
            this.initializeProjectTasksGrid();
            
        } catch (error) {
            console.error('Error loading dropdown data:', error);
        }
    }

    initializeProjectTasksGrid() {
        const gridBody = document.getElementById('project-tasks-grid-body');
        if (gridBody) {
            gridBody.innerHTML = `
                <div class="empty-tasks-message">
                    <p>Select ideas first to see related tasks</p>
                </div>
            `;
        }
    }

    loadIdeasDropdown() {
        const optionsContainer = document.getElementById('ideas-options');
        if (!optionsContainer || !this.allIdeas) return;
        
        this.selectedIdeas = this.selectedIdeas || [];
        optionsContainer.innerHTML = '';
        
        if (this.allIdeas.length === 0) {
            optionsContainer.innerHTML = '<div class="dropdown-option-empty">No ideas available</div>';
            return;
        }
        
        this.allIdeas.forEach(idea => {
            const isSelected = this.selectedIdeas.some(selected => selected.id === idea.id);
            
            const optionElement = document.createElement('div');
            optionElement.className = `dropdown-option ${isSelected ? 'selected' : ''}`;
            optionElement.onclick = () => this.toggleItemSelection('ideas', idea);
            
            optionElement.innerHTML = `
                <div class="dropdown-option-info">
                    <div class="dropdown-option-name">${idea.name}</div>
                    <div class="dropdown-option-meta">
                        Due: ${idea.planDueDate ? new Date(idea.planDueDate).toLocaleDateString() : 'No date'}
                        ${idea.keywords && idea.keywords.length > 0 ? ` • ${idea.keywords.length} keywords` : ''}
                    </div>
                </div>
                ${isSelected ? '<span class="dropdown-option-check">✓</span>' : ''}
            `;
            
            optionsContainer.appendChild(optionElement);
        });
    }

    loadEventsDropdown() {
        const optionsContainer = document.getElementById('events-options');
        if (!optionsContainer || !this.allEvents) return;
        
        this.selectedEvents = this.selectedEvents || [];
        optionsContainer.innerHTML = '';
        
        if (this.allEvents.length === 0) {
            optionsContainer.innerHTML = '<div class="dropdown-option-empty">No events available</div>';
            return;
        }
        
        this.allEvents.forEach(event => {
            const isSelected = this.selectedEvents.some(selected => selected.id === event.id);
            
            const optionElement = document.createElement('div');
            optionElement.className = `dropdown-option ${isSelected ? 'selected' : ''}`;
            optionElement.onclick = () => this.toggleItemSelection('events', event);
            
            optionElement.innerHTML = `
                <div class="dropdown-option-info">
                    <div class="dropdown-option-name">${event.name}</div>
                    <div class="dropdown-option-meta">
                        ${event.eventDate ? new Date(event.eventDate).toLocaleDateString() : 'No date'}
                        • ${event.type || 'No type'} • ${event.status || 'No status'}
                    </div>
                </div>
                ${isSelected ? '<span class="dropdown-option-check">✓</span>' : ''}
            `;
            
            optionsContainer.appendChild(optionElement);
        });
    }

    toggleItemSelection(type, item) {
        if (type === 'ideas') {
            const index = this.selectedIdeas.findIndex(selected => selected.id === item.id);
            if (index >= 0) {
                this.selectedIdeas.splice(index, 1);
            } else {
                this.selectedIdeas.push(item);
            }
            this.loadIdeasDropdown();
            this.updateSelectedDisplay('ideas');
            this.updateSelectedInputs('ideas');
            this.renderProjectTasksGrid();
        } else if (type === 'events') {
            const index = this.selectedEvents.findIndex(selected => selected.id === item.id);
            if (index >= 0) {
                this.selectedEvents.splice(index, 1);
            } else {
                this.selectedEvents.push(item);
            }
            this.loadEventsDropdown();
            this.updateSelectedDisplay('events');
            this.updateSelectedInputs('events');
        }
    }

    updateSelectedDisplay(type) {
        const displayContainer = document.getElementById(`selected-${type}-display`);
        if (!displayContainer) return;
        
        const selectedItems = type === 'ideas' ? this.selectedIdeas : this.selectedEvents;
        
        if (selectedItems.length === 0) {
            displayContainer.innerHTML = `
                <div class="selected-items-empty">
                    No ${type} selected
                </div>
            `;
            return;
        }
        
        displayContainer.innerHTML = selectedItems.map(item => this.renderSelectedItemCard(type, item)).join('');
    }

    renderSelectedItemCard(type, item) {
        if (type === 'ideas') {
            return `
                <div class="selected-item-card" data-id="${item.id}">
                    <div class="selected-item-header">
                        <div>
                            <div class="selected-item-name">${item.name}</div>
                            <div class="selected-item-meta">Due: ${item.planDueDate ? new Date(item.planDueDate).toLocaleDateString() : 'No date'}</div>
                        </div>
                        <button class="selected-item-remove" onclick="window.templateManager.removeSelectedItem('ideas', '${item.id}')">×</button>
                    </div>
                    <div class="selected-item-details">
                        ${item.goals ? `<div><strong>Goals:</strong> ${item.goals}</div>` : ''}
                        ${item.objectives ? `<div><strong>Objectives:</strong> ${item.objectives}</div>` : ''}
                        ${item.keywords && item.keywords.length > 0 ? `
                            <div class="selected-item-keywords">
                                ${item.keywords.map(keyword => `<span class="selected-item-keyword">${keyword}</span>`).join('')}
                            </div>
                        ` : ''}
                    </div>
                </div>
            `;
        } else {
            return `
                <div class="selected-item-card" data-id="${item.id}">
                    <div class="selected-item-header">
                        <div>
                            <div class="selected-item-name">${item.name}</div>
                            <div class="selected-item-meta">
                                ${item.eventDate ? new Date(item.eventDate).toLocaleDateString() : 'No date'}
                                • ${item.type || 'No type'}
                            </div>
                        </div>
                        <button class="selected-item-remove" onclick="window.templateManager.removeSelectedItem('events', '${item.id}')">×</button>
                    </div>
                    <div class="selected-item-details">
                        ${item.location ? `<div><strong>Location:</strong> ${item.location}</div>` : ''}
                        ${item.description ? `<div><strong>Description:</strong> ${item.description}</div>` : ''}
                        <span class="selected-item-status status-${item.status || 'scheduled'}">${item.status || 'scheduled'}</span>
                    </div>
                </div>
            `;
        }
    }

    removeSelectedItem(type, itemId) {
        if (type === 'ideas') {
            this.selectedIdeas = this.selectedIdeas.filter(item => item.id !== itemId);
            this.loadIdeasDropdown();
            this.updateSelectedDisplay('ideas');
            this.updateSelectedInputs('ideas');
            this.renderProjectTasksGrid();
        } else if (type === 'events') {
            this.selectedEvents = this.selectedEvents.filter(item => item.id !== itemId);
            this.loadEventsDropdown();
            this.updateSelectedDisplay('events');
            this.updateSelectedInputs('events');
        }
    }

    updateSelectedInputs(type) {
        const input = document.getElementById(`selected-${type}-input`);
        if (!input) return;
        
        const selectedItems = type === 'ideas' ? this.selectedIdeas : this.selectedEvents;
        const ids = selectedItems.map(item => item.id);
        input.value = ids.join(',');
    }

    createTaskRow(task) {
        const row = document.createElement('div');
        row.className = 'task-grid-row';
        row.setAttribute('data-task-id', task.id);
        
        // Format due date
        const dueDate = task.dueDate ? new Date(task.dueDate).toLocaleDateString() : 'No date';
        
        // Create status badge
        const statusClass = `status-${task.doneStatus?.replace(/_/g, '-') || 'unknown'}`;
        const statusText = task.doneStatus?.replace(/_/g, ' ') || 'Unknown';
        
        row.innerHTML = `
            <div class="grid-cell">
                <input type="checkbox" class="task-checkbox" name="linked-task" value="${task.id}">
            </div>
            <div class="grid-cell">
                <div class="task-name">${task.name}</div>
            </div>
            <div class="grid-cell">
                <div class="task-status">
                    <span class="status-badge ${statusClass}">${statusText}</span>
                </div>
            </div>
            <div class="grid-cell">
                <div class="task-due-date">${dueDate}</div>
            </div>
        `;
        
        // Add double-click handler for task detail
        row.addEventListener('dblclick', () => {
            if (window.templateManager && typeof window.templateManager.openTaskDetail === 'function') {
                window.templateManager.openTaskDetail(task.id);
            }
        });
        
        return row;
    }

    renderProjectTasksGrid() {
        const gridBody = document.getElementById('project-tasks-grid-body');
        
        if (!gridBody || !this.allTasks) {
            return;
        }

        // Get selected idea IDs from our enhanced dropdown
        const selectedIdeaIds = this.selectedIdeas ? this.selectedIdeas.map(idea => idea.id) : [];
        
        // Store currently selected task IDs to preserve them
        const currentlySelectedTaskIds = this.getSelectedTaskIds();
        
        // Also include any pre-existing task IDs from project being edited
        const existingTaskIds = window.currentEditProject?.taskId || [];
        
        if (selectedIdeaIds.length === 0 && existingTaskIds.length === 0) {
            // No ideas selected and no existing tasks, show helper text
            gridBody.innerHTML = `
                <div class="empty-tasks-message">
                    <p>Select ideas above to see related tasks</p>
                </div>
            `;
            return;
        }
        
        // Find all tasks that belong to the selected ideas
        const relevantTaskIds = new Set();
        
        // Add tasks from selected ideas
        if (this.allIdeas) {
            selectedIdeaIds.forEach(ideaId => {
                const idea = this.allIdeas.find(i => i.id === ideaId);
                if (idea && idea.taskIds) {
                    idea.taskIds.forEach(taskId => relevantTaskIds.add(taskId));
                }
            });
        }
        
        // Add any existing project task IDs
        existingTaskIds.forEach(taskId => relevantTaskIds.add(taskId));
        
        // Filter tasks
        const relevantTasks = this.allTasks.filter(task => relevantTaskIds.has(task.id));
        
        if (relevantTasks.length === 0) {
            gridBody.innerHTML = `
                <div class="empty-tasks-message">
                    <p>No tasks found for selected ideas</p>
                </div>
            `;
            return;
        }
        
        // Clear grid and add tasks
        gridBody.innerHTML = '';
        relevantTasks.forEach(task => {
            const row = this.createTaskRow(task);
            gridBody.appendChild(row);
        });
        
        // Restore previously selected task checkboxes
        setTimeout(() => {
            currentlySelectedTaskIds.forEach(taskId => {
                const checkbox = gridBody.querySelector(`input[value="${taskId}"]`);
                if (checkbox) {
                    checkbox.checked = true;
                }
            });
            
            // Also check any existing project task IDs
            const existingTaskIds = window.currentEditProject?.taskId || [];
            existingTaskIds.forEach(taskId => {
                const checkbox = gridBody.querySelector(`input[value="${taskId}"]`);
                if (checkbox) {
                    checkbox.checked = true;
                }
            });
        }, 10);
    }

    getStatusDisplay(status) {
        const statusMap = {
            'ready_to_analyze': 'Ready to Analyze',
            'complete_analyze': 'Complete Analyze',
            'ready_to_development': 'Ready to Development', 
            'complete_development': 'Complete Development',
            'ready_to_test': 'Ready to Test',
            'test_done': 'Test Done',
            'ready_to_production': 'Ready to Production',
            'production_done': 'Production Done'
        };
        return statusMap[status] || status;
    }

    getSelectedTaskIds() {
        const checkboxes = document.querySelectorAll('#project-tasks-grid-body .task-checkbox:checked');
        return Array.from(checkboxes).map(checkbox => checkbox.value);
    }

    openTaskDetail(taskId) {
        // Pass context about the source page for better back navigation
        window.navigateToPage('task-detail', { 
            taskId: taskId, 
            sourcePage: 'project-planner' 
        });
    }

    async handleProjectSubmission(form) {
        try {
            const formData = new FormData(form);
            const isEditMode = window.currentEditMode === 'edit' && window.currentEditProject;
            
            // Get selected items from hidden inputs
            const selectedIdeaIds = formData.get('ideaId')?.split(',').filter(id => id.trim()) || [];
            const selectedEventIds = formData.get('eventId')?.split(',').filter(id => id.trim()) || []; 
            
            // Get selected task IDs from checkboxes
            const selectedTaskIds = Array.from(document.querySelectorAll('input[name="linked-task"]:checked'))
                .map(checkbox => checkbox.value);
            
            // Project data structure
            const now = new Date().toISOString();
            const projectData = {
                id: isEditMode ? window.currentEditProject.id : window.idGenerator.generateId('proj'),
                topic: formData.get('topic'),
                planDueDate: formData.get('planDueDate'),
                name: formData.get('name'),
                keywords: JSON.parse(formData.get('keywords') || '[]'),
                ideaId: selectedIdeaIds,
                eventId: selectedEventIds,
                generalDescription: formData.get('generalDescription') || '',
                goal: formData.get('goal') || '',
                objective: formData.get('objective') || '',
                taskId: selectedTaskIds,
                createdAt: isEditMode ? window.currentEditProject.createdAt : now,
                updatedAt: now
            };

            if (isEditMode) {
                await window.dataManager.updateProject(projectData.id, projectData);
            } else {
                await window.dataManager.saveProject(projectData);
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
            
            // Get IDs of already saved tasks from the grid
            let taskIds = [];
            if (window.taskGrid) {
                taskIds = window.taskGrid.getSavedTaskIds();
                console.log(`Linking ${taskIds.length} saved tasks to idea`);
            }
            
            // Idea data structure
            const now = new Date().toISOString();
            const ideaData = {
                id: isEditMode ? window.currentEditIdea.id : window.idGenerator.generateId('idea'),
                topic: formData.get('topic'),
                planDueDate: formData.get('planDueDate'),
                name: formData.get('name'),
                keywords: JSON.parse(formData.get('keywords') || '[]'),
                goals: formData.get('goals') || '',
                objectives: formData.get('objectives') || '',
                taskIds: taskIds,
                createdAt: isEditMode ? window.currentEditIdea.createdAt : now,
                updatedAt: now
            };

            if (isEditMode) {
                await window.dataManager.updateIdea(ideaData.id, ideaData);
            } else {
                await window.dataManager.saveIdea(ideaData);
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
            
            // Event data structure
            const now = new Date().toISOString();
            const eventData = {
                id: isEditMode ? window.currentEditEvent.id : window.idGenerator.generateId('event'),
                name: formData.get('name'),
                type: formData.get('type'),
                eventDate: formData.get('eventDate'),
                duration: parseFloat(formData.get('duration')) || 0,
                location: formData.get('location') || '',
                description: formData.get('description') || '',
                status: formData.get('status') || 'planning',
                createdAt: isEditMode ? window.currentEditEvent.createdAt : now,
                updatedAt: now,
                budget: parseFloat(formData.get('budget')) || 0,
                organizer: formData.get('organizer') || '',
                resources: JSON.parse(formData.get('resources') || '[]'),
                agenda: formData.get('agenda') || ''
            };

            if (isEditMode) {
                await window.dataManager.updateEvent(eventData.id, eventData);
            } else {
                await window.dataManager.saveEvent(eventData);
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

        // Load project data into enhanced dropdowns
        setTimeout(() => {
            this.loadExistingProjectData(project);
        }, 100);

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
        // Populate all event fields including new ones
        const fields = {
            'event-name': event.name,
            'event-type': event.type,
            'event-date': event.eventDate,
            'event-duration': event.duration,
            'event-location': event.location,
            'event-description': event.description,
            'event-status': event.status,
            'event-budget': event.budget,
            'event-organizer': event.organizer,
            'event-agenda': event.agenda
        };

        Object.entries(fields).forEach(([fieldId, value]) => {
            const field = form.querySelector(`#${fieldId}`);
            if (field && value) {
                field.value = value;
            }
        });

        // Populate resources
        if (event.resources && event.resources.length > 0) {
            const resourcesContainer = document.getElementById('event-resource-tags');
            const hiddenInput = document.getElementById('event-resources-hidden');
            
            if (resourcesContainer && hiddenInput) {
                resourcesContainer.innerHTML = '';
                event.resources.forEach(resource => {
                    const tag = document.createElement('span');
                    tag.className = 'keyword-tag';
                    tag.innerHTML = `
                        ${resource}
                        <span class="remove" onclick="this.parentElement.remove(); window.templateManager.updateResourcesHidden()">&times;</span>
                    `;
                    resourcesContainer.appendChild(tag);
                });
                hiddenInput.value = JSON.stringify(event.resources);
            }
        }
    }

    getSelectedValues(elementId) {
        // Special handling for task grid
        if (elementId === 'linked-task') {
            return this.getSelectedTaskIds();
        }
        
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
        // Special handling for task grid
        if (elementId === 'linked-task') {
            this.setSelectedTaskIds(values);
            return;
        }
        
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

    setSelectedTaskIds(taskIds) {
        const checkboxes = document.querySelectorAll('#project-tasks-grid-body .task-checkbox');
        checkboxes.forEach(checkbox => {
            checkbox.checked = taskIds.includes(checkbox.value);
        });
    }

    toggleDropdown(type) {
        const dropdown = document.getElementById(`${type}-dropdown`);
        const content = document.getElementById(`${type}-dropdown-content`);
        const trigger = dropdown?.querySelector('.dropdown-trigger');
        
        if (!dropdown || !content || !trigger) return;
        
        // Close other dropdowns first
        const allDropdowns = document.querySelectorAll('.dropdown-content');
        const allTriggers = document.querySelectorAll('.dropdown-trigger');
        
        allDropdowns.forEach(dd => {
            if (dd.id !== `${type}-dropdown-content`) {
                dd.classList.remove('active');
            }
        });
        
        allTriggers.forEach(trig => {
            if (trig !== trigger) {
                trig.classList.remove('active');
            }
        });
        
        // Toggle current dropdown
        const isActive = content.classList.contains('active');
        
        if (isActive) {
            content.classList.remove('active');
            trigger.classList.remove('active');
        } else {
            content.classList.add('active');
            trigger.classList.add('active');
        }
    }

    filterDropdownOptions(type, searchValue) {
        const optionsContainer = document.getElementById(`${type}-options`);
        if (!optionsContainer) return;
        
        const options = optionsContainer.querySelectorAll('.dropdown-option');
        const search = searchValue.toLowerCase().trim();
        
        options.forEach(option => {
            const name = option.querySelector('.dropdown-option-name')?.textContent.toLowerCase() || '';
            const meta = option.querySelector('.dropdown-option-meta')?.textContent.toLowerCase() || '';
            
            if (name.includes(search) || meta.includes(search)) {
                option.style.display = 'flex';
            } else {
                option.style.display = 'none';
            }
        });
    }

    removeSelectedItem(type, itemId) {
        const selectedArray = type === 'ideas' ? 'selectedIdeas' : 'selectedEvents';
        
        if (!this[selectedArray]) {
            this[selectedArray] = [];
        }
        
        // Remove from selected array
        this[selectedArray] = this[selectedArray].filter(item => item.id !== itemId);
        
        // Update display
        this.updateSelectedDisplay(type);
        
        // Update hidden input
        const hiddenInput = document.getElementById(`selected-${type}-input`);
        if (hiddenInput) {
            const selectedIds = this[selectedArray].map(item => item.id);
            hiddenInput.value = selectedIds.join(',');
        }
        
        // Update dropdown option state
        const option = document.querySelector(`#${type}-options .dropdown-option[data-item-id="${itemId}"]`);
        if (option) {
            option.classList.remove('selected');
            const checkmark = option.querySelector('.dropdown-option-check');
            if (checkmark) {
                checkmark.style.display = 'none';
            }
        }
        
        // Re-render tasks grid if this is ideas
        if (type === 'ideas') {
            this.renderProjectTasksGrid();
        }
    }

    loadExistingProjectData(project) {
        if (!project) return;
        
        // Load existing idea selections
        if (project.ideaId && project.ideaId.length > 0 && this.allIdeas) {
            this.selectedIdeas = project.ideaId.map(ideaId => 
                this.allIdeas.find(idea => idea.id === ideaId)
            ).filter(Boolean);
            
            this.loadIdeasDropdown();
            this.updateSelectedDisplay('ideas');
            this.updateSelectedInputs('ideas');
        }
        
        // Load existing event selections
        if (project.eventId && project.eventId.length > 0 && this.allEvents) {
            this.selectedEvents = project.eventId.map(eventId => 
                this.allEvents.find(event => event.id === eventId)
            ).filter(Boolean);
            
            this.loadEventsDropdown();
            this.updateSelectedDisplay('events');
            this.updateSelectedInputs('events');
        }
        
        // Re-render task grid with existing data
        this.renderProjectTasksGrid();
    }
}

// Initialize template manager when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    // Global dropdown functions
    window.toggleDropdown = (type) => {
        if (window.templateManager) {
            window.templateManager.toggleDropdown(type);
        }
    };

    window.filterDropdownOptions = (type, searchValue) => {
        if (window.templateManager) {
            window.templateManager.filterDropdownOptions(type, searchValue);
        }
    };

    window.templateManager = new TemplateManager();
});