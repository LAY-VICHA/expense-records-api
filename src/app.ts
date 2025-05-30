import express from "express";
import router from "./routes";
import errorHandler from "./middleware/error";
import config from "./config/config";
import cors from "cors";

const app = express();

app.use(express.json());

app.use(cors());

// Routes
app.use(router);
app.use(errorHandler);

app.listen(config.port, () => {
  console.log(`Server running on port ${config.port}`);
});

export default app;
