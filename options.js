// Saves options to chrome.storage
const saveOptions = () => {
    const openai_api_key = document.getElementById('openai_api_key').value;
    const openai_model = document.getElementById('openai_model').value;
    const questions_tag_id = document.getElementById('questions_tag_id').value;

    chrome.storage.sync.set(
      { openai_api_key: openai_api_key, openai_model: openai_model, questions_tag_id: questions_tag_id },
      () => {
        // Update status to let user know options were saved.
        const status = document.getElementById('status');
        status.textContent = 'Options saved.';
        setTimeout(() => {
          status.textContent = '';
        }, 750);
      }
    );
  };
  
  // Restores select box and checkbox state using the preferences
  // stored in chrome.storage.
  const restoreOptions = () => {
    chrome.storage.sync.get(
      { openai_api_key: 'put your openai api key here', openai_model: 'gpt-4', questions_tag_id: 'article'},
      (items) => {
        document.getElementById('openai_api_key').value = items.openai_api_key;
        document.getElementById('openai_model').value = items.openai_model;
        document.getElementById('questions_tag_id').value = items.questions_tag_id;
      }
    );
  };
  
  document.addEventListener('DOMContentLoaded', restoreOptions);
  document.getElementById('save').addEventListener('click', saveOptions);