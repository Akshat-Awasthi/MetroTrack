
'use server';
/**
 * @fileOverview A GenAI-powered tool to locate amenities within a metro station.
 *
 * - locateStationAmenity - A function that handles the amenity location process.
 * - LocateStationAmenityInput - The input type for the locateStationAmenity function.
 * - LocateStationAmenityOutput - The return type for the locateStationAmenity function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const LocateStationAmenityInputSchema = z.object({
  stationMapDataUri: z
    .string()
    .describe(
      "A photo of the station map, as a data URI that must include a MIME type and use Base64 encoding. Expected format: 'data:<mimetype>;base64,<encoded_data>'."
    ),
  amenity: z.string().describe('The amenity to locate (e.g., restroom, ATM, information kiosk).'),
});
export type LocateStationAmenityInput = z.infer<typeof LocateStationAmenityInputSchema>;

const LocateStationAmenityOutputSchema = z.object({
  description: z.string().describe('Description of where to find the specified amenity, or directions.'),
});
export type LocateStationAmenityOutput = z.infer<typeof LocateStationAmenityOutputSchema>;

export async function locateStationAmenity(input: LocateStationAmenityInput): Promise<LocateStationAmenityOutput> {
  return locateStationAmenityFlow(input);
}

const locateStationAmenityPrompt = ai.definePrompt({
  name: 'locateStationAmenityPrompt',
  input: {schema: LocateStationAmenityInputSchema},
  output: {schema: LocateStationAmenityOutputSchema},
  prompt: `You are an expert in navigating metro stations using station maps.

  A user is at a metro station and wants to find a specific amenity.

  Based on the provided station map, find the specified amenity and provide clear directions or a description of its location.

  Station Map:
  {{media url=stationMapDataUri}}

  Amenity to find: {{{amenity}}}`,
});

const locateStationAmenityFlow = ai.defineFlow(
  {
    name: 'locateStationAmenityFlow',
    inputSchema: LocateStationAmenityInputSchema,
    outputSchema: LocateStationAmenityOutputSchema,
  },
  async input => {
    const {output} = await locateStationAmenityPrompt(input);
    return output!;
  }
);
