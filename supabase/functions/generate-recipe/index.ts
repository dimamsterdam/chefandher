
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const PERPLEXITY_API_URL = 'https://api.perplexity.ai/chat/completions'

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const { courseTitle, guestCount, requirements } = await req.json()

    console.log('Generating recipe for:', { courseTitle, guestCount, requirements })

    // Construct the prompt for recipe generation with explicit formatting instructions
    const prompt = `You are a professional chef. Generate a recipe for ${courseTitle} that serves ${guestCount} people.
    ${requirements ? `Additional requirements: ${requirements}` : ''}
    
    You must respond with ONLY a JSON object in this exact format, with no additional text or markdown:
    {
      "title": "Recipe title",
      "ingredients": ["ingredient 1 with quantity", "ingredient 2 with quantity"],
      "instructions": ["step 1", "step 2"],
      "prep_time_minutes": 30,
      "cook_time_minutes": 45,
      "servings": ${guestCount}
    }
    
    Ensure all fields are present and that the response is valid JSON. Use numbers for time values, not strings.`

    console.log('Sending prompt to Perplexity:', prompt)

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
            content: 'You are a professional chef that ONLY responds with valid JSON objects containing recipe details. Never include any additional text, markdown, or formatting.' 
          },
          { role: 'user', content: prompt }
        ],
        temperature: 0.1, // Reduced temperature for more consistent formatting
        top_p: 0.9,
        max_tokens: 1000,
      }),
    })

    if (!response.ok) {
      const errorText = await response.text()
      console.error('Perplexity API error response:', errorText)
      throw new Error(`Perplexity API error: ${response.statusText}`)
    }

    const data = await response.json()
    console.log('Raw Perplexity API response:', JSON.stringify(data, null, 2))

    if (!data.choices?.[0]?.message?.content) {
      console.error('Invalid API response structure:', data)
      throw new Error('Invalid response from Perplexity API')
    }

    // Clean potential formatting issues
    const contentString = data.choices[0].message.content.trim()
    console.log('Content string to parse:', contentString)

    let recipe
    try {
      recipe = JSON.parse(contentString)
    } catch (error) {
      console.error('Failed to parse recipe JSON:', error, 'Content was:', contentString)
      throw new Error('Failed to parse recipe response')
    }

    // Validate recipe structure
    const requiredFields = ['title', 'ingredients', 'instructions', 'prep_time_minutes', 'cook_time_minutes', 'servings']
    for (const field of requiredFields) {
      if (!recipe[field]) {
        console.error('Missing field in recipe:', field, 'Recipe was:', recipe)
        throw new Error(`Missing required field in recipe: ${field}`)
      }
    }

    // Validate data types
    if (!Array.isArray(recipe.ingredients) || !Array.isArray(recipe.instructions)) {
      throw new Error('ingredients and instructions must be arrays')
    }
    if (typeof recipe.prep_time_minutes !== 'number' || typeof recipe.cook_time_minutes !== 'number') {
      throw new Error('prep_time_minutes and cook_time_minutes must be numbers')
    }

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
