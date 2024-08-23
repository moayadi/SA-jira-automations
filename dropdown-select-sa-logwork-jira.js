// ==UserScript==
// @name         inline-data-entry-sa-logwork-jira-with-summary
// @namespace    http://tampermonkey.net/
// @version      1.4
// @description  Inject an inline expansion for data entry to update work description in Jira, with template management, clear functionality, and activity summary
// @author       Moayad Ismail (modified by Assistant)
// @match        https://hashicorp.atlassian.net/*
// @match        https://hashicorp-sandbox-778.atlassian.net/*
// @grant        none
// ==/UserScript==

(function() {
    'use strict';

    function createExpandedContent() {
        const container = document.createElement('div');
        container.id = 'expanded-content';
        container.style.display = 'none';
        container.style.marginTop = '10px';

        container.innerHTML = `
            <form id="work-log-form">
                <label for="activities">Select Activities:</label>
                <select id="activities" name="activities" size="10" style="width: 100%; margin-bottom: 10px;">
                    <option value="Account Planning">Account Planning</option>
                    <option value="Content Creation">Content Creation</option>
                    <option value="Event or Conference">Event or Conference</option>
                    <option value="External Meeting - Customer Sync">External Meeting - Customer Sync</option>
                    <option value="External Meeting - Demo">External Meeting - Demo</option>
                    <option value="External Meeting - Partner">External Meeting - Partner</option>
                    <option value="External Meeting - Tech Presentation">External Meeting - Tech Presentation</option>
                    <option value="External Meeting - Workshop">External Meeting - Workshop</option>
                    <option value="Internal Meeting - Customer Sync">Internal Meeting - Customer Sync</option>
                    <option value="Internal Meeting - Sales Interlock">Internal Meeting - Sales Interlock</option>
                    <option value="Internal Meeting - SE Mentoring">Internal Meeting - SE Mentoring</option>
                    <option value="Internal Meeting - TFO Meeting">Internal Meeting - TFO Meeting</option>
                    <option value="Preparation">Preparation</option>
                    <option value="Preparation - Demo">Preparation - Demo</option>
                    <option value="Preparation - Workshop">Preparation - Workshop</option>
                    <option value="Research">Research</option>
                    <option value="Self-Development">Self-Development</option>
                </select><br>
                <label for="activity-entries">Activity Entries:</label><br>
                <textarea id="activity-entries" name="activity-entries" rows="5" style="width: 100%; margin-bottom: 10px;"></textarea><br>
                <label for="activity-comment">Activity Comment:</label><br>
                <textarea id="activity-comment" name="activity-comment" rows="3" style="width: 100%; margin-bottom: 10px;"></textarea><br>
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

        let newEntry = `${today} : ${selectedActivity} : 1h`;

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
        let totalHours = 0;

        entries.forEach(entry => {
            const match = entry.match(/:\s*(\d+(?:\.\d+)?)h/);
            if (match) {
                totalHours += parseFloat(match[1]);
            }
        });

        return totalHours;
    }

    function updateWorkDescription(activityEntries, activityComment) {
        const workDescription = document.getElementsByClassName("ua-chrome ProseMirror pm-table-resizing-plugin");
        if (workDescription.length > 0) {
            const totalHours = parseActivities(activityEntries);

            let updatedText = `Activity Logged: Total Hours: ${totalHours}h, Comment: ${activityComment}\n\n`;
            updatedText += "Activity Entry:\n";
            updatedText += activityEntries.split('\n').map((entry, index, array) =>
                index === array.length - 1 ? entry : entry + ','
            ).join('\n');

            if (activityComment) {
                updatedText += "\n\nActivity Comment:\n" + activityComment;
            }

            workDescription[0].innerText = updatedText;
        }
    }

    function saveTemplate() {
        const templateName = prompt("Enter a name for this template:");
        if (templateName) {
            const template = {
                activityEntries: document.getElementById('activity-entries').value,
                activityComment: document.getElementById('activity-comment').value
            };
            const templates = JSON.parse(localStorage.getItem('jiraTemplates') || '{}');
            templates[templateName] = template;
            localStorage.setItem('jiraTemplates', JSON.stringify(templates));
            updateTemplateList();
        }
    }

    function loadTemplate() {
        const templateName = this.value;
        if (templateName) {
            const templates = JSON.parse(localStorage.getItem('jiraTemplates') || '{}');
            const template = templates[templateName];
            if (template) {
                document.getElementById('activity-entries').value = template.activityEntries;
                document.getElementById('activity-comment').value = template.activityComment;
            }
            this.value = ''; // Reset the dropdown
        }
    }

    function updateTemplateList() {
        const templateSelect = document.getElementById('load-template');
        const templates = JSON.parse(localStorage.getItem('jiraTemplates') || '{}');
        templateSelect.innerHTML = '<option value="">Load Template</option>';
        for (const templateName in templates) {
            const option = document.createElement('option');
            option.value = templateName;
            option.textContent = templateName;
            templateSelect.appendChild(option);
        }
    }

    function clearFields() {
        document.getElementById('activity-entries').value = '';
        document.getElementById('activity-comment').value = '';
        document.getElementById('activities').selectedIndex = -1;
        document.getElementById('activity-entries').focus();
    }

    function addButton() {
        // const classTag = document.getElementsByClassName("_14nx1u4f _s1t41u4f _13pa1440 _nopz1440 _1fr61440 _uqy11440 _1e0c1txw _4cvr1h6o _1n261q9c _1bah1yb4 _19pk1y44");
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
                    }
                };

                document.getElementById('activities').onchange = handleActivitySelection;

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