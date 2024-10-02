// ==UserScript==
// @name         sa-logwork-jira
// @namespace    http://tampermonkey.net/
// @version      1.4
// @description  Inject an inline expansion for data entry to update work description in Jira, with template management, clear functionality, activity summary, and total hours input
// @author       Moayad Ismail
// @match        https://hashicorp.atlassian.net/*
// @match        https://hashicorp-sandbox-778.atlassian.net/*
// @updateURL    https://raw.githubusercontent.com/moayadi/SA-jira-automations/sa-automations-firefox/sa-logwork.meta.js
// @downloadURL  https://raw.githubusercontent.com/moayadi/SA-jira-automations/sa-automations-firefox/sa-logwork.user.js
// @grant        none
// ==/UserScript==

(function() {
    'use strict';

    function createExpandedContent() {
        const container = document.createElement('div');
        container.id = 'expanded-content';
        container.style.display = 'none';
        container.style.marginTop = '10px';

        const activities = [
            "Account Planning",
            "Content Creation",
            "Event or Conference",
            "External Meeting - Customer Sync",
            "External Meeting - Demo",
            "External Meeting - Partner",
            "External Meeting - Tech Presentation",
            "External Meeting - Workshop",
            "Internal Meeting - Customer Sync",
            "Internal Meeting - SME Program",
            "Internal Meeting - Sales Interlock",
            "Internal Meeting - SE Mentoring",
            "Internal Meeting - TFO Meeting",
            "Preparation",
            "Preparation - Demo",
            "Preparation - Workshop",
            "Research",
            "Self-Development"
        ];

        const activitiesOptions = activities.map(activity =>
            `<option value="${activity}">${activity}</option>`
        ).join('');

        container.innerHTML = `

        <form id="work-log-form">
            <label for="activities">Select Activities:</label>
           <select id="activities" name="activities" size="${activities.length}" style="width: 100%; margin-bottom: 10px;">
                    ${activitiesOptions}
            </select><br>
            <label for="activity-entries">Activity Entries:</label><br>
            <textarea id="activity-entries" name="activity-entries" rows="5" style="width: 100%; margin-bottom: 10px;"></textarea><br>
            <label for="activity-comment">Activity Comment:</label><br>
            <textarea id="activity-comment" name="activity-comment" rows="3" style="width: 100%; margin-bottom: 10px;"></textarea><br>
            <div id="config-options" style="margin-bottom: 10px;">
                <label for="default-time-format">Default time format: </label>
                <select id="default-time-format" name="default-time-format">
                    <option value="0.5h">0.5h</option>
                    <option value="1h" selected>1h</option>
                    <option value="1.5h">1.5h</option>
                    <option value="2h">2h</option>
                    <option value="30m">30m</option>
                    <option value="60m">60m</option>
                    <option value="90m">90m</option>
                    <option value="120m">120m</option>
                </select>
            </div>
            <button type="submit">Submit</button>
            <button type="button" id="cancel-expansion">Cancel</button>
            <button type="button" id="clear-fields">Clear</button>
            <button type="button" id="save-template">Save as Template</button>
            <select id="load-template" style="margin-left: 10px;">
                <option value="">Load Template</option>
            </select>
        </form>
    `;

        return container;
    }

    function handleActivitySelection() {
        const selectedActivity = this.value;
        const activityEntriesTextarea = document.getElementById('activity-entries');
        const today = new Date().toISOString().split('T')[0]; // Get today's date in YYYY-MM-DD format
        const defaultTimeFormat = localStorage.getItem('jiraDefaultTimeFormat') || '1h';

        let newEntry = `${today} : ${selectedActivity} : ${defaultTimeFormat}`;

        if (activityEntriesTextarea.value) {
            activityEntriesTextarea.value += '\n' + newEntry;
        } else {
            activityEntriesTextarea.value = newEntry;
        }

        // Reset the selection to allow the same option to be selected again
        this.selectedIndex = -1;

        // Set focus to the activity entries textarea after adding a new entry
        activityEntriesTextarea.focus();
    }

    function parseActivities(activityEntries) {
        const entries = activityEntries.split('\n');
        let totalMinutes = 0;

        entries.forEach(entry => {
            const hourMatch = entry.match(/:\s*(\d+(?:\.\d+)?)h/);
            const minuteMatch = entry.match(/:\s*(\d+)m/);

            if (hourMatch) {
                totalMinutes += parseFloat(hourMatch[1]) * 60;
            }

            if (minuteMatch) {
                totalMinutes += parseInt(minuteMatch[1]);
            }
        });

        const totalHours = totalMinutes / 60;
        return parseFloat(totalHours.toFixed(2)); // Return with 2 decimal places
    }


    function updateWorkDescription(activityEntries, activityComment) {
        const workDescription = document.getElementsByClassName("ua-firefox ProseMirror pm-table-resizing-plugin");
        if (workDescription.length > 0) {
            const totalHours = parseActivities(activityEntries);

            let updatedText = "Activity Entry:\n";
            updatedText += activityEntries.split('\n').map((entry, index, array) =>
                                                           index === array.length - 1 ? entry : entry + ','
                                                          ).join('\n');

            // Always include the Activity Comment section
            updatedText += "\n\nActivity Comment:\n";
            if (activityComment && activityComment.trim() !== "") {
                updatedText += activityComment;
            } else {
                updatedText += "No WorkLog Comment";
            }

            workDescription[0].innerText = updatedText;

            // Update the total hours input field
            updateTotalHoursInput(totalHours);
        }
    }

    function updateTotalHoursInput(totalHours) {
        console.log('Attempting to update total hours input with value:', totalHours);

        // Find the correct input field using the provided method
        function findTimeSpentInput() {
            let timeSpentHeading = Array.from(document.querySelectorAll('h2'))
            .find(el => el.textContent.trim() === 'Time spent');
            if (timeSpentHeading) {
                let inputContainer = timeSpentHeading.closest('[data-component-selector="jira-issue-field-heading-field-wrapper"]')
                .querySelector('[data-ds--text-field--container="true"]');

                if (inputContainer) {
                    return inputContainer.querySelector('input[data-ds--text-field--input="true"]');
                }
            }
            return null;
        }

        const hoursInput = findTimeSpentInput();

        if (hoursInput) {
            console.log('Found input field. Current value:', hoursInput.value);

            // Convert totalHours to Jira's format (e.g., "2h 30m" for 2.5 hours)
            const hours = Math.floor(totalHours);
            const minutes = Math.round((totalHours - hours) * 60);
            const formattedValue = hours > 0 ? `${hours}h ${minutes}m` : `${minutes}m`;

            // Set the value
            hoursInput.value = formattedValue.trim();
            hoursInput.value = "";

            // Simulate user input
            hoursInput.dispatchEvent(new Event('input', { bubbles: true }));
            hoursInput.dispatchEvent(new Event('change', { bubbles: true }));

            // Force React to update if it's a React-controlled input
            const nativeInputValueSetter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, "value").set;
            nativeInputValueSetter.call(hoursInput, formattedValue.trim());

            // Trigger React's onChange event
            hoursInput.dispatchEvent(new Event('input', { bubbles: true }));

            console.log('Updated input field value to:', formattedValue.trim());

            // Additional step: focus and blur to trigger any Jira-specific handlers
            hoursInput.focus();
            hoursInput.blur();

            // Check if the value was actually updated
            setTimeout(() => {
                console.log('Final input field value after timeout:', hoursInput.value);
            }, 100);
        } else {
            console.error('Could not find the hours input field');
        }
    }

    function saveTemplate() {
        const templateName = prompt("Enter a name for this template:");
        if (templateName) {
            const template = {
                activityEntries: document.getElementById('activity-entries').value,
                activityComment: document.getElementById('activity-comment').value
            };
            let templates = JSON.parse(localStorage.getItem('jiraTemplates') || '{}');
            templates[templateName] = template;
            localStorage.setItem('jiraTemplates', JSON.stringify(templates));
            updateTemplateList();
            console.log('Template saved:', templateName);
        }
    }

    function loadTemplate() {
        const templateName = this.value;
        if (templateName) {
            const templates = JSON.parse(localStorage.getItem('jiraTemplates') || '{}');
            const template = templates[templateName];
            if (template) {
                document.getElementById('activity-entries').value = template.activityEntries || '';
                document.getElementById('activity-comment').value = template.activityComment || '';
                console.log('Template loaded:', templateName);
            } else {
                console.error('Template not found:', templateName);
            }
            this.value = ''; // Reset the dropdown
        }
    }

    function updateTemplateList() {
        const templateSelect = document.getElementById('load-template');
        const templates = JSON.parse(localStorage.getItem('jiraTemplates') || '{}');
        templateSelect.innerHTML = '<option value="">Load Template</option>';
        for (const templateName in templates) {
            if (templates.hasOwnProperty(templateName)) {
                const option = document.createElement('option');
                option.value = templateName;
                option.textContent = templateName;
                templateSelect.appendChild(option);
            }
        }
        console.log('Template list updated');
    }


    function clearFields() {
        document.getElementById('activity-entries').value = '';
        document.getElementById('activity-comment').value = '';
        document.getElementById('activities').selectedIndex = -1;
        document.getElementById('activity-entries').focus();
    }

    function addButton() {
        const classTag = document.getElementsByClassName("_4cvr1y6m _1e0c1txw _2lx2vrvc _r1twu2gc");
        if (classTag.length > 0) {
            const p = classTag[0];

            if (!document.getElementById('expand-log-work')) {
                const expandButton = document.createElement("button");
                expandButton.id = "expand-log-work";
                expandButton.innerHTML = "Log Work";
                expandButton.style.marginRight = "10px";
                p.insertAdjacentElement("afterend", expandButton);

                const expandedContent = createExpandedContent();
                p.parentNode.insertBefore(expandedContent, p.nextSibling);

                expandButton.onclick = function() {
                    expandedContent.style.display = expandedContent.style.display === 'none' ? 'block' : 'none';
                    expandButton.innerHTML = expandedContent.style.display === 'none' ? 'Log Work' : 'Hide Log Work';
                    if (expandedContent.style.display === 'block') {
                        clearFields();
                        updateTemplateList();
                        const savedTimeFormat = localStorage.getItem('jiraDefaultTimeFormat') || '1h';
                        document.getElementById('default-time-format').value = savedTimeFormat;
                    }
                };

                document.getElementById('activities').onchange = handleActivitySelection;

                document.getElementById('default-time-format').onchange = function() {
                    localStorage.setItem('jiraDefaultTimeFormat', this.value);
                };

                document.getElementById('work-log-form').onsubmit = function(e) {
                    e.preventDefault();
                    const activityEntries = document.getElementById('activity-entries').value;
                    const activityComment = document.getElementById('activity-comment').value;
                    updateWorkDescription(activityEntries, activityComment);
                    expandedContent.style.display = 'none';
                    expandButton.innerHTML = 'Log Work';
                };

                document.getElementById('cancel-expansion').onclick = function() {
                    expandedContent.style.display = 'none';
                    expandButton.innerHTML = 'Log Work';
                };

                document.getElementById('clear-fields').onclick = clearFields;
                document.getElementById('save-template').onclick = saveTemplate;
                document.getElementById('load-template').onchange = loadTemplate;
            }
        }
    }

    // Create a MutationObserver to watch for changes in the body
    const observer = new MutationObserver(function(mutations) {
        mutations.forEach(function(mutation) {
            if (mutation.type === 'childList' && mutation.addedNodes.length > 0) {
                mutation.addedNodes.forEach(function(node) {
                    if (node.nodeType === Node.ELEMENT_NODE && node.matches('.css-1xdxiey')) {
                        addButton();
                    }
                });
            }
        });
    });

    // Start observing
    observer.observe(document.body, { childList: true, subtree: true });

    // Add the button when the script loads
    addButton();
})();