class SubtaskDetailManager {
    constructor() {
        this.currentSubtask = null;
        this.currentSubtaskId = null;
        this.currentTaskId = null;
        this.parentTask = null;
        this.editingCommentId = null;
    }

    async init(subtaskId, taskId) {
        this.currentSubtaskId = subtaskId;
        this.currentTaskId = taskId;
        
        try {
            this.currentSubtask = await window.dataManager.getSubtask(subtaskId);
            if (!this.currentSubtask) {
                throw new Error('Subtask not found');
            }
            
            this.parentTask = await window.dataManager.getTask(taskId);
            if (!this.parentTask) {
                throw new Error('Parent task not found');
            }
            
            this.renderSubtaskDetails();
            this.renderStatus();
            this.renderEfforts();
            this.renderComments();
            this.bindEvents();
            this.setTodaysDate();
            
        } catch (error) {
            console.error('Error initializing subtask detail:', error);
            this.showError('Failed to load subtask details');
        }
    }

    renderSubtaskDetails() {
        if (!this.currentSubtask) return;

        document.getElementById('subtask-title').textContent = `Subtask: ${this.currentSubtask.name}`;
        document.getElementById('subtask-name').textContent = this.currentSubtask.name;
        document.getElementById('parent-task-name').textContent = this.parentTask?.name || '-';
        document.getElementById('subtask-created-at').textContent = this.currentSubtask.createdAt ?
            new Date(this.currentSubtask.createdAt).toLocaleString() : '-';
        document.getElementById('subtask-updated-at').textContent = this.currentSubtask.updatedAt ?
            new Date(this.currentSubtask.updatedAt).toLocaleString() : '-';
        document.getElementById('subtask-description').textContent = this.currentSubtask.description || '-';
    }

    renderStatus() {
        if (!this.currentSubtask) return;
        
        const currentStatus = this.currentSubtask.status;
        const statusStart = document.getElementById('status-start');
        const statusDone = document.getElementById('status-done');
        
        statusStart.checked = currentStatus === 'start';
        statusDone.checked = currentStatus === 'done';
    }

    async updateStatus() {
        const selectedStatus = document.querySelector('input[name="status"]:checked')?.value;
        
        if (!selectedStatus || selectedStatus === this.currentSubtask.status) {
            return;
        }

        try {
            this.currentSubtask.status = selectedStatus;
            this.currentSubtask.updatedAt = new Date().toISOString();
            
            await window.dataManager.updateSubtask(this.currentSubtaskId, this.currentSubtask);
            
            this.renderSubtaskDetails();
            this.showSuccess(`Status updated to: ${selectedStatus}`);
            
        } catch (error) {
            console.error('Error updating subtask status:', error);
            this.showError('Failed to update status');
        }
    }

    setTodaysDate() {
        const today = new Date().toISOString().split('T')[0];
        document.getElementById('effort-date').value = today;
    }

    bindEvents() {
        // Effort form
        const effortForm = document.getElementById('effort-form');
        if (effortForm) {
            effortForm.addEventListener('submit', (e) => {
                e.preventDefault();
                this.handleAddEffort(effortForm);
            });
        }

        // Comment form
        const commentForm = document.getElementById('comment-form');
        if (commentForm) {
            commentForm.addEventListener('submit', (e) => {
                e.preventDefault();
                this.handleAddComment(commentForm);
            });
        }

        // Edit comment form
        const editCommentForm = document.getElementById('edit-comment-form');
        if (editCommentForm) {
            editCommentForm.addEventListener('submit', (e) => {
                e.preventDefault();
                this.handleEditComment(editCommentForm);
            });
        }
    }

    async handleAddEffort(form) {
        try {
            const effortInput = this.validateEffortInput(form);
            if (!effortInput) return;

            const effortData = this.createEffortData(effortInput);
            await this.saveEffort(effortData);
            
            this.resetEffortForm(form);
            this.updateEffortUI();
            this.showSuccess('Effort logged successfully');
            
        } catch (error) {
            console.error('Error adding effort:', error);
            this.showError('Failed to log effort');
        }
    }

    validateEffortInput(form) {
        const formData = new FormData(form);
        const hours = this.parseTimeValue(formData.get('hours'));
        const minutes = this.parseTimeValue(formData.get('minutes'));
        const date = formData.get('date');
        const notes = this.sanitizeEffortNotes(formData.get('notes')?.trim() || '');

        // Validate time input
        if (!this.isValidTimeInput(hours, minutes)) {
            this.showError('Please enter valid hours (0-24) or minutes (0-59)');
            return null;
        }

        if (hours === 0 && minutes === 0) {
            this.showError('Please enter hours or minutes');
            return null;
        }

        // Validate date
        if (!date) {
            this.showError('Please select a date');
            return null;
        }

        if (!this.isValidDate(date)) {
            this.showError('Please select a valid date');
            return null;
        }

        // Validate notes length
        if (notes.length > 500) {
            this.showError('Notes are too long (maximum 500 characters)');
            return null;
        }

        return {
            hours,
            minutes,
            date,
            notes,
            totalHours: this.calculateTotalHours(hours, minutes)
        };
    }

    parseTimeValue(value) {
        const parsed = parseFloat(value || 0);
        return isNaN(parsed) ? 0 : Math.max(0, parsed);
    }

    isValidTimeInput(hours, minutes) {
        return hours >= 0 && hours <= 24 && minutes >= 0 && minutes <= 59;
    }

    isValidDate(dateString) {
        const date = new Date(dateString);
        const today = new Date();
        const oneYearAgo = new Date(today.getFullYear() - 1, today.getMonth(), today.getDate());
        const oneYearFromNow = new Date(today.getFullYear() + 1, today.getMonth(), today.getDate());
        
        return date instanceof Date && !isNaN(date) && 
               date >= oneYearAgo && date <= oneYearFromNow;
    }

    calculateTotalHours(hours, minutes) {
        return hours + (minutes / 60);
    }

    sanitizeEffortNotes(notes) {
        // Basic text sanitization
        return notes
            .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
            .replace(/<[^>]*>/g, '')
            .trim();
    }

    createEffortData(effortInput) {
        return {
            id: window.idGenerator.generateId('effort'),
            hours: effortInput.totalHours,
            date: effortInput.date,
            notes: effortInput.notes,
            createdAt: new Date().toISOString()
        };
    }

    async saveEffort(effortData) {
        this.currentSubtask.efforts = this.currentSubtask.efforts || [];
        this.currentSubtask.efforts.push(effortData);
        this.currentSubtask.updatedAt = new Date().toISOString();
        
        await window.dataManager.updateSubtask(this.currentSubtaskId, this.currentSubtask);
    }

    resetEffortForm(form) {
        form.reset();
        this.setTodaysDate();
        // Focus on hours input for better UX
        const hoursInput = form.querySelector('#effort-hours');
        if (hoursInput) {
            setTimeout(() => hoursInput.focus(), 100);
        }
    }

    updateEffortUI() {
        this.renderEfforts();
        this.renderSubtaskDetails();
    }

    formatTimeDisplay(hours) {
        const wholeHours = Math.floor(hours);
        const minutes = Math.round((hours - wholeHours) * 60);
        return wholeHours > 0 ? `${wholeHours}h ${minutes}m` : `${minutes}m`;
    }

    renderEfforts() {
        const effortList = document.getElementById('effort-list');
        const emptyEfforts = document.getElementById('empty-efforts');
        const totalEffortSpan = document.getElementById('total-effort');
        
        const efforts = this.currentSubtask.efforts || [];
        
        if (efforts.length === 0) {
            emptyEfforts.style.display = 'block';
            totalEffortSpan.textContent = '0h 0m';
            return;
        }
        
        emptyEfforts.style.display = 'none';
        
        // Calculate total effort
        const totalHours = efforts.reduce((sum, effort) => sum + effort.hours, 0);
        totalEffortSpan.textContent = this.formatTimeDisplay(totalHours);
        
        // Render efforts
        const effortsHTML = efforts
            .sort((a, b) => new Date(b.date) - new Date(a.date))
            .map(effort => {
                const timeText = this.formatTimeDisplay(effort.hours);
                
                return `
                    <div class="effort-item" data-effort-id="${effort.id}">
                        <div class="effort-info">
                            <div class="effort-time">${timeText}</div>
                            <div class="effort-date">${new Date(effort.date).toLocaleDateString()}</div>
                            ${effort.notes ? `<div class="effort-notes">${effort.notes}</div>` : ''}
                        </div>
                        <button class="btn-icon btn-danger" onclick="window.subtaskDetailManager.deleteEffort('${effort.id}')" title="Delete">
                            🗑️
                        </button>
                    </div>
                `;
            }).join('');
        
        const existingEfforts = effortList.querySelectorAll('.effort-item');
        existingEfforts.forEach(item => item.remove());
        
        effortList.insertAdjacentHTML('beforeend', effortsHTML);
    }

    async deleteEffort(effortId) {
        if (!confirm('Delete this time entry?')) {
            return;
        }

        try {
            this.currentSubtask.efforts = this.currentSubtask.efforts.filter(e => e.id !== effortId);
            this.currentSubtask.updatedAt = new Date().toISOString();
            
            await window.dataManager.updateSubtask(this.currentSubtaskId, this.currentSubtask);
            
            this.renderEfforts();
            this.renderSubtaskDetails();
            this.showSuccess('Time entry deleted');
            
        } catch (error) {
            console.error('Error deleting effort:', error);
            this.showError('Failed to delete time entry');
        }
    }

    async handleAddComment(form) {
        try {
            const commentText = this.validateCommentInput(form);
            if (!commentText) return;

            const commentData = this.createCommentData(commentText);
            await this.saveComment(commentData);
            
            this.resetCommentForm(form);
            this.updateCommentUI();
            this.showSuccess('Comment added successfully');
            
        } catch (error) {
            console.error('Error adding comment:', error);
            this.showError('Failed to add comment');
        }
    }

    validateCommentInput(form) {
        const formData = new FormData(form);
        const text = formData.get('text')?.trim();

        if (!text) {
            this.showError('Please enter a comment');
            return null;
        }

        if (text.length > 1000) {
            this.showError('Comment is too long (maximum 1000 characters)');
            return null;
        }

        return this.sanitizeCommentText(text);
    }

    sanitizeCommentText(text) {
        // Basic text sanitization - remove potentially harmful characters
        return text
            .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
            .replace(/<[^>]*>/g, '')
            .trim();
    }

    createCommentData(text) {
        return {
            id: window.idGenerator.generateId('comment'),
            text: text,
            createdAt: new Date().toISOString()
        };
    }

    async saveComment(commentData) {
        this.currentSubtask.comments = this.currentSubtask.comments || [];
        this.currentSubtask.comments.push(commentData);
        this.currentSubtask.updatedAt = new Date().toISOString();
        
        await window.dataManager.updateSubtask(this.currentSubtaskId, this.currentSubtask);
    }

    resetCommentForm(form) {
        form.reset();
        // Focus back to comment textarea for better UX
        const textarea = form.querySelector('textarea');
        if (textarea) {
            setTimeout(() => textarea.focus(), 100);
        }
    }

    updateCommentUI() {
        this.renderComments();
        this.renderSubtaskDetails();
    }

    renderComments() {
        const commentsContainer = document.getElementById('comments-container');
        const emptyComments = document.getElementById('empty-comments');
        
        const comments = this.currentSubtask.comments || [];
        
        if (comments.length === 0) {
            emptyComments.style.display = 'block';
            return;
        }
        
        emptyComments.style.display = 'none';
        
        const commentsHTML = comments
            .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
            .map(comment => `
                <div class="comment-item" data-comment-id="${comment.id}">
                    <div class="comment-content">
                        <div class="comment-text">${comment.text}</div>
                        <div class="comment-meta">
                            ${new Date(comment.createdAt).toLocaleString()}
                        </div>
                    </div>
                    <div class="comment-actions">
                        <button class="btn-icon" onclick="window.subtaskDetailManager.editComment('${comment.id}')" title="Edit">
                            ✏️
                        </button>
                        <button class="btn-icon btn-danger" onclick="window.subtaskDetailManager.deleteComment('${comment.id}')" title="Delete">
                            🗑️
                        </button>
                    </div>
                </div>
            `).join('');
        
        const existingComments = commentsContainer.querySelectorAll('.comment-item');
        existingComments.forEach(item => item.remove());
        
        commentsContainer.insertAdjacentHTML('beforeend', commentsHTML);
    }

    editComment(commentId) {
        const comment = this.currentSubtask.comments.find(c => c.id === commentId);
        if (!comment) return;
        
        this.editingCommentId = commentId;
        document.getElementById('edit-comment-text').value = comment.text;
        document.getElementById('edit-comment-modal').style.display = 'block';
    }

    closeCommentModal() {
        document.getElementById('edit-comment-modal').style.display = 'none';
        document.getElementById('edit-comment-form').reset();
        this.editingCommentId = null;
    }

    async handleEditComment(form) {
        try {
            const formData = new FormData(form);
            const text = formData.get('text')?.trim();

            if (!text) {
                this.showError('Please enter a comment');
                return;
            }

            const comment = this.currentSubtask.comments.find(c => c.id === this.editingCommentId);
            if (!comment) {
                this.showError('Comment not found');
                return;
            }

            comment.text = text;
            this.currentSubtask.updatedAt = new Date().toISOString();
            
            await window.dataManager.updateSubtask(this.currentSubtaskId, this.currentSubtask);
            
            this.closeCommentModal();
            this.renderComments();
            this.renderSubtaskDetails();
            this.showSuccess('Comment updated successfully');
            
        } catch (error) {
            console.error('Error updating comment:', error);
            this.showError('Failed to update comment');
        }
    }

    async deleteComment(commentId) {
        if (!confirm('Delete this comment?')) {
            return;
        }

        try {
            this.currentSubtask.comments = this.currentSubtask.comments.filter(c => c.id !== commentId);
            this.currentSubtask.updatedAt = new Date().toISOString();
            
            await window.dataManager.updateSubtask(this.currentSubtaskId, this.currentSubtask);
            
            this.renderComments();
            this.renderSubtaskDetails();
            this.showSuccess('Comment deleted');
            
        } catch (error) {
            console.error('Error deleting comment:', error);
            this.showError('Failed to delete comment');
        }
    }

    goBackToTask() {
        window.navigateToPage('task-detail', { taskId: this.currentTaskId });
    }

    editSubtask() {
        // TODO: Implement subtask editing
        this.showError('Edit functionality not implemented yet');
    }

    async deleteSubtask() {
        if (!confirm('Are you sure you want to delete this subtask?')) {
            return;
        }

        try {
            await window.dataManager.deleteSubtask(this.currentSubtaskId);
            
            // Update parent task's subtaskIds
            this.parentTask.subtaskIds = this.parentTask.subtaskIds.filter(id => id !== this.currentSubtaskId);
            this.parentTask.updatedAt = new Date().toISOString();
            
            await window.dataManager.updateTask(this.currentTaskId, this.parentTask);
            
            this.showSuccess('Subtask deleted successfully');
            
            // Navigate back to task
            setTimeout(() => {
                this.goBackToTask();
            }, 1500);
            
        } catch (error) {
            console.error('Error deleting subtask:', error);
            this.showError('Failed to delete subtask');
        }
    }

    async saveChanges() {
        try {
            await window.dataManager.updateSubtask(this.currentSubtaskId, this.currentSubtask);
            this.showSuccess('Changes saved successfully');
        } catch (error) {
            console.error('Error saving changes:', error);
            this.showError('Failed to save changes');
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
        const existingMessages = document.querySelectorAll('.detail-message');
        existingMessages.forEach(msg => msg.remove());

        // Create new message
        const messageDiv = document.createElement('div');
        messageDiv.className = `detail-message ${type}`;
        messageDiv.textContent = message;
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
}

// Initialize when page loads
document.addEventListener('DOMContentLoaded', () => {
    window.subtaskDetailManager = new SubtaskDetailManager();
});