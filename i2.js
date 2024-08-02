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
const chatCreationTimestamps = {}; // Storage for timestamps

// Path to the file storing chat IDs, user data, and chat histories
const chatIdsFilePath = path.join(__dirname, "chatIds.json");
const userDataFilePath = path.join(__dirname, "userData.json");
const allChatHistoriesFilePath = path.join(__dirname, "allChatHistories.json");

// Function to generate a random chatId with timestamp
const generateChatId = () => {
  const chatId = Math.random().toString(36).substring(2);
  const timestamp = new Date();
  const offset = 330; // +5:30 in minutes
  timestamp.setMinutes(timestamp.getMinutes() + offset);
  chatCreationTimestamps[chatId] = timestamp.toISOString(); // Store timestamp
  return chatId;
};

// Function to save all chat histories to a file
const saveAllChatHistoriesToFile = () => {
  try {
    const allChatHistories = Object.keys(chatHistories).map((chatId) => ({
      chatId,
      timestamp: chatCreationTimestamps[chatId],
      messages: chatHistories[chatId],
      userData: userData[chatId] || { name: "", number: "" },
    }));

    fs.writeFileSync(
      allChatHistoriesFilePath,
      JSON.stringify(allChatHistories, null, 2)
    );
    console.log("Chat histories saved successfully.");
  } catch (error) {
    console.error("Error saving chat histories:", error);
  }
};

// Read chat IDs from the file when the server starts
let allChatIds = [];
if (fs.existsSync(chatIdsFilePath)) {
  const data = fs.readFileSync(chatIdsFilePath, "utf-8");
  const chatIdsWithTimestamps = JSON.parse(data);
  allChatIds = chatIdsWithTimestamps.map(({ chatId }) => chatId);
  chatIdsWithTimestamps.forEach(({ chatId, timestamp }) => {
    chatHistories[chatId] = [];
    userData[chatId] = {};
    chatCreationTimestamps[chatId] = timestamp;
  });
} else {
  fs.writeFileSync(chatIdsFilePath, JSON.stringify([]));
}

// Function to save chat IDs and timestamps to the file
const saveChatIdsToFile = () => {
  const data = allChatIds.map((chatId) => ({
    chatId,
  }));
  fs.writeFileSync(chatIdsFilePath, JSON.stringify(data, null, 2));
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
  fs.writeFileSync(userDataFilePath, JSON.stringify(UserDataStore, null, 2));
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
        },
        ...messages,
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

  if (!chatHistories.hasOwnProperty(chatId)) {
    chatHistories[chatId] = [];
    userData[chatId] = {};
    allChatIds.push(chatId);
    saveChatIdsToFile(); // Save chat IDs with timestamps
  }

  chatHistories[chatId].push({ role: "user", content: message });
  totalMessagesSent++;

  try {
    const completion = await getCompletionFromMessages(
      chatHistories[chatId],
      "gpt-3.5-turbo-0125",
      0.7,
      150,
      textareaContent
    );

    chatHistories[chatId].push({ role: "assistant", content: completion });

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

  if (!chatHistories.hasOwnProperty(chatId)) {
    chatHistories[chatId] = [];
    userData[chatId] = {};
    allChatIds.push(chatId);
    saveChatIdsToFile(); // Save chat IDs with timestamps
  }

  chatHistories[chatId].push({ role: "assistant", content: message });
  totalMessagesSent++;

  res.json({
    chatHistory: chatHistories[chatId],
  });
});

app.post("/sendMessageuser", async (req, res) => {
  const { chatId, message } = req.body;

  if (!chatHistories.hasOwnProperty(chatId)) {
    chatHistories[chatId] = [];
    userData[chatId] = {};
    allChatIds.push(chatId);
    saveChatIdsToFile(); // Save chat IDs with timestamps
  }

  chatHistories[chatId].push({ role: "user", content: message });
  totalMessagesSent++;

  res.json({
    chatHistory: chatHistories[chatId],
  });
});

app.post("/sendMessagebotend", async (req, res) => {
  const { chatId } = req.body;

  if (!chatHistories.hasOwnProperty(chatId)) {
    chatHistories[chatId] = [];
    userData[chatId] = {};
    allChatIds.push(chatId);
    saveChatIdsToFile(); // Save chat IDs with timestamps
  }

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

  if (!chatHistories.hasOwnProperty(chatId)) {
    chatHistories[chatId] = [];
    userData[chatId] = {};
    allChatIds.push(chatId);
    saveChatIdsToFile(); // Save chat IDs with timestamps
  }

  chatHistories[chatId].push({
    role: "assistant",
    content: "Manual chat continued",
  });
  manualMessagesEnabledCount++;

  res.json({
    chatHistory: chatHistories[chatId],
  });
});

app.post("/sendMessagetobot", async (req, res) => {
  const { chatId } = req.body;

  if (!chatHistories.hasOwnProperty(chatId)) {
    chatHistories[chatId] = [];
    userData[chatId] = {};
    allChatIds.push(chatId);
    saveChatIdsToFile(); // Save chat IDs with timestamps
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

  // Check if the chatId already exists in userData
  if (!userData[chatId]) {
    userData[chatId] = { name, number };

    // Push new user data to UserDataStore array
    UserDataStore.push({
      chatId,
      name,
      number,
      timestamp: getFormattedTime(),
    });
    // Save updated UserDataStore to file
    saveUserDataToFile();

    res.status(200).json({ message: "User data saved successfully" });
  } else {
    res.status(400).json({ error: "User data already exists for this chatId" });
  }
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

// Update the /allChatHistory endpoint to save chat histories to the file
app.get("/allChatHistory", (req, res) => {
  try {
    const allChatHistories = Object.keys(chatHistories).map((chatId) => ({
      chatId,
      timestamp: chatCreationTimestamps[chatId],
      messages: chatHistories[chatId],
      userData: userData[chatId] || { name: "", number: "" },
    }));

    // Save to file
    saveAllChatHistoriesToFile();

    res.json({ chatHistories: allChatHistories });
  } catch (error) {
    console.error("Error fetching chat histories:", error);
    res.status(500).json({ error: "Error fetching chat histories" });
  }
});

// Define an endpoint to get user data for a given chatId
app.get("/userData/:chatId", (req, res) => {
  const { chatId } = req.params;

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
