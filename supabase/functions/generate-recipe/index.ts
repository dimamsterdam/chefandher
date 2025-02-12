
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

    // Make the prompt more explicit about required fields and their types
    const prompt = `As a professional chef, create a recipe for ${courseTitle} that serves ${guestCount} people.
    ${requirements ? `Additional requirements: ${requirements}` : ''}

    Respond with ONLY a single JSON object in this EXACT format:
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
      "prep_time_minutes": <number between 5 and 120>,
      "cook_time_minutes": <number between 5 and 180>,
      "servings": ${guestCount}
    }

    MUST include ALL fields exactly as shown. ALL time values MUST be numbers, not strings.
    prep_time_minutes and cook_time_minutes MUST be numbers between 5 and 180.
    ingredients and instructions MUST be arrays of strings.
    servings MUST match the requested guest count of ${guestCount}.
    Do not include any additional text or fields.`

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
            content: 'You are a professional chef that ONLY responds with valid JSON objects containing complete recipe details with exact fields as requested. Never include any additional text or fields.' 
          },
          { role: 'user', content: prompt }
        ],
        temperature: 0.1, // Keep temperature low for consistent formatting
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

    // Validate recipe structure and data types with detailed error messages
    const requiredFields = ['title', 'ingredients', 'instructions', 'prep_time_minutes', 'cook_time_minutes', 'servings']
    for (const field of requiredFields) {
      if (!(field in recipe)) {
        console.error(`Missing field in recipe: ${field}`, recipe)
        throw new Error(`Missing required field: ${field}`)
      }
    }

    // Type and value validation
    if (!Array.isArray(recipe.ingredients) || recipe.ingredients.length === 0) {
      throw new Error('ingredients must be a non-empty array of strings')
    }

    if (!Array.isArray(recipe.instructions) || recipe.instructions.length === 0) {
      throw new Error('instructions must be a non-empty array of strings')
    }

    if (typeof recipe.prep_time_minutes !== 'number' || recipe.prep_time_minutes < 5 || recipe.prep_time_minutes > 180) {
      throw new Error('prep_time_minutes must be a number between 5 and 180')
    }

    if (typeof recipe.cook_time_minutes !== 'number' || recipe.cook_time_minutes < 5 || recipe.cook_time_minutes > 180) {
      throw new Error('cook_time_minutes must be a number between 5 and 180')
    }

    if (recipe.servings !== guestCount) {
      recipe.servings = guestCount // Fix servings count if it doesn't match
    }

    // If we get here, all validations passed
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
