import OpenAI from "openai";
import { z } from "zod";
import type { LocksmithLead } from "./types";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY || "dummy-key-for-build",
});

export const LocksmithResponseSchema = z.object({
  locksmiths: z.array(
    z.object({
      name: z.string().describe("The official name of the locksmith business"),
      phone: z.string().describe("The phone number of the locksmith"),
    })
  ).describe("A list of locksmiths found in the requested area"),
});

/**
 * Uses OpenAI to search for locksmiths within a 50km radius.
 */
export async function findLocksmithsNearby(city: string, zip: string): Promise<LocksmithLead[]> {
  console.log(`[Mock] Generating 10 mock locksmiths for ${city}, ${zip}...`);

  // Return 10 mocked locksmiths for now
  return Array.from({ length: 10 }).map((_, i) => ({
    name: `Mock Locksmith ${i + 1}`,
    phone: `+1 555-010-${String(i).padStart(2, '0')}`,
  }));

  /* 
  // Original OpenAI Implementation:
  if (!process.env.OPENAI_API_KEY) {
    console.warn("OPENAI_API_KEY is not set. Skipping real locksmith search.");
    return [];
  }

  try {
    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "system",
          content: "You are an assistant that helps find local businesses. Ensure the results are real businesses as best as your knowledge allows.",
        },
        {
          role: "user",
          content: `Please find 3 to 5 real locksmith businesses within a 50km radius of ${city}, ${zip}. Provide their official names and phone numbers.`,
        },
      ],
      response_format: {
        type: "json_schema",
        json_schema: {
          name: "locksmith_search_response",
          schema: {
            type: "object",
            properties: {
              locksmiths: {
                type: "array",
                description: "A list of locksmiths found in the requested area",
                items: {
                  type: "object",
                  properties: {
                    name: {
                      type: "string",
                      description: "The official name of the locksmith business"
                    },
                    phone: {
                      type: "string",
                      description: "The phone number of the locksmith"
                    }
                  },
                  required: ["name", "phone"],
                  additionalProperties: false
                }
              }
            },
            required: ["locksmiths"],
            additionalProperties: false
          },
          strict: true,
        },
      },
    });

    const content = response.choices[0].message.content;
    if (!content) return [];
    
    const parsed = JSON.parse(content);
    return parsed.locksmiths || [];
  } catch (error) {
    console.error("Error fetching locksmiths via OpenAI:", error);
    return [];
  }
  */
}
