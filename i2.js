require("dotenv").config();
const express = require("express");
const cors = require("cors");
const { OpenAI } = require("openai");

// Create an Express app
const app = express();
const port = process.env.PORT || 3002;

// Use CORS middleware
app.use(cors());

// Use JSON middleware
app.use(express.json());

// Configure OpenAI API key from environment variable
const apiKey = process.env.OPENAI_API_KEY;
const openai = new OpenAI({ apiKey });

// In-memory storage for chat histories and user data
const chatHistories = {};
const userData = {};

// Function to generate a random chatId
const generateChatId = () => {
  return Math.random().toString(36).substring(2);
};

async function getCompletionFromMessages(
  messages = [],
  model = "gpt-3.5-turbo-0125",
  temperature = 0.7,
  maxTokens = 150,
  masterPrompt = "Assume that you are Darshana Perera who is the marketing manager of ABC company. And your company is a soap company which produces lix, sunlight. Provide simple short answers"
) {
  try {
    const response = await openai.chat.completions.create({
      model: model,
      messages: [
        {
          role: "system",
          content: masterPrompt,
        }, // Add master prompt as system message
        ...messages, // Include user/system messages after the master prompt
      ],
      temperature: temperature,
      max_tokens: maxTokens,
    });

    return response.choices[0].message.content;
  } catch (error) {
    console.error("Error fetching completion:", error);
    throw error;
  }
}

// Define an endpoint to get the entire chat history for a given chatId
app.get("/chatHistory/:chatId", (req, res) => {
  const { chatId } = req.params;

  // Check if chatHistory exists for the provided chatId
  if (chatHistories.hasOwnProperty(chatId)) {
    const chatHistory = chatHistories[chatId];
    res.json({ chatHistory });
  } else {
    res
      .status(404)
      .json({ error: `Chat history for chatId ${chatId} not found` });
  }
});

// Define an endpoint to get all chatIds
app.get("/chatIds", (req, res) => {
  const allChatIds = Object.keys(chatHistories);
  console.log(allChatIds);
  res.json({ chatIds: allChatIds });
});

// Define an endpoint to handle user messages and get completions
app.post("/sendMessage", async (req, res) => {
  const { chatId, message } = req.body;

  // Initialize chat history if not exists
  if (!chatHistories.hasOwnProperty(chatId)) {
    chatHistories[chatId] = [];
  }

  // Add user message to chat history
  chatHistories[chatId].push({ role: "user", content: message });

  try {
    // Get AI assistant response
    const completion = await getCompletionFromMessages(
      chatHistories[chatId],
      "gpt-3.5-turbo-0125",
      0.7,
      150,
      textareaContent
    );

    // Add assistant response to chat history
    chatHistories[chatId].push({ role: "assistant", content: completion });

    // Send response to client
    res.json({
      chatHistory: chatHistories[chatId],
      assistantResponse: completion,
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post("/sendMessagebot", async (req, res) => {
  const { chatId, message } = req.body;

  // Initialize chat history if not exists
  if (!chatHistories.hasOwnProperty(chatId)) {
    chatHistories[chatId] = [];
  }

  // Add user message to chat history
  chatHistories[chatId].push({ role: "assistant", content: message });
  res.json({
    chatHistory: chatHistories[chatId],
  });
});

app.post("/sendMessageuser", async (req, res) => {
  const { chatId, message } = req.body;

  // Initialize chat history if not exists
  if (!chatHistories.hasOwnProperty(chatId)) {
    chatHistories[chatId] = [];
  }

  // Add user message to chat history
  chatHistories[chatId].push({ role: "user", content: message });
  res.json({
    chatHistory: chatHistories[chatId],
  });
});

app.post("/sendMessagebotend", async (req, res) => {
  const { chatId } = req.body;

  // Initialize chat history if not exists
  if (!chatHistories.hasOwnProperty(chatId)) {
    chatHistories[chatId] = [];
  }

  // Add system message to chat history
  chatHistories[chatId].push({
    role: "assistant",
    content: "Automate chat continued",
  });
  res.json({
    chatHistory: chatHistories[chatId],
  });
});

app.post("/sendMessagebotstart", async (req, res) => {
  const { chatId } = req.body;

  // Initialize chat history if not exists
  if (!chatHistories.hasOwnProperty(chatId)) {
    chatHistories[chatId] = [];
  }

  // Add system message to chat history
  chatHistories[chatId].push({
    role: "assistant",
    content: "Manual chat continued",
  });
  res.json({
    chatHistory: chatHistories[chatId],
  });
});

app.post("/sendMessagetobot", async (req, res) => {
  const { chatId } = req.body;

  // Initialize chat history if not exists
  if (!chatHistories.hasOwnProperty(chatId)) {
    chatHistories[chatId] = [];
  }
  res.json({
    chatHistory: chatHistories[chatId],
  });
});

// Define UserDataStore array to store all user data
const UserDataStore = [];

// Endpoint to submit user data
app.post("/submitUserData", (req, res) => {
  const { chatId, name, number } = req.body;

  // Store user data associated with chatId
  console.log(chatId);
  userData[chatId] = { name, number };

  // Push user data to UserDataStore array
  UserDataStore.push({
    chatId,
    name,
    number,
  });

  res.status(200).json({ message: "User data saved successfully" });
});

// Define a global variable to store text area content
let textareaContent =
  "Assume that you are Darshana Perera who is the marketing manager of ABC company. And your company is a soap company which produces lix, sunlight. Provide simple short answers";

// Endpoint to store text area content
app.post("/storeTextareaContent", (req, res) => {
  const { content } = req.body;

  // Store content in global variable
  textareaContent = content;

  res.status(200).json({ message: "Text area content stored successfully" });
});
// Update the /allChatHistory endpoint to include user data
app.get("/allChatHistory", (req, res) => {
  const allChatHistories = Object.keys(chatHistories).map((chatId) => ({
    chatId,
    messages: chatHistories[chatId],
    userData: userData[chatId] || { name: "", number: "" },
  }));

  res.json({ chatHistories: allChatHistories });
});

// Define an endpoint to get user data for a given chatId
app.get("/userData/", (req, res) => {
  const { chatId } = req.params;

  // Check if userData exists for the provided chatId
  if (userData.hasOwnProperty(chatId)) {
    res.json({ userData: userData[chatId] });
  } else {
    res.status(404).json({ error: `User data for chatId ${chatId} not found` });
  }
});

// Endpoint to view all user data in UserDataStore
app.get("/viewUserData", (req, res) => {
  res.json({ userData: UserDataStore });
});
// Start the server
app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});
