import { GoogleGenerativeAI } from "@google/generative-ai";
import dotenv from 'dotenv';
dotenv.config();

const genAI = new GoogleGenerativeAI(process.env.VITE_GEMINI_API_KEY);

async function run() {
  try {
    const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });
    const result = await model.generateContent("Hello");
    console.log("Response:", result.response.text());
  } catch (e) {
    console.error("1.5-flash Failed:", e.message);
    try {
      const model2 = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });
      const result2 = await model2.generateContent("Hello");
      console.log("Pro Response:", result2.response.text());
    } catch (e2) {
      console.error("Pro Failed:", e2.message);
    }
  }
}
run();
