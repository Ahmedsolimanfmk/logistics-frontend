import { api } from "@/src/lib/api";

export async function askAssistant(question: string) {
  const res = await api.post("/ai/ask", {
    question,
  });

  return res.data;
}