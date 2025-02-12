
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const PERPLEXITY_API_URL = 'https://api.perplexity.ai/chat/completions'

async function generateRecipeWithRetry(prompt: string, maxRetries = 2): Promise<any> {
  let lastError: Error | null = null;
  
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      const response = await fetch(PERPLEXITY_API_URL, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${Deno.env.get('PERPLEXITY_API_KEY')}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'llama-3.1-sonar-small-128k-online',
          messages: [
            { 
              role: 'system', 
              content: `You are a professional chef that ONLY responds with valid JSON objects. 
              Your response must ALWAYS include these exact fields:
              - title (string)
              - ingredients (array of strings)
              - instructions (array of strings)
              - prep_time_minutes (number between 5 and 180)
              - cook_time_minutes (number between 5 and 180)
              - servings (number matching requested guest count)
              Never include any additional text or fields.`
            },
            { role: 'user', content: prompt }
          ],
          temperature: 0.0, // Set to 0 for maximum consistency
          max_tokens: 1000,
        }),
      })

      if (!response.ok) {
        const errorText = await response.text()
        console.error(`Perplexity API error (attempt ${attempt + 1}):`, errorText)
        throw new Error(`Perplexity API error: ${response.statusText}`)
      }

      const data = await response.json()
      console.log(`Attempt ${attempt + 1} response:`, JSON.stringify(data, null, 2))

      if (!data.choices?.[0]?.message?.content) {
        throw new Error('Invalid API response structure')
      }

      const recipe = JSON.parse(data.choices[0].message.content.trim())
      
      // Validate all required fields are present and have correct types
      if (!recipe.title || typeof recipe.title !== 'string') throw new Error('Invalid title')
      if (!Array.isArray(recipe.ingredients) || recipe.ingredients.length === 0) throw new Error('Invalid ingredients')
      if (!Array.isArray(recipe.instructions) || recipe.instructions.length === 0) throw new Error('Invalid instructions')
      if (typeof recipe.prep_time_minutes !== 'number' || recipe.prep_time_minutes < 5 || recipe.prep_time_minutes > 180) {
        throw new Error('Invalid prep_time_minutes')
      }
      if (typeof recipe.cook_time_minutes !== 'number' || recipe.cook_time_minutes < 5 || recipe.cook_time_minutes > 180) {
        throw new Error('Invalid cook_time_minutes')
      }
      if (typeof recipe.servings !== 'number') throw new Error('Invalid servings')

      return recipe
    } catch (error) {
      console.error(`Attempt ${attempt + 1} failed:`, error)
      lastError = error
      if (attempt < maxRetries) {
        console.log(`Retrying... (${attempt + 1}/${maxRetries})`)
        continue
      }
    }
  }
  
  throw lastError || new Error('Failed to generate recipe after all retries')
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const { courseTitle, guestCount, requirements } = await req.json()
    console.log('Generating recipe for:', { courseTitle, guestCount, requirements })

    const prompt = `Create a recipe for ${courseTitle} that serves ${guestCount} people.
    ${requirements ? `Additional requirements: ${requirements}` : ''}

    YOU MUST RESPOND WITH A SINGLE JSON OBJECT IN THIS EXACT FORMAT:
    {
      "title": "${courseTitle}",
      "ingredients": [
        "quantity ingredient 1",
        "quantity ingredient 2"
      ],
      "instructions": [
        "Step 1: detailed instruction",
        "Step 2: detailed instruction"
      ],
      "prep_time_minutes": <number between 5 and 180>,
      "cook_time_minutes": <number between 5 and 180>,
      "servings": ${guestCount}
    }

    Rules:
    1. ALL fields must be present exactly as shown
    2. ALL time values must be numbers (not strings)
    3. prep_time_minutes and cook_time_minutes must be numbers between 5 and 180
    4. ingredients and instructions must be non-empty arrays of strings
    5. servings must equal ${guestCount}
    6. DO NOT include any text outside the JSON object`

    const recipe = await generateRecipeWithRetry(prompt)

    // Force servings to match requested guest count
    recipe.servings = guestCount

    return new Response(JSON.stringify(recipe), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200
    })
  } catch (error) {
    console.error('Error in generate-recipe function:', error)
    return new Response(
      JSON.stringify({ 
        error: 'Failed to generate recipe', 
        details: error.message,
        timestamp: new Date().toISOString()
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500 
      }
    )
  }
})
