// Use browser-compatible axios (loaded via CDN)
const axios = window.axios;

// API Configuration
const API_KEY = 'olSqnd2Cb2pO9x1BcSJXYfXtUephHU3E';
const EXTERNAL_USER_ID = 'default_user';

// DOM Elements
const chatMessages = document.getElementById('chat-messages');
const userInput = document.getElementById('user-input');
const sendButton = document.getElementById('send-button');
const responseMode = document.getElementById('response-mode');

// State
let sessionId = null;
let isProcessing = false;

// Initialize chat
async function initializeChat() {
    try {
        addMessage('bot', "Hello! I'm your Anxiety Relief Bot. How can I help you today?");
        addMessage('bot', "You can ask me about breathing exercises, grounding techniques, or general anxiety management tips.");
        
        // Create initial session
        sessionId = await createChatSession();
        console.log('Session initialized with ID:', sessionId);
    } catch (error) {
        console.error('Error initializing chat:', error);
        addMessage('bot', "Sorry, I'm having trouble connecting. Please try again later.");
    }
}

// Create a chat session
async function createChatSession() {
    try {
        const response = await axios.post(
            'https://api.on-demand.io/chat/v1/sessions',
            {
                pluginIds: [],
                externalUserId: EXTERNAL_USER_ID
            },
            {
                headers: {
                    apikey: API_KEY
                }
            }
        );

        if (response.status === 201) {
            return response.data.data.id;
        } else {
            throw new Error(`Unexpected status code: ${response.status}`);
        }
    } catch (error) {
        console.error('Error creating chat session:', error);
        throw error;
    }
}

// Submit a query to the bot
async function submitQuery(sessionId, query, responseMode = 'sync') {
    try {
        const url = `https://api.on-demand.io/chat/v1/sessions/${sessionId}/query`;

        if (responseMode === 'sync') {
            const response = await axios.post(
                url,
                {
                    endpointId: 'predefined-openai-gpt4o',
                    query: query,
                    pluginIds: ['plugin-1712327325', 'plugin-1713962163'],
                    responseMode: responseMode,
                    reasoningMode: 'medium'
                },
                {
                    headers: {
                        apikey: API_KEY
                    }
                }
            );

            if (response.status === 200) {
                return response.data;
            } else {
                throw new Error(`Unexpected status code: ${response.status}`);
            }
        } else if (responseMode === 'stream') {
            const response = await axios.post(
                url,
                {
                    endpointId: 'predefined-openai-gpt4o',
                    query: query,
                    pluginIds: ['plugin-1712327325', 'plugin-1713962163'],
                    responseMode: responseMode,
                    reasoningMode: 'medium'
                },
                {
                    headers: {
                        apikey: API_KEY
                    },
                    responseType: 'stream'
                }
            );

            // Handle streaming response
            return new Promise((resolve, reject) => {
                let fullResponse = '';
                const messageId = addMessage('bot', '', true); // Add empty message for streaming

                response.data.on('data', (chunk) => {
                    const text = chunk.toString();
                    fullResponse += text;
                    updateMessage(messageId, fullResponse);
                });

                response.data.on('end', () => {
                    resolve({ data: { answer: fullResponse } });
                });

                response.data.on('error', (err) => {
                    console.error('Stream error:', err);
                    updateMessage(messageId, "Error receiving response. Please try again.");
                    reject(err);
                });
            });
        } else {
            throw new Error('Invalid responseMode. Use "sync" or "stream".');
        }
    } catch (error) {
        console.error('Error submitting query:', error);
        throw error;
    }
}

// Add a message to the chat
function addMessage(sender, text, isLoading = false) {
    const messageDiv = document.createElement('div');
    const messageId = 'msg-' + Date.now();
    messageDiv.id = messageId;
    messageDiv.className = `p-4 max-w-[80%] ${sender === 'user' ? 'user-message' : 'bot-message'}`;
    
    if (isLoading) {
        const spinner = document.createElement('div');
        spinner.className = 'loading-spinner';
        messageDiv.appendChild(spinner);
    } else {
        messageDiv.innerHTML = text;
    }

    chatMessages.appendChild(messageDiv);
    chatMessages.scrollTop = chatMessages.scrollHeight;
    return messageId;
}

// Update an existing message
function updateMessage(messageId, newText) {
    const messageDiv = document.getElementById(messageId);
    if (messageDiv) {
        messageDiv.innerHTML = newText;
        chatMessages.scrollTop = chatMessages.scrollHeight;
    }
}

// Show error message
function showError(message) {
    const errorDiv = document.createElement('div');
    errorDiv.className = 'text-red-400 text-sm p-2 text-center';
    errorDiv.textContent = message;
    chatMessages.appendChild(errorDiv);
    chatMessages.scrollTop = chatMessages.scrollHeight;
}

// Handle sending messages
async function handleSendMessage() {
    if (isProcessing) return;
    
    const query = userInput.value.trim();
    if (!query) return;

    isProcessing = true;
    userInput.disabled = true;
    sendButton.disabled = true;
    sendButton.innerHTML = '<i class="fas fa-spinner fa-spin"></i>';

    try {
        addMessage('user', query);
        userInput.value = '';

        const mode = responseMode.value;
        const response = await submitQuery(sessionId, query, mode);
        
        if (response && response.data && response.data.answer) {
            addMessage('bot', response.data.answer);
        }
    } catch (error) {
        console.error('Error:', error);
        showError("Sorry, I encountered an error. Please try again.");
    } finally {
        isProcessing = false;
        userInput.disabled = false;
        sendButton.disabled = false;
        sendButton.innerHTML = '<i class="fas fa-paper-plane"></i>';
        userInput.focus();
    }
}

// Event Listeners
sendButton.addEventListener('click', handleSendMessage);
userInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
        handleSendMessage();
    }
});

// Initialize the chat when the page loads
window.addEventListener('DOMContentLoaded', initializeChat);