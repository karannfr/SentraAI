import { v4 as uuidv4 } from "uuid";
import { Ollama } from "@langchain/ollama";
import {
  START,
  END,
  StateGraph,
  MemorySaver,
  MessagesAnnotation,
} from "@langchain/langgraph";

const llm = new Ollama({
  model: "llama3.1:8b-instruct-q2_K",
  baseUrl: "http://localhost:11434",
});

const callModel = async (state) => {
  const response = await llm.invoke(state.messages);
  return { messages: [response] };
};

const graph = new StateGraph(MessagesAnnotation)
  .addNode("model", callModel)
  .addEdge(START, "model")
  .addEdge("model", END);

const memory = new MemorySaver();
const app = graph.compile({ checkpointer: memory });

export async function responseGeneration(req, res, next) {
  try {
    const { message, cleanedText, thread_id, sanitizationLog } = req.body;

    const inputText = typeof cleanedText === "string" ? cleanedText : message;
    if (!inputText || typeof inputText !== "string") {
      return res.status(400).json({ error: "Missing or invalid message." });
    }

    const config = {
      configurable: { thread_id: thread_id || uuidv4() },
    };

    const input = {
      messages: [{ role: "user", content: inputText }],
    };

    const output = await app.invoke(input, config);
    const last = output.messages[output.messages.length - 1];

    req.body.generatedResponse = last.content;
    req.body.thread_id = config.configurable.thread_id;

    req.body.chatHistory = output.messages.map((msg, idx) => {
      const role = idx%2 === 0 ? "user" : "assistant";
      return {
        role,
        content: msg.content || "",
      };
    });

    console.log(req.body.chatHistory);

    next();
  } catch (err) {
    console.error("Response Generation Error:", err);
    res.status(500).json({ error: "Internal Server Error during response generation." });
  }
}

export { memory, app };

