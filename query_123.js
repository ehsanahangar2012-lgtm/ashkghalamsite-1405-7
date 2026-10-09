import { GoogleGenAI } from '@google/genai';
const ai = new GoogleGenAI({});

async function run() {
  const resp = await ai.models.generateContent({
    model: 'gemini-2.5-flash',
    contents: "Describe the exact 2D shape of the 4 bottom flaps of a standard FEFCO 0215 (1-2-3 snap lock bottom) box. For each flap (Side Flap 1, Receiver, Side Flap 2, Tongue), describe the exact path from left to right along its outer edge, assuming it's attached to the bottom horizontal crease of the box. Detail the tapers, cutouts, notches, and hooks. Be as mathematically precise as possible regarding typical proportions (e.g. 45 degree tapers, depth of flaps relative to W or L).",
  });
  console.log(resp.text);
}
run();
