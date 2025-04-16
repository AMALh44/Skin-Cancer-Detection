document.addEventListener("DOMContentLoaded", function () {
    // Upload Form Logic
    const uploadForm = document.getElementById("uploadForm");
    const fileInput = document.getElementById("fileInput");
    const previewImage = document.getElementById("previewImage");
    const resultDiv = document.getElementById("result");
    const loadingDiv = document.getElementById("loading");

    if (uploadForm) {
        fileInput.addEventListener("change", function () {
            const file = fileInput.files[0];
            if (file) {
                const reader = new FileReader();
                reader.onload = function (e) {
                    previewImage.src = e.target.result;
                    previewImage.style.display = "block";
                };
                reader.onerror = function () {
                    console.error("Error reading file for preview.");
                    previewImage.style.display = "none";
                    resultDiv.innerHTML = "<p style='color:red;'>Failed to preview image.</p>";
                };
                reader.readAsDataURL(file);
            } else {
                previewImage.style.display = "none";
                resultDiv.innerHTML = "";
            }
        });

        uploadForm.addEventListener("submit", function (event) {
            event.preventDefault();
            const file = fileInput.files[0];
            if (!file) {
                resultDiv.innerHTML = "<p style='color:red;'>Please select an image.</p>";
                return;
            }

            const formData = new FormData();
            formData.append("file", file);

            loadingDiv.style.display = "block";
            resultDiv.innerHTML = "";

            fetch("/upload", { method: "POST", body: formData })
                .then(response => {
                    if (!response.ok) {
                        throw new Error(`Server error: ${response.status}`);
                    }
                    return response.json();
                })
                .then(data => {
                    loadingDiv.style.display = "none";
                    if (data.error) {
                        resultDiv.innerHTML = `<p style='color:red;'>Error: ${data.error}</p>`;
                    } else {
                        resultDiv.innerHTML = `<p style='color:green;'>Processing the image, please wait.</p>`;
                        setTimeout(() => window.location.href = "/results", 1500);
                    }
                })
                .catch(error => {
                    loadingDiv.style.display = "none";
                    resultDiv.innerHTML = `<p style='color:red;'>Upload failed: ${error.message}</p>`;
                    console.error("Upload error:", error);
                });
        });
    }});









// Ensures the script runs after the HTML document is fully loaded and parsed.
document.addEventListener("DOMContentLoaded", function() {

    // Get references to the necessary HTML elements.
    const chatForm = document.getElementById("chatForm");
    const userInput = document.getElementById("userInput");
    const sendButton = document.getElementById("sendButton");
    const chatHistory = document.getElementById("chatHistory");
    const chatResponseStatus = document.getElementById("chatResponseStatus");

    // --- Helper Functions ---

    /**
     * Appends a message to the chat history display.
     * @param {string} sender - Who sent the message ("You" or "Bot" or "System").
     * @param {string} message - The message content.
     * @param {string} type - The CSS class for styling ('user-message', 'bot-message').
     */
    function addMessageToHistory(sender, message, type) {
        // Exit if the chat history element isn't found.
        if (!chatHistory) return;

        const messageElement = document.createElement("div");
        messageElement.classList.add("message", type); // Add base and specific type classes.

        // Create elements for sender and message content separately
        const senderElement = document.createElement("strong");
        senderElement.textContent = `${sender}:`; // Add colon for clarity

        const messageContentElement = document.createElement("span");
        // Set textContent directly - this automatically handles escaping HTML characters,
        // making it safer than innerHTML for displaying user/bot text.
        // The 'white-space: pre-wrap' CSS rule handles rendering line breaks correctly.
        messageContentElement.textContent = message;

        messageElement.appendChild(senderElement);
        messageElement.appendChild(messageContentElement); // Append message content after sender

        chatHistory.appendChild(messageElement);

        // Scroll the chat history to the latest message.
        chatHistory.scrollTop = chatHistory.scrollHeight;
    }

    /**
     * Adds a temporary "Bot is thinking..." message to the chat history.
     */
    function addLoadingMessage() {
        if (!chatHistory) return;
        // Remove any existing loading message first
        removeLoadingMessage();

        const loadingElement = document.createElement("div");
        loadingElement.classList.add("loading-message"); // Use class for styling
        loadingElement.id = "loadingIndicator"; // ID to easily find and remove it
        loadingElement.textContent = "Bot is thinking...";
        chatHistory.appendChild(loadingElement);
        chatHistory.scrollTop = chatHistory.scrollHeight; // Scroll down
    }

    /**
     * Removes the "Bot is thinking..." message from the chat history.
     */
    function removeLoadingMessage() {
        const loadingIndicator = document.getElementById("loadingIndicator");
        if (loadingIndicator) {
            loadingIndicator.remove();
        }
    }

    // --- Main Chat Logic ---

    /**
     * Handles sending the user's query to the backend and displaying the response.
     */
    async function sendQuery() {
        // Get the trimmed user input.
        const query = userInput.value.trim();
        chatResponseStatus.textContent = ''; // Clear previous status/error messages.

        // Do nothing if the input is empty.
        if (!query) {
            // Optionally provide feedback, e.g., shake the input box
            // chatResponseStatus.textContent = "Please type a message.";
            return;
        }

        // 1. Add the user's message to the chat history.
        addMessageToHistory("You", query, "user-message");

        // 2. Clear the input field for the next message.
        userInput.value = "";

        // 3. Show a loading indicator in the chat.
        addLoadingMessage();
        sendButton.disabled = true; // Prevent multiple submissions.

        try {
            // 4. Send the query to the Flask backend endpoint '/chat'.
            const response = await fetch("/chat", { // Ensure this URL matches your Flask route
                method: "POST",
                headers: {
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({ message: query }) // Send the query in JSON format.
            });

            // 5. Remove the loading indicator now that we have a response (or error).
            removeLoadingMessage();

            const data = await response.json(); // Attempt to parse the JSON response body.

            // Check if the HTTP response status indicates success (e.g., 200 OK).
            if (!response.ok) {
                // If not OK, use the error message from the backend JSON if available,
                // otherwise construct a generic error message.
                const errorMsg = data.response || `Error: ${response.status} ${response.statusText}`;
                throw new Error(errorMsg); // Throw an error to be caught below.
            }

            // 6. If successful, add the bot's response to the chat history.
            addMessageToHistory("Bot", data.response, "bot-message");

        } catch (error) {
            // 7. If any error occurred (network issue, server error, etc.).
            console.error("Chat Error:", error); // Log the detailed error to the console.
            // Display a user-friendly error message in the chat history or status area.
            addMessageToHistory("System", `Sorry, an error occurred: ${error.message}`, "bot-message"); // Show error as a system/bot message
            // chatResponseStatus.textContent = `Error: ${error.message}`; // Or show in the status area
        } finally {
            // 8. This block always runs, whether there was an error or not.
            sendButton.disabled = false; // Re-enable the send button.
            userInput.focus(); // Set focus back to the input field for convenience.
        }
    }

    // --- Event Listeners ---

    // Check if all required elements exist before adding listeners.
    if (chatForm && userInput && sendButton && chatHistory) {

        // Add listener for the form submission (e.g., pressing Enter in the input).
        chatForm.addEventListener("submit", function (event) {
            event.preventDefault(); // Prevent the default form submission (which causes a page reload).
            sendQuery(); // Call the function to handle sending the query.
        });

        // Note: A separate 'click' listener for the button is often redundant
        // if the button's type="submit" and it's inside the form. The form's 'submit'
        // event handles both Enter key and button click in most browsers.
        // If your button was type="button", you would need this:
        // sendButton.addEventListener("click", sendQuery);

    } else {
        // Log an error to the console if any essential elements are missing.
        console.error("Chatbot UI elements not found. Chat functionality may be broken.");
        if (!chatForm) console.error("Element with ID 'chatForm' not found.");
        if (!userInput) console.error("Element with ID 'userInput' not found.");
        if (!sendButton) console.error("Element with ID 'sendButton' not found.");
        if (!chatHistory) console.error("Element with ID 'chatHistory' not found.");
    }

}); // End of DOMContentLoaded listener







async function fetchAIExplanation(disease) {
    document.getElementById("loading").style.display = "block";
    document.getElementById("ai-explanation-text").textContent = "";
    document.getElementById("error-message").textContent = "";

    try {
        const response = await fetch("/get_explanation", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ disease_name: disease })
        });

        const data = await response.json();
        document.getElementById("loading").style.display = "none";

        if (data.response) {
            document.getElementById("ai-explanation-text").textContent = data.response;
        } else {
            document.getElementById("error-message").textContent = "No explanation available.";
        }
    } catch (error) {
        document.getElementById("loading").style.display = "none";
        document.getElementById("error-message").textContent = "Error fetching AI response.";
    }
}










