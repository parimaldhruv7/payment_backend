require("dotenv").config();

const serverless = require("serverless-http");
const app = require("./app");
const connectDB = require("./config/db");

let isConnected = false;

const connect = async () => {
  if (!isConnected) {
    await connectDB();
    isConnected = true;
  }
};

module.exports.handler = async (event, context) => {
  context.callbackWaitsForEmptyEventLoop = false;

  await connect();

  return serverless(app)(event, context);
};