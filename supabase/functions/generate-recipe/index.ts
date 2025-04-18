
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const OPENAI_API_URL = 'https://api.openai.com/v1/chat/completions'

function cleanJsonResponse(response: string): string {
  // First, try to extract a JSON object if it's embedded in text
  const jsonObjectMatch = response.match(/\{[\s\S]*\}/);
  if (jsonObjectMatch) {
    return jsonObjectMatch[0].trim();
  }
  
  // Otherwise, remove markdown code block syntax
  let cleaned = response
    .replace(/^```(?:json)?\s*/im, '')  // Remove opening ```json or ``` (case insensitive)
    .replace(/```\s*$/m, '')            // Remove closing ```
    .trim();                            // Remove any extra whitespace
  
  return cleaned;
}

async function generateRecipeWithRetry(prompt: string, maxRetries = 2): Promise<any> {
  let lastError: Error | null = null;
  
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      console.log(`Attempt ${attempt + 1}: Starting recipe generation`)
      const apiKey = Deno.env.get('OPENAI_API_KEY')
      if (!apiKey) {
        throw new Error('OPENAI_API_KEY is not set')
      }

      const requestBody = {
        model: 'gpt-4o',
        messages: [
          { 
            role: 'system', 
            content: `You are a professional chef that ONLY responds with valid JSON objects. 
            Your response must ALWAYS include these exact fields:
            - title (string)
            - ingredients (array of strings)
            - detailed step by step instructions (array of strings)
            - prep_time_minutes (number between 5 and 180)
            - cook_time_minutes (number between 5 and 180)
            - servings (number matching requested guest count)
            Never include any additional text or fields before or after the above.
            DO NOT wrap the JSON in markdown code blocks.`
          },
          { role: 'user', content: prompt }
        ],
        temperature: 0.0,
        max_tokens: 1000,
      }

      console.log('Request body:', JSON.stringify(requestBody, null, 2))

      const response = await fetch(OPENAI_API_URL, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
      })

      const responseText = await response.text()
      console.log(`Attempt ${attempt + 1} raw response:`, responseText)

      if (!response.ok) {
        throw new Error(`OpenAI API error: ${response.status} ${response.statusText}\nResponse: ${responseText}`)
      }

      let data
      try {
        data = JSON.parse(responseText)
      } catch (error) {
        console.error('Failed to parse API response:', error)
        throw new Error(`Invalid JSON response: ${responseText}`)
      }

      console.log(`Attempt ${attempt + 1} parsed response:`, JSON.stringify(data, null, 2))

      if (!data.choices?.[0]?.message?.content) {
        throw new Error('Invalid API response structure')
      }

      // Clean the response content before parsing
      const cleanedContent = cleanJsonResponse(data.choices[0].message.content)
      console.log(`Attempt ${attempt + 1} cleaned content:`, cleanedContent)

      let recipe
      try {
        recipe = JSON.parse(cleanedContent)
      } catch (error) {
        console.error('Failed to parse recipe JSON:', error)
        
        // Last attempt - try to use a more aggressive approach to extract JSON
        if (attempt === maxRetries) {
          // Look for the JSON structure within the response
          const potentialJson = data.choices[0].message.content.match(/(\{[\s\S]*\})/);
          if (potentialJson) {
            try {
              recipe = JSON.parse(potentialJson[0]);
              console.log(`Successfully extracted JSON on final attempt:`, JSON.stringify(recipe, null, 2));
            } catch (deepError) {
              throw new Error(`Could not extract valid JSON: ${cleanedContent}`);
            }
          } else {
            throw new Error(`Invalid recipe JSON: ${cleanedContent}`);
          }
        } else {
          throw error; // Re-throw for retry
        }
      }

      console.log(`Attempt ${attempt + 1} parsed recipe:`, JSON.stringify(recipe, null, 2))
      
      // Validate all required fields are present and have correct types
      if (!recipe.title || typeof recipe.title !== 'string') {
        throw new Error('Invalid title')
      }
      if (!Array.isArray(recipe.ingredients) || recipe.ingredients.length === 0) {
        throw new Error('Invalid ingredients')
      }
      if (!Array.isArray(recipe.instructions) || recipe.instructions.length === 0) {
        throw new Error('Invalid instructions')
      }
      if (typeof recipe.prep_time_minutes !== 'number' || recipe.prep_time_minutes < 5 || recipe.prep_time_minutes > 180) {
        throw new Error('Invalid prep_time_minutes')
      }
      if (typeof recipe.cook_time_minutes !== 'number' || recipe.cook_time_minutes < 5 || recipe.cook_time_minutes > 180) {
        throw new Error('Invalid cook_time_minutes')
      }
      if (typeof recipe.servings !== 'number') {
        throw new Error('Invalid servings')
      }

      console.log(`Attempt ${attempt + 1}: Recipe validation passed`)
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

async function generateMenuCourses(prompt: string, guestCount: number, courseCount: number): Promise<string[]> {
  try {
    const apiKey = Deno.env.get('OPENAI_API_KEY')
    if (!apiKey) {
      throw new Error('OPENAI_API_KEY is not set')
    }

    console.log(`Generating menu courses with prompt: ${prompt}, guestCount: ${guestCount}, courseCount: ${courseCount}`)

    const requestBody = {
      model: 'gpt-4o',
      messages: [
        { 
          role: 'system', 
          content: `You are a professional chef that creates elegant, sophisticated menus.
          You will respond with ONLY a simple JSON array of specific dish names (NOT course types).
          Do not include any markdown, just return the raw JSON array.
          
          Example response: ["Truffle Risotto with Wild Mushrooms", "Herb-crusted Rack of Lamb", "Chocolate Soufflé with Vanilla Bean Ice Cream"]
          
          IMPORTANT GUIDELINES:
          - Each dish name should be specific, descriptive, and appetizing
          - Include EXACTLY ${courseCount} dishes appropriate for the requested menu theme
          - Do not use generic terms like "Appetizer", "Main Course", or "Dessert"
          - THE LAST DISH MUST ALWAYS BE A DESSERT BUT IF POSSIBLE WITHIN THE THEME OF THE MENU (e.g., "Lemon Tart with Fresh Berries", "Tiramisu", "Crème Brûlée")
          - All other courses should be savory dishes (appetizers, mains, sides)
          - Each dish name should be elegant and sophisticated (e.g., "Pan-seared Scallops with Citrus Beurre Blanc" NOT just "Scallops")
          - Do not include numbers or other prefixes in the dish names
          - DO NOT wrap the response in code blocks or any other formatting
          - Make sure the dish names align with the requested menu theme`
        },
        { 
          role: 'user', 
          content: prompt
        }
      ],
      temperature: 0.7,
      max_tokens: 500,
    }

    console.log('Menu generation request body:', JSON.stringify(requestBody, null, 2))

    const response = await fetch(OPENAI_API_URL, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestBody),
    })

    const responseText = await response.text()
    console.log('Menu generation raw response:', responseText)

    if (!response.ok) {
      throw new Error(`OpenAI API error: ${response.status} ${response.statusText}\nResponse: ${responseText}`)
    }

    let data
    try {
      data = JSON.parse(responseText)
    } catch (error) {
      console.error('Failed to parse API response:', error)
      throw new Error(`Invalid JSON response: ${responseText}`)
    }

    if (!data.choices?.[0]?.message?.content) {
      throw new Error('Invalid API response structure')
    }

    // Clean the response content before parsing
    const cleanedContent = cleanJsonResponse(data.choices[0].message.content)
    console.log('Cleaned menu content:', cleanedContent)

    let courses
    try {
      courses = JSON.parse(cleanedContent)
    } catch (error) {
      // If parsing fails, try to extract the array from the text
      console.error('Failed to parse courses JSON, trying to extract array:', error)
      
      // Handle the case where the response contains text that's not just the JSON array
      const arrayMatch = cleanedContent.match(/\[.*\]/s);
      if (arrayMatch) {
        try {
          courses = JSON.parse(arrayMatch[0]);
          console.log('Extracted array from text:', courses);
        } catch (extractError) {
          console.error('Failed to extract array:', extractError);
          throw new Error(`Could not parse courses from response: ${cleanedContent}`);
        }
      } else {
        throw new Error(`Could not find array in response: ${cleanedContent}`);
      }
    }

    if (!Array.isArray(courses)) {
      throw new Error('Courses must be an array')
    }
    
    // Verify that we have at least one course that looks like a dessert
    // If not, replace the last course with a default dessert option
    const lastCourse = courses[courses.length - 1].toLowerCase();
    const dessertKeywords = ['cake', 'tart', 'pudding', 'soufflé', 'ice cream', 'sorbet', 'mousse', 
                           'crème', 'chocolate', 'panna cotta', 'tiramisu', 'cheesecake', 'dessert',
                           'brûlée', 'custard', 'pie', 'sweet', 'caramel'];
    
    const isDessert = dessertKeywords.some(keyword => lastCourse.includes(keyword.toLowerCase()));
    
    if (!isDessert && courses.length > 0) {
      console.log('Last course does not appear to be a dessert, replacing with dessert option');
      // Replace the last course with a dessert that matches the theme
      const dessertOptions = [
        "Classic Vanilla Bean Crème Brûlée",
        "Dark Chocolate Mousse with Fresh Berries",
        "Lemon Tart with Raspberry Coulis",
        "Tiramisu with Espresso-Soaked Ladyfingers",
        "Warm Apple Tart with Vanilla Ice Cream"
      ];
      courses[courses.length - 1] = dessertOptions[Math.floor(Math.random() * dessertOptions.length)];
    }

    console.log('Generated menu courses:', courses)
    return courses
  } catch (error) {
    console.error('Menu generation error:', error)
    throw error
  }
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const body = await req.json()
    
    // Check if this is a menu generation request
    if (body.generateMenu) {
      console.log('Menu generation request:', body)
      
      const { prompt, menuName, guestCount, courseCount } = body
      
      if (!prompt) {
        throw new Error('Menu prompt is required')
      }
      
      // Use provided guestCount or default to 4
      const guests = guestCount ? Number(guestCount) : 4
      
      // Use provided courseCount or default to 3
      const courses = courseCount ? Number(courseCount) : 3
      
      // Generate menu courses
      const menuCourses = await generateMenuCourses(prompt, guests, courses)
      
      return new Response(JSON.stringify({ courses: menuCourses }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200
      })
    }
    
    // Otherwise, handle as a recipe generation request
    const { courseTitle, guestCount, requirements } = body
    console.log('Generating recipe for:', { courseTitle, guestCount, requirements })

    if (!courseTitle || courseTitle === 'undefined') {
      throw new Error('Course title is required')
    }
    
    if (!guestCount || isNaN(Number(guestCount))) {
      throw new Error('Valid guest count is required')
    }

    const actualGuestCount = Number(guestCount)

    const prompt = `Create a recipe for ${courseTitle} that serves ${actualGuestCount} people.
    ${requirements ? `Additional requirements: ${requirements}` : ''}

    YOU MUST RESPOND WITH A SINGLE JSON OBJECT IN THIS EXACT FORMAT:
    {
      "title": "${courseTitle}",
      "description": "A brief, appetizing description of the dish (max 120 characters)",
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
      "servings": ${actualGuestCount}
    }

    Rules:
    1. ALL fields must be present exactly as shown
    2. ALL time values must be numbers (not strings)
    3. prep_time_minutes and cook_time_minutes must be numbers between 5 and 180
    4. ingredients and instructions must be non-empty arrays of strings
    5. servings must equal ${actualGuestCount}
    6. description must be a string of max 120 characters
    7. DO NOT include any text outside the JSON object
    8. DO NOT wrap the response in markdown code blocks`

    const recipe = await generateRecipeWithRetry(prompt)

    // Validate the response
    if (!recipe.description || typeof recipe.description !== 'string' || recipe.description.length > 120) {
      throw new Error('Invalid recipe description')
    }

    // Force servings to match requested guest count
    recipe.servings = actualGuestCount

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
