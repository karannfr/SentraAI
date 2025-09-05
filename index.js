import express from "express";
import cors from "cors";
import chatRoutes from "./routes/chatRoute.js";

const app = express();
app.use(cors());
app.use(express.json());

app.use("/chat", chatRoutes);

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server listening at http://localhost:${PORT}`);
});
