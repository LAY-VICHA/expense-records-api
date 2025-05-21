import express from "express";
import router from "./routes";
import errorHandler from "./middleware/error";
import config from "./config/config";

const app = express();

app.use(express.json());

// Routes
app.use(router);
// app.use('/api/items', itemRoutes);
app.use(errorHandler);

app.listen(config.port, () => {
  console.log(`Server running on port ${config.port}`);
});

export default app;
