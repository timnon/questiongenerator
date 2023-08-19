

// start when popup is loading
document.addEventListener("DOMContentLoaded", function() {
    chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
        const currentTab = tabs[0];
        chrome.scripting.executeScript({
            target: {tabId: currentTab.id},
            function: generateQuestions
        }, function(results) {
            // get questions in html
            const questions_html = results[0].result;
            // show questions
            document.getElementById('questions').innerHTML = questions_html;
            // show reveal answers button
            document.getElementById('revealButton').style.display = 'block';
        });

        async function generateQuestions(html) {

            // get stored options data
            function getStorageData(keys) {
                return new Promise((resolve, reject) => {
                    chrome.storage.sync.get(keys, function(items) {
                        if (chrome.runtime.lastError) {
                            reject(new Error(chrome.runtime.lastError));
                        } else {
                            resolve(items);
                        }
                    });
                });
            }

            async function getOptionItems(html) {
                const items = await getStorageData(['openai_api_key', 'openai_model','questions_tag_id']);

                if (Object.keys(items).length === 0) {
                    alert('Set extension options first');
                    return '';
                }
                const openai_api_key = items.openai_api_key;
                const openai_model = items.openai_model;
                const questions_tag_id = items.questions_tag_id;

                // parse content of page given questions_tag_id
                let parser = new DOMParser();
                let doc = parser.parseFromString(html, 'text/html');

                // Attempt to retrieve the element by its ID
                let element = document.getElementById(questions_tag_id);
                
                // If element with the given ID doesn't exist, get the first element with the given tag name
                if (!element) {
                    let elementsByTagName = document.getElementsByTagName(questions_tag_id);
                    if (elementsByTagName.length > 0) {
                        element = elementsByTagName[0];
                    }
                }
                
                //var articleElement = document.getElementById(questions_tag_id);
                let contentHtml = element.textContent;
                let doc2 = parser.parseFromString(contentHtml, 'text/html');
                let content = doc2.body.textContent;

                let max_length = 9000;
                if (content.length > max_length) {
                    content = content.substring(0, max_length);
                }

                example_questions = `
                1. Snowflake provides a mechanism for its customers to override its natural clustering algorithms. This method is:
                A. Micro-partitions
                B. Clustering keys (correct)
                C. Key partitions
                D. Clustered partitions

                2. Which of the following are valid Snowflake Virtual Warehouse Scaling Policies? (Choose two.)
                A. Custom
                B. Economy (correct)
                C. Optimized
                D. Standard (correct)

                3. True or False: A single database can exist in more than one Snowflake account.
                A. True
                B. False (correct)
                `
                prompt = `
                content:
                ${content}
            
                example questions:
                ${example_questions}
            
                Create three multiple choice question of the previous content in the style of the example questions:
                `

                var questions;
                try {
                    const messages = [{"role": "user", "content": prompt}];
                    const endpoint = "https://api.openai.com/v1/chat/completions";
                    const response = await fetch(endpoint, {
                        method: "POST",
                        headers: {
                            "Authorization": `Bearer ${openai_api_key}`,
                            "Content-Type": "application/json",
                        },
                        body: JSON.stringify({
                            model: openai_model,
                            messages: messages,
                            temperature: 1,
                            max_tokens: 500,
                            top_p: 1.0,
                            frequency_penalty: 0.0,
                            presence_penalty: 0.0
                        })
                    });
                    if (!response.ok) {
                        throw new Error(`HTTP error! Status: ${response.status}`);
                    }
                    const data = await response.json();
                    if (!data.choices || !data.choices[0] || !data.choices[0].message) {
                        throw new Error("Unexpected response structure from the API.");
                    }
                    questions = data.choices[0].message.content;
                } catch (error) {
                    // Handle errors here. For example, showing an alert.
                    alert(`Something went wrong with OpenAI api call: ${error.message}`);
                }
                //questions = `1. Snowflake's architecture combines elements of which two traditional database architectures? A. Shared-disk and shared-nothing (correct) B. Shared-memory and shared-storage C. Shared-nothing and shared-metadata D. Shared-database and shared-filesystem 2. Which layer of Snowflake's architecture is responsible for managing data storage? A. Query Processing B. Cloud Services C. Database Storage (correct) D. Virtual Warehouses 3. How can customers connect to the Snowflake service? A. Only through the web-based user interface B. Only through ODBC and JDBC drivers C. Only through native connectors such as Python or Spark (correct) D. Only through third-party connectors such as ETL tools or BI tools`
                
                function formatAsHtml(inputStr) {
                    const questionParts = inputStr.split(/\d+\./).filter(Boolean);
                
                    let htmlOutput = "<ol>";
                
                    questionParts.forEach((part, qIndex) => {
                        const splitAtOptions = part.split(/(?=[A-E]\.)/);
                        const question = splitAtOptions[0].trim();
                        const options = splitAtOptions.slice(1);
                
                        htmlOutput += `<br><li>${question}<ul style="list-style-type: none;"><br>`;
                
                        options.forEach((option, oIndex) => {
                            const checkboxID = `q${qIndex + 1}_opt${oIndex + 1}`;
                
                            if (option.includes("(correct)")) {
                                const cleanOption = option.replace("(correct)", "").trim();
                                htmlOutput += `<li><input type="checkbox" id="${checkboxID}" data-correct="true"> ${cleanOption}</li>`;
                            } else {
                                htmlOutput += `<li><input type="checkbox" id="${checkboxID}"> ${option.trim()}</li>`;
                            }
                        });
                
                        htmlOutput += "</ul></li>";
                    });
                    htmlOutput += "</ol>";
                    return htmlOutput;
                };

                questions_html = formatAsHtml(questions);
                return questions_html
            };
            return getOptionItems(html);
        };
    });
});



// color questions answers once reveal answers is clicked
function revealAnswers() {
    // Get all checkboxes from the DOM
    const checkboxes = document.querySelectorAll('input[type="checkbox"]');

    checkboxes.forEach(checkbox => {
        const listItem = checkbox.parentElement; // Assuming the checkbox is a direct child of the list item (li) tag
        
        // If checkbox is checked and has the attribute data-correct="true"
        if (checkbox.checked && checkbox.getAttribute('data-correct') === "true") {
            listItem.style.color = '#ace8b9';
        } 
        // If the checkbox is not checked and has the attribute data-correct="true"
        else if (!checkbox.checked && checkbox.getAttribute('data-correct') === "true") {
            listItem.style.color = '#e0b4be';
        } 
        // If the checkbox is checked and does not have the attributed data-correct="true"
        else if (checkbox.checked && !checkbox.hasAttribute('data-correct')) {
            listItem.style.color = '#e0b4be';
        } 
        // Reset the color for other cases (optional, in case you want to use the button multiple times)
        else {
            listItem.style.color = 'white';
        }
    });
};
document.addEventListener('DOMContentLoaded', function() {
    document.getElementById('revealButton').addEventListener('click', revealAnswers);
});
