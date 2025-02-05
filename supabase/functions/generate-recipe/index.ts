
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

    // Construct the prompt for recipe generation
    const prompt = `Generate a detailed recipe for ${courseTitle} that serves ${guestCount} people.
    ${requirements ? `Additional requirements: ${requirements}` : ''}
    
    Please provide the recipe in the following JSON format:
    {
      "title": "Recipe title",
      "ingredients": ["ingredient 1 with quantity", "ingredient 2 with quantity"],
      "instructions": ["step 1", "step 2"],
      "prep_time_minutes": number,
      "cook_time_minutes": number,
      "servings": number
    }`

    const response = await fetch(PERPLEXITY_API_URL, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${Deno.env.get('PERPLEXITY_API_KEY')}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'llama-3.1-sonar-small-128k-online',
        messages: [
          { role: 'system', content: 'You are a professional chef specializing in recipe creation. Provide detailed, precise recipes with accurate measurements and clear instructions.' },
          { role: 'user', content: prompt }
        ],
        temperature: 0.2,
        top_p: 0.9,
        max_tokens: 1000,
        return_images: false,
        return_related_questions: false
      }),
    })

    if (!response.ok) {
      console.error('Perplexity API error:', await response.text())
      throw new Error(`Perplexity API error: ${response.statusText}`)
    }

    const data = await response.json()
    console.log('Perplexity API response:', data)

    if (!data.choices?.[0]?.message?.content) {
      throw new Error('Invalid response from Perplexity API')
    }

    let recipe
    try {
      recipe = JSON.parse(data.choices[0].message.content)
    } catch (error) {
      console.error('Failed to parse recipe JSON:', error)
      throw new Error('Failed to parse recipe response')
    }

    // Validate recipe structure
    const requiredFields = ['title', 'ingredients', 'instructions', 'prep_time_minutes', 'cook_time_minutes', 'servings']
    for (const field of requiredFields) {
      if (!recipe[field]) {
        throw new Error(`Missing required field in recipe: ${field}`)
      }
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
