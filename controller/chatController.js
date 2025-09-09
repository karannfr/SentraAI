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

export async function handleChat(req, res) {
  try {
    const { message, cleanedText, thread_id, sanitizationLog } = req.body;

    const inputText = typeof cleanedText === "string" ? cleanedText : message;

    if (!inputText || typeof inputText !== "string") {
      return res.status(400).json({ error: "Missing or invalid message." });
    }

    const config = {
      configurable: {
        thread_id: thread_id || uuidv4(),
      },
    };

    const input = {
      messages: [
        {
          role: "user",
          content: inputText,
        },
      ],
    };

    const output = await app.invoke(input, config);
    const last = output.messages[output.messages.length - 1];

    const responsePayload = {
      response: last.content,
      thread_id: config.configurable.thread_id,
    };

    if (typeof cleanedText === "string") {
      responsePayload.cleanedText = cleanedText;
      responsePayload.log = sanitizationLog || null;
    }

    return res.json(responsePayload);

  } catch (err) {
    console.error("ChatController Error:", err);
    res.status(500).json({ error: "Internal Server Error" });
  }
}
