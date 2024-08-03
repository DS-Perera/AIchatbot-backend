require("dotenv").config();
const express = require("express");
const cors = require("cors");
const { OpenAI } = require("openai");
const fs = require("fs");
const path = require("path");

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

// Paths to the files storing chat IDs, user data, and chat histories
const chatIdsFilePath = path.join(__dirname, "chatIds.json");
const userDataFilePath = path.join(__dirname, "userData.json");
const chatHistoriesFilePath = path.join(__dirname, "chatHistories.json");

// Function to generate a random chatId
const generateChatId = () => {
  return Math.random().toString(36).substring(2);
};

// Read chat IDs from the file when the server starts
let allChatIds = [];
if (fs.existsSync(chatIdsFilePath)) {
  const data = fs.readFileSync(chatIdsFilePath, "utf-8");
  allChatIds = JSON.parse(data);
  allChatIds.forEach((chatId) => {
    chatHistories[chatId] = [];
    userData[chatId] = {};
  });
} else {
  fs.writeFileSync(chatIdsFilePath, JSON.stringify([]));
}

// Read chat histories from the file when the server starts
let allChatHistories = [];
if (fs.existsSync(chatHistoriesFilePath)) {
  const data = fs.readFileSync(chatHistoriesFilePath, "utf-8");
  allChatHistories = JSON.parse(data);
  allChatHistories.forEach((chat) => {
    chatHistories[chat.chatId] = chat.messages;
    userData[chat.chatId] = chat.userData;
  });
} else {
  fs.writeFileSync(chatHistoriesFilePath, JSON.stringify([]));
}

// Function to save chat IDs to the file
const saveChatIdsToFile = () => {
  fs.writeFileSync(chatIdsFilePath, JSON.stringify(allChatIds));
};

// Function to save chat histories to the file
const saveChatHistoriesToFile = () => {
  const allChatHistories = Object.keys(chatHistories).map((chatId) => ({
    chatId,
    messages: chatHistories[chatId],
    userData: userData[chatId] || { name: "", number: "" },
  }));
  fs.writeFileSync(chatHistoriesFilePath, JSON.stringify(allChatHistories));
};

// Initialize UserDataStore from a file if it exists
let UserDataStore = [];
if (fs.existsSync(userDataFilePath)) {
  const data = fs.readFileSync(userDataFilePath, "utf-8");
  UserDataStore = JSON.parse(data);
  UserDataStore.forEach((user) => {
    userData[user.chatId] = { name: user.name, number: user.number };
  });
} else {
  fs.writeFileSync(userDataFilePath, JSON.stringify([]));
}

// Function to save UserDataStore to a file
const saveUserDataToFile = () => {
  fs.writeFileSync(userDataFilePath, JSON.stringify(UserDataStore));
};

// Initialize counters
let totalMessagesSent = 0;
let manualMessagesEnabledCount = 0;

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
  res.json({ chatIds: allChatIds });
});

// Define an endpoint to handle user messages and get completions
app.post("/sendMessage", async (req, res) => {
  const { chatId, message } = req.body;

  // Initialize chat history if not exists
  if (!chatHistories.hasOwnProperty(chatId)) {
    chatHistories[chatId] = [];
    allChatIds.push(chatId);
    saveChatIdsToFile();
  }

  // Add user message to chat history
  chatHistories[chatId].push({ role: "user", content: message });
  totalMessagesSent++;

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

    // Save updated chat histories to file
    saveChatHistoriesToFile();

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
    allChatIds.push(chatId);
    saveChatIdsToFile();
  }

  // Add user message to chat history
  chatHistories[chatId].push({ role: "assistant", content: message });
  totalMessagesSent++;

  // Save updated chat histories to file
  saveChatHistoriesToFile();

  res.json({
    chatHistory: chatHistories[chatId],
  });
});

app.post("/sendMessageuser", async (req, res) => {
  const { chatId, message } = req.body;

  // Initialize chat history if not exists
  if (!chatHistories.hasOwnProperty(chatId)) {
    chatHistories[chatId] = [];
    allChatIds.push(chatId);
    saveChatIdsToFile();
  }

  // Add user message to chat history
  chatHistories[chatId].push({ role: "user", content: message });
  totalMessagesSent++;

  // Save updated chat histories to file
  saveChatHistoriesToFile();

  res.json({
    chatHistory: chatHistories[chatId],
  });
});

app.post("/sendMessagebotend", async (req, res) => {
  const { chatId } = req.body;

  // Initialize chat history if not exists
  if (!chatHistories.hasOwnProperty(chatId)) {
    chatHistories[chatId] = [];
    allChatIds.push(chatId);
    saveChatIdsToFile();
  }

  // Add system message to chat history
  chatHistories[chatId].push({
    role: "assistant",
    content: "Automate chat continued",
  });

  // Save updated chat histories to file
  saveChatHistoriesToFile();

  res.json({
    chatHistory: chatHistories[chatId],
  });
});

app.post("/sendMessagebotstart", async (req, res) => {
  const { chatId } = req.body;

  // Initialize chat history if not exists
  if (!chatHistories.hasOwnProperty(chatId)) {
    chatHistories[chatId] = [];
    allChatIds.push(chatId);
    saveChatIdsToFile();
  }

  // Add system message to chat history
  chatHistories[chatId].push({
    role: "assistant",
    content: "Manual chat continued",
  });
  manualMessagesEnabledCount++;

  // Save updated chat histories to file
  saveChatHistoriesToFile();

  res.json({
    chatHistory: chatHistories[chatId],
  });
});

app.post("/sendMessagetobot", async (req, res) => {
  const { chatId } = req.body;

  // Initialize chat history if not exists
  if (!chatHistories.hasOwnProperty(chatId)) {
    chatHistories[chatId] = [];
    allChatIds.push(chatId);
    saveChatIdsToFile();
  }

  res.json({
    chatHistory: chatHistories[chatId],
  });
});

function getFormattedTime() {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  const hours = String(now.getHours()).padStart(2, "0");
  const minutes = String(now.getMinutes()).padStart(2, "0");
  const seconds = String(now.getSeconds()).padStart(2, "0");
  return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
}

// Endpoint to submit user data
app.post("/submitUserData", (req, res) => {
  const { chatId, name, number } = req.body;

  // Store user data associated with chatId
  userData[chatId] = { name, number };

  // Push user data to UserDataStore array
  UserDataStore.push({
    chatId,
    name,
    number,
    timestamp: getFormattedTime(),
  });

  // Save updated UserDataStore to file
  saveUserDataToFile();

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
app.get("/userData/:chatId", (req, res) => {
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

// Define the /analytics endpoint
app.get("/analytics", (req, res) => {
  const analytics = {
    numberOfContacts: UserDataStore.length,
    numberOfMessagesSent: totalMessagesSent,
    numberOfChatIds: allChatIds.length,
    numberOfManualMessagesEnabledChats: manualMessagesEnabledCount,
  };
  res.json({ analytics });
});

// Start the server
app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});
