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

const MOCK_STREET_NAMES = [
  "Market St", "Mission St", "Valencia St", "Castro St", "Haight St",
  "Divisadero St", "Fillmore St", "Van Ness Ave", "Geary Blvd", "Irving St",
];

const MOCK_BUSINESS_NAMES = [
  "Bay Area Lock & Key", "Golden Gate Locksmith", "SF Pro Locksmith",
  "Pacific Lock Solutions", "City Center Locksmith", "Rapid Key Services",
  "Sunset District Locks", "Castro Locksmith Co.", "Mission Lock Pros",
  "North Beach Lock & Safe",
];

/**
 * Uses OpenAI to search for locksmiths within a 50km radius.
 */
export async function findLocksmithsNearby(city: string, zip: string): Promise<LocksmithLead[]> {
  console.log(`[Mock] Generating 10 mock locksmiths for ${city}, ${zip}...`);

  return Array.from({ length: 10 }).map((_, i) => ({
    name: MOCK_BUSINESS_NAMES[i],
    phone: `+1 (415) 55${i}-${String(1000 + i * 137).slice(0, 4)}`,
    address: `${100 + i * 123} ${MOCK_STREET_NAMES[i]}, ${city}, CA ${zip}`,
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
