import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const OPENAI_API_URL = 'https://api.openai.com/v1/chat/completions'

interface MenuDocument {
  menu_id: string;
  document_type: 'mise_en_place' | 'service_instructions' | 'shopping_list';
  content: string;
}

async function generateDocumentWithRetry(prompt: string, maxRetries = 2): Promise<string> {
  let lastError: Error | null = null;
  
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      const apiKey = Deno.env.get('OPENAI_API_KEY')
      if (!apiKey) {
        throw new Error('OPENAI_API_KEY is not set')
      }

      const requestBody = {
        model: 'gpt-4o',
        messages: [
          { 
            role: 'system', 
            content: 'You are a professional chef and restaurant manager. Provide clear, concise, and practical information.'
          },
          { role: 'user', content: prompt }
        ],
        temperature: 0.7,
        max_tokens: 2000,
      }

      const response = await fetch(OPENAI_API_URL, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
      })

      if (!response.ok) {
        throw new Error(`OpenAI API error: ${response.status} ${response.statusText}`)
      }

      const data = await response.json()
      return data.choices[0].message.content
    } catch (error) {
      console.error(`Attempt ${attempt + 1} failed:`, error)
      lastError = error
      if (attempt < maxRetries) {
        continue
      }
    }
  }
  
  throw lastError || new Error('Failed to generate document after all retries')
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const body = await req.json()
    const { menu_id, courses, guest_count, prep_days } = body

    if (!menu_id || !courses || !Array.isArray(courses)) {
      throw new Error('Invalid request: menu_id and courses are required')
    }

    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    const documents: MenuDocument[] = []

    // Generate Mise en Place
    const miseEnPlacePrompt = `Create a detailed mise en place plan for the following menu to serve ${guest_count} guests over ${prep_days} days of preparation:
    ${courses.map(c => c.title).join('\n')}
    
    Include:
    1. A timeline for preparation
    2. Equipment needed
    3. Preparation tasks for each day
    4. Storage instructions
    5. Any special considerations
    
    Format the response in clear sections with bullet points.`
    
    const miseEnPlaceContent = await generateDocumentWithRetry(miseEnPlacePrompt)
    documents.push({
      menu_id,
      document_type: 'mise_en_place',
      content: miseEnPlaceContent
    })

    // Generate Service Instructions
    const serviceInstructionsPrompt = `Create detailed service instructions for the following menu to serve ${guest_count} guests:
    ${courses.map(c => c.title).join('\n')}
    
    Include:
    1. Service order and timing
    2. Plating instructions
    3. Temperature requirements
    4. Garnish details
    5. Wine pairing suggestions (if applicable)
    6. Special service notes
    
    Format the response in clear sections with bullet points.`
    
    const serviceInstructionsContent = await generateDocumentWithRetry(serviceInstructionsPrompt)
    documents.push({
      menu_id,
      document_type: 'service_instructions',
      content: serviceInstructionsContent
    })

    // Generate Shopping List
    const shoppingListPrompt = `Create a comprehensive shopping list for the following menu to serve ${guest_count} guests:
    ${courses.map(c => c.title).join('\n')}
    
    Include:
    1. All ingredients needed
    2. Quantities for each ingredient
    3. Special equipment or tools
    4. Any specialty items that might need advance ordering
    
    Format the response in clear sections with bullet points.`
    
    const shoppingListContent = await generateDocumentWithRetry(shoppingListPrompt)
    documents.push({
      menu_id,
      document_type: 'shopping_list',
      content: shoppingListContent
    })

    // Save documents to database
    const { error } = await supabaseClient
      .from('menu_documents')
      .upsert(documents)

    if (error) {
      throw error
    }

    return new Response(JSON.stringify({ success: true }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200
    })
  } catch (error) {
    console.error('Error in generate-documents function:', error)
    return new Response(
      JSON.stringify({ 
        error: 'Failed to generate documents', 
        details: error.message
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500 
      }
    )
  }
}) 