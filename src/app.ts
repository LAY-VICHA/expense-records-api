import express from "express";
import router from "./routes";
import errorHandler from "./middleware/error";
import config from "./config/config";
import cors from "cors";
import cookieParser from "cookie-parser";

const app = express();

app.use(
  cors({
    origin: "http://localhost:5173",
    credentials: true,
  })
);
app.use(cookieParser());

app.use(express.json());

// Routes
app.use(router);
app.use(errorHandler);

app.listen(config.port, () => {});

export default app;
