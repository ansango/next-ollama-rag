import { convertToCoreMessages, streamText, tool } from "ai";
import { ollama } from "ollama-ai-provider";
import { z } from "zod";

import { createResource } from "@/lib/actions/resources";
import { findRelevantContent } from "@/lib/ai/embedding";

// Allow streaming responses up to 30 seconds
export const maxDuration = 30;

export async function POST(req: Request) {
  const { messages } = await req.json();

  const result = await streamText({
    model: ollama("llama3.1:8b"),
    system: `Eres un asistente útil. Consulta tu base de conocimientos antes de responder cualquier pregunta.
    Responde únicamente a las preguntas utilizando información de la herramienta "recuperarInformacion".
    Si te solicitan agregar información mediante "[rec]", utiliza la herramienta "agregarRecurso".
    Si no existe información relevante en las llamadas de la herramienta, responde exactamente: "No lo sé cabronazo".`,
    messages: convertToCoreMessages(messages),
    tools: {
      agregarRecurso: tool({
        description: `agrega un recurso a su base de conocimientos. El usuario utilizara "[rec]" seguido de la información. Ejemplo: "[rec] El agua es un recurso natural."`,
        parameters: z.object({
          content: z
            .string()
            .describe("El contenido o recurso para agregar a la base de conocimientos."),
        }),
        execute: async ({ content }) => createResource({ content }),
      }),
      recuperarInformacion: tool({
        description: `obtenga información de su base de conocimientos para responder preguntas.`,
        parameters: z.object({
          question: z.string().describe("La pregunta de los usuarios"),
        }),
        execute: async ({ question }) => findRelevantContent(question),
      }),
    },
  });

  return result.toDataStreamResponse();
}
