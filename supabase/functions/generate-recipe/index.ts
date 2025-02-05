
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const DEEPSEEK_API_URL = 'https://api.deepseek.com/v1/chat/completions'

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const { courseTitle, guestCount, requirements } = await req.json()

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

    const response = await fetch(DEEPSEEK_API_URL, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${Deno.env.get('DEEPSEEK_API_KEY')}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'deepseek-chat',
        messages: [
          { role: 'system', content: 'You are a professional chef specializing in recipe creation. Provide detailed, precise recipes with accurate measurements and clear instructions.' },
          { role: 'user', content: prompt }
        ],
        response_format: { type: 'json_object' }
      }),
    })

    const data = await response.json()
    const recipe = JSON.parse(data.choices[0].message.content)

    return new Response(JSON.stringify(recipe), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (error) {
    console.error('Error in generate-recipe function:', error)
    return new Response(
      JSON.stringify({ error: 'Failed to generate recipe', details: error.message }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500 
      }
    )
  }
})
