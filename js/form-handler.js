class FormHandler {
    constructor() {
        this.validationRules = {
            required: (value) => value && value.trim().length > 0,
            email: (value) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value),
            date: (value) => !isNaN(Date.parse(value)),
            number: (value) => !isNaN(value) && isFinite(value),
            minLength: (value, min) => value && value.length >= min,
            maxLength: (value, max) => value && value.length <= max
        };
    }

    validateForm(form) {
        const errors = {};
        let isValid = true;

        const inputs = form.querySelectorAll('input, select, textarea');
        inputs.forEach(input => {
            const fieldErrors = this.validateField(input);
            if (fieldErrors.length > 0) {
                errors[input.name || input.id] = fieldErrors;
                isValid = false;
                this.showFieldError(input, fieldErrors[0]);
            } else {
                this.clearFieldError(input);
            }
        });

        return { isValid, errors };
    }

    validateField(field) {
        const errors = [];
        const value = field.value;
        const rules = field.dataset;

        // Required validation
        if (field.hasAttribute('required') && !this.validationRules.required(value)) {
            errors.push('This field is required');
            return errors;
        }

        // Skip other validations if field is empty and not required
        if (!value) return errors;

        // Type-specific validations
        if (field.type === 'email' && !this.validationRules.email(value)) {
            errors.push('Please enter a valid email address');
        }

        if (field.type === 'date' && !this.validationRules.date(value)) {
            errors.push('Please enter a valid date');
        }

        if (field.type === 'number' && !this.validationRules.number(value)) {
            errors.push('Please enter a valid number');
        }

        // Custom validation rules
        if (rules.minLength && !this.validationRules.minLength(value, parseInt(rules.minLength))) {
            errors.push(`Minimum length is ${rules.minLength} characters`);
        }

        if (rules.maxLength && !this.validationRules.maxLength(value, parseInt(rules.maxLength))) {
            errors.push(`Maximum length is ${rules.maxLength} characters`);
        }

        // Date range validation
        if (field.type === 'date' && rules.minDate) {
            const minDate = new Date(rules.minDate);
            const fieldDate = new Date(value);
            if (fieldDate < minDate) {
                errors.push(`Date must be after ${minDate.toLocaleDateString()}`);
            }
        }

        return errors;
    }

    showFieldError(field, message) {
        // Remove existing error
        this.clearFieldError(field);

        // Add error class
        field.classList.add('validation-error');

        // Create error message element
        const errorElement = document.createElement('div');
        errorElement.className = 'error-message';
        errorElement.textContent = message;
        errorElement.id = `${field.id || field.name}-error`;

        // Insert after field
        field.parentNode.insertBefore(errorElement, field.nextSibling);
    }

    clearFieldError(field) {
        field.classList.remove('validation-error');
        
        // Remove existing error message
        const errorId = `${field.id || field.name}-error`;
        const existingError = document.getElementById(errorId);
        if (existingError) {
            existingError.remove();
        }
    }

    clearAllErrors(form) {
        const errorElements = form.querySelectorAll('.error-message');
        errorElements.forEach(element => element.remove());

        const errorFields = form.querySelectorAll('.validation-error');
        errorFields.forEach(field => field.classList.remove('validation-error'));
    }

    serializeForm(form) {
        const formData = new FormData(form);
        const data = {};

        for (let [key, value] of formData.entries()) {
            if (data[key]) {
                // Handle multiple values (like checkboxes)
                if (Array.isArray(data[key])) {
                    data[key].push(value);
                } else {
                    data[key] = [data[key], value];
                }
            } else {
                data[key] = value;
            }
        }

        return data;
    }

    populateForm(form, data) {
        Object.keys(data).forEach(key => {
            const field = form.querySelector(`[name="${key}"], #${key}`);
            if (field) {
                if (field.type === 'checkbox' || field.type === 'radio') {
                    field.checked = data[key] === field.value || data[key] === true;
                } else if (field.tagName === 'SELECT') {
                    field.value = data[key];
                } else {
                    field.value = data[key];
                }
            }
        });
    }

    resetForm(form) {
        form.reset();
        this.clearAllErrors(form);
        
        // Clear any dynamic content like keyword tags
        const keywordTags = form.querySelectorAll('.keyword-tags');
        keywordTags.forEach(container => {
            container.innerHTML = '';
        });

        // Reset hidden inputs
        const hiddenInputs = form.querySelectorAll('input[type="hidden"]');
        hiddenInputs.forEach(input => {
            input.value = '';
        });
    }

    showSuccessMessage(message, container = null) {
        this.showMessage(message, 'success', container);
    }

    showErrorMessage(message, container = null) {
        this.showMessage(message, 'error', container);
    }

    showMessage(message, type, container = null) {
        // Remove existing messages
        const existingMessages = document.querySelectorAll(`.form-message.${type}`);
        existingMessages.forEach(msg => msg.remove());

        // Create message element
        const messageElement = document.createElement('div');
        messageElement.className = `form-message ${type}`;
        messageElement.innerHTML = message;

        // Apply styles
        messageElement.style.cssText = `
            padding: 1rem;
            margin: 1rem 0;
            border-radius: 5px;
            border-left: 4px solid;
            ${type === 'success' 
                ? 'background-color: #d4edda; color: #155724; border-color: #28a745;' 
                : 'background-color: #f8d7da; color: #721c24; border-color: #dc3545;'
            }
        `;

        // Insert message
        if (container) {
            container.insertBefore(messageElement, container.firstChild);
        } else {
            // Default to top of form
            const form = document.querySelector('form');
            if (form) {
                form.insertBefore(messageElement, form.firstChild);
            }
        }

        // Auto-remove after 5 seconds
        setTimeout(() => {
            if (messageElement.parentNode) {
                messageElement.parentNode.removeChild(messageElement);
            }
        }, 5000);
    }

    addRealTimeValidation(form) {
        const inputs = form.querySelectorAll('input, select, textarea');
        inputs.forEach(input => {
            // Validate on blur
            input.addEventListener('blur', () => {
                const errors = this.validateField(input);
                if (errors.length > 0) {
                    this.showFieldError(input, errors[0]);
                } else {
                    this.clearFieldError(input);
                }
            });

            // Clear error on input
            input.addEventListener('input', () => {
                if (input.classList.contains('validation-error')) {
                    this.clearFieldError(input);
                }
            });
        });
    }

    setupFormSubmission(formId, onSubmit) {
        const form = document.getElementById(formId);
        if (!form) {
            console.warn(`Form with id '${formId}' not found`);
            return;
        }

        // Add real-time validation
        this.addRealTimeValidation(form);

        // Handle form submission
        form.addEventListener('submit', async (e) => {
            e.preventDefault();

            // Clear previous messages
            const existingMessages = form.querySelectorAll('.form-message');
            existingMessages.forEach(msg => msg.remove());

            // Validate form
            const validation = this.validateForm(form);
            if (!validation.isValid) {
                this.showErrorMessage('Please correct the errors below.');
                return;
            }

            // Show loading state
            const submitButton = form.querySelector('button[type="submit"]');
            const originalText = submitButton.textContent;
            submitButton.textContent = 'Saving...';
            submitButton.disabled = true;

            try {
                // Call the onSubmit function
                const formData = this.serializeForm(form);
                await onSubmit(formData, form);

            } catch (error) {
                console.error('Form submission error:', error);
                this.showErrorMessage('An error occurred while saving. Please try again.');
            } finally {
                // Restore button state
                submitButton.textContent = originalText;
                submitButton.disabled = false;
            }
        });
    }

    formatFormData(data) {
        const formatted = { ...data };

        // Convert arrays from JSON strings
        Object.keys(formatted).forEach(key => {
            if (typeof formatted[key] === 'string') {
                try {
                    const parsed = JSON.parse(formatted[key]);
                    if (Array.isArray(parsed)) {
                        formatted[key] = parsed;
                    }
                } catch (e) {
                    // Not JSON, keep as string
                }
            }
        });

        return formatted;
    }

    createFormField(config) {
        const { type, name, label, required = false, placeholder = '', options = [] } = config;
        
        const fieldContainer = document.createElement('div');
        fieldContainer.className = 'form-group';

        const labelElement = document.createElement('label');
        labelElement.className = 'form-label';
        labelElement.setAttribute('for', name);
        labelElement.textContent = label;
        if (required) labelElement.innerHTML += ' <span style="color: red;">*</span>';

        let inputElement;

        switch (type) {
            case 'select':
                inputElement = document.createElement('select');
                inputElement.className = 'form-select';
                options.forEach(option => {
                    const optionElement = document.createElement('option');
                    optionElement.value = option.value;
                    optionElement.textContent = option.label;
                    inputElement.appendChild(optionElement);
                });
                break;

            case 'textarea':
                inputElement = document.createElement('textarea');
                inputElement.className = 'form-textarea';
                inputElement.rows = config.rows || 4;
                break;

            default:
                inputElement = document.createElement('input');
                inputElement.type = type;
                inputElement.className = 'form-input';
                if (placeholder) inputElement.placeholder = placeholder;
        }

        inputElement.name = name;
        inputElement.id = name;
        if (required) inputElement.required = true;

        fieldContainer.appendChild(labelElement);
        fieldContainer.appendChild(inputElement);

        return fieldContainer;
    }
}

// Initialize global form handler
window.formHandler = new FormHandler();