
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const GEMINI_API_URL = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-flash-1.5:generateContent'

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
      const apiKey = Deno.env.get('GEMINI_API_KEY')
      if (!apiKey) {
        throw new Error('GEMINI_API_KEY is not set')
      }

      const requestBody = {
        contents: [{
          parts: [{
            text: prompt
          }]
        }],
        generationConfig: {
          temperature: 0.2,
          maxOutputTokens: 1000,
          responseMimeType: 'application/json'
        }
      }

      console.log('Request body:', JSON.stringify(requestBody, null, 2))

      const response = await fetch(`${GEMINI_API_URL}?key=${apiKey}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
      })

      const responseData = await response.json()
      console.log(`Attempt ${attempt + 1} raw response:`, JSON.stringify(responseData, null, 2))

      if (!response.ok) {
        throw new Error(`Gemini API error: ${response.status} ${response.statusText}\nResponse: ${JSON.stringify(responseData)}`)
      }

      // Extract the generated JSON
      const generatedContent = responseData.candidates?.[0]?.content?.parts?.[0]?.text
      if (!generatedContent) {
        throw new Error('No content generated')
      }

      // Clean and parse the JSON
      const cleanedContent = cleanJsonResponse(generatedContent)
      console.log(`Attempt ${attempt + 1} cleaned content:`, cleanedContent)

      let recipe
      try {
        recipe = JSON.parse(cleanedContent)
      } catch (error) {
        console.error('Failed to parse recipe JSON:', error)
        
        // Last attempt - try to use a more aggressive approach to extract JSON
        if (attempt === maxRetries) {
          // Look for the JSON structure within the response
          const potentialJson = generatedContent.match(/(\{[\s\S]*\})/);
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
    const apiKey = Deno.env.get('GEMINI_API_KEY')
    if (!apiKey) {
      throw new Error('GEMINI_API_KEY is not set')
    }

    console.log(`Generating menu courses with prompt: ${prompt}, guestCount: ${guestCount}, courseCount: ${courseCount}`)

    // Special formatting for menu generation
    const menuPrompt = `
    ${prompt}
    
    IMPORTANT: 
    - Please respond with ONLY a JSON array of exactly ${courseCount} specific dish names
    - Format: ["Dish Name 1", "Dish Name 2", "Dish Name 3", ...]
    - Each dish should be a specific dish name, not a generic course type
    - No explanations, comments, or other text outside the JSON array
    - Example correct response: ["Garlic Butter Shrimp", "Beef Wellington", "Tiramisu"]
    `;

    const requestBody = {
      contents: [{
        parts: [{
          text: menuPrompt
        }]
      }],
      generationConfig: {
        temperature: 0.7,
        maxOutputTokens: 500,
        responseMimeType: 'application/json'
      }
    }

    console.log('Menu generation request body:', JSON.stringify(requestBody, null, 2))

    const response = await fetch(`${GEMINI_API_URL}?key=${apiKey}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestBody),
    })

    const responseData = await response.json()
    console.log('Menu generation raw response:', JSON.stringify(responseData, null, 2))

    if (!response.ok) {
      throw new Error(`Gemini API error: ${response.status} ${response.statusText}\nResponse: ${JSON.stringify(responseData)}`)
    }

    const generatedContent = responseData.candidates?.[0]?.content?.parts?.[0]?.text
    if (!generatedContent) {
      throw new Error('No content generated')
    }

    // Clean and parse the JSON
    const cleanedContent = cleanJsonResponse(generatedContent)
    console.log('Cleaned menu content:', cleanedContent)

    let courses
    try {
      courses = JSON.parse(cleanedContent)
    } catch (error) {
      // If parsing fails, try to extract the array from the text
      console.error('Failed to parse courses JSON, trying to extract array:', error)
      
      // Handle the case where the response contains text that's not just the JSON array
      const arrayMatch = generatedContent.match(/\[.*\]/s);
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

    // Make sure we have exactly the requested number of courses
    if (courses.length > courseCount) {
      courses = courses.slice(0, courseCount);
    } else if (courses.length < courseCount) {
      // If we don't have enough, pad with generic courses
      const genericCourses = [
        "Grilled Salmon with Lemon Butter", 
        "Roasted Vegetable Risotto", 
        "Beef Tenderloin with Red Wine Sauce",
        "Chocolate Soufflé",
        "Mushroom and Truffle Pasta"
      ];
      
      while (courses.length < courseCount) {
        courses.push(genericCourses[courses.length % genericCourses.length]);
      }
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
    6. DO NOT include any text outside the JSON object
    7. DO NOT wrap the response in markdown code blocks`

    const recipe = await generateRecipeWithRetry(prompt)

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
