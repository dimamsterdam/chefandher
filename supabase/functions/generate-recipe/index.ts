import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const PERPLEXITY_API_URL = 'https://api.perplexity.ai/chat/completions'

function cleanJsonResponse(response: string): string {
  console.log("Cleaning JSON response:", response);
  
  // First, try to extract a JSON object if it's embedded in text
  const jsonObjectMatch = response.match(/\{[\s\S]*\}/);
  if (jsonObjectMatch) {
    console.log("Found JSON object in response");
    return jsonObjectMatch[0].trim();
  }
  
  // Otherwise, remove markdown code block syntax
  let cleaned = response
    .replace(/^```(?:json)?\s*/im, '')  // Remove opening ```json or ``` (case insensitive)
    .replace(/```\s*$/m, '')            // Remove closing ```
    .trim();                            // Remove any extra whitespace
  
  console.log("Cleaned response:", cleaned);
  return cleaned;
}

async function generateRecipeWithRetry(prompt: string, maxRetries = 2): Promise<any> {
  let lastError: Error | null = null;
  
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      console.log(`Attempt ${attempt + 1}: Starting recipe generation`)
      const apiKey = Deno.env.get('PERPLEXITY_API_KEY')
      if (!apiKey) {
        throw new Error('PERPLEXITY_API_KEY is not set')
      }

      const requestBody = {
        model: 'llama-3.1-sonar-large-128k-online',
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
            Never include any additional text or fields.
            DO NOT wrap the JSON in markdown code blocks.`
          },
          { role: 'user', content: prompt }
        ],
        temperature: 0.0,
        max_tokens: 1000,
      }

      console.log('Request body:', JSON.stringify(requestBody))

      const response = await fetch(PERPLEXITY_API_URL, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
      })

      const responseText = await response.text()
      console.log(`Attempt ${attempt + 1} raw response:`, responseText.substring(0, 500) + (responseText.length > 500 ? "..." : ""))

      if (!response.ok) {
        throw new Error(`Perplexity API error: ${response.status} ${response.statusText}\nResponse: ${responseText.substring(0, 200)}...`)
      }

      let data
      try {
        data = JSON.parse(responseText)
      } catch (error) {
        console.error('Failed to parse API response:', error)
        throw new Error(`Invalid JSON response: ${responseText.substring(0, 200)}...`)
      }

      console.log(`Attempt ${attempt + 1} parsed response:`, JSON.stringify(data).substring(0, 500) + "...")

      if (!data.choices?.[0]?.message?.content) {
        throw new Error('Invalid API response structure')
      }

      // Clean the response content before parsing
      const cleanedContent = cleanJsonResponse(data.choices[0].message.content)
      console.log(`Attempt ${attempt + 1} cleaned content:`, cleanedContent.substring(0, 500) + "...")

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
              console.log(`Successfully extracted JSON on final attempt:`, JSON.stringify(recipe))
            } catch (deepError) {
              throw new Error(`Could not extract valid JSON: ${cleanedContent.substring(0, 200)}...`)
            }
          } else {
            throw new Error(`Invalid recipe JSON: ${cleanedContent.substring(0, 200)}...`)
          }
        } else {
          throw error; // Re-throw for retry
        }
      }

      console.log(`Attempt ${attempt + 1} parsed recipe:`, JSON.stringify(recipe))
      
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
        console.log("Invalid prep time, fixing:", recipe.prep_time_minutes);
        recipe.prep_time_minutes = 30; // Default to 30 minutes if invalid
      }
      if (typeof recipe.cook_time_minutes !== 'number' || recipe.cook_time_minutes < 5 || recipe.cook_time_minutes > 180) {
        console.log("Invalid cook time, fixing:", recipe.cook_time_minutes);
        recipe.cook_time_minutes = 45; // Default to 45 minutes if invalid
      }
      if (typeof recipe.servings !== 'number') {
        console.log("Invalid servings, fixing:", recipe.servings);
        recipe.servings = 4; // Default to 4 servings if invalid
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

async function generateMenuCoursesWithRecipes(prompt: string, guestCount: number, courseCount: number): Promise<any[]> {
  try {
    const apiKey = Deno.env.get('PERPLEXITY_API_KEY')
    if (!apiKey) {
      throw new Error('PERPLEXITY_API_KEY is not set')
    }

    console.log(`Generating menu courses with prompt: ${prompt}, guestCount: ${guestCount}, courseCount: ${courseCount}`)

    const requestBody = {
      model: 'llama-3.1-sonar-large-128k-online',
      messages: [
        { 
          role: 'system', 
          content: `You are a professional chef that creates elegant, sophisticated menus.
          You will respond with ONLY a simple JSON array of dish names (NOT course types).
          Do not include any markdown, just return the raw JSON array.
          
          Example response: ["Truffle Risotto with Wild Mushrooms", "Herb-crusted Rack of Lamb", "Chocolate Soufflé with Vanilla Bean Ice Cream"]
          
          IMPORTANT GUIDELINES:
          - Each dish name should be specific, descriptive, and appetizing
          - Include EXACTLY ${courseCount} dishes appropriate for the requested menu theme
          - Do not use generic terms like "Appetizer", "Main Course", or "Dessert"
          - THE LAST DISH MUST ALWAYS BE A DESSERT (e.g., "Lemon Tart with Fresh Berries", "Tiramisu", "Crème Brûlée")
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

    console.log('Menu generation request body:', JSON.stringify(requestBody))

    const response = await fetch(PERPLEXITY_API_URL, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestBody),
    })

    const responseText = await response.text()
    console.log('Menu generation raw response:', responseText.substring(0, 500) + (responseText.length > 500 ? "..." : ""))

    if (!response.ok) {
      throw new Error(`Perplexity API error: ${response.status} ${response.statusText}\nResponse: ${responseText.substring(0, 200)}...`)
    }

    let data
    try {
      data = JSON.parse(responseText)
    } catch (error) {
      console.error('Failed to parse API response:', error)
      throw new Error(`Invalid JSON response: ${responseText.substring(0, 200)}...`)
    }

    if (!data.choices?.[0]?.message?.content) {
      throw new Error('Invalid API response structure')
    }

    // Clean the response content before parsing
    const cleanedContent = cleanJsonResponse(data.choices[0].message.content)
    console.log('Cleaned menu content:', cleanedContent)

    let courseNames
    try {
      courseNames = JSON.parse(cleanedContent)
    } catch (error) {
      // If parsing fails, try to extract the array from the text
      console.error('Failed to parse courses JSON, trying to extract array:', error)
      
      // Handle the case where the response contains text that's not just the JSON array
      const arrayMatch = cleanedContent.match(/\[.*\]/s);
      if (arrayMatch) {
        try {
          courseNames = JSON.parse(arrayMatch[0]);
          console.log('Extracted array from text:', courseNames);
        } catch (extractError) {
          console.error('Failed to extract array:', extractError);
          throw new Error(`Could not parse courses from response: ${cleanedContent}`);
        }
      } else {
        throw new Error(`Could not find array in response: ${cleanedContent}`);
      }
    }

    if (!Array.isArray(courseNames)) {
      throw new Error('Courses must be an array')
    }
    
    // Verify that we have at least one course that looks like a dessert
    // If not, replace the last course with a default dessert option
    const lastCourse = courseNames[courseNames.length - 1].toLowerCase();
    const dessertKeywords = ['cake', 'tart', 'pudding', 'soufflé', 'ice cream', 'sorbet', 'mousse', 
                           'crème', 'chocolate', 'panna cotta', 'tiramisu', 'cheesecake', 'dessert',
                           'brûlée', 'custard', 'pie', 'sweet', 'caramel'];
    
    const isDessert = dessertKeywords.some(keyword => lastCourse.includes(keyword.toLowerCase()));
    
    if (!isDessert && courseNames.length > 0) {
      console.log('Last course does not appear to be a dessert, replacing with dessert option');
      // Replace the last course with a dessert that matches the theme
      const dessertOptions = [
        "Classic Vanilla Bean Crème Brûlée",
        "Dark Chocolate Mousse with Fresh Berries",
        "Lemon Tart with Raspberry Coulis",
        "Tiramisu with Espresso-Soaked Ladyfingers",
        "Warm Apple Tart with Vanilla Ice Cream"
      ];
      courseNames[courseNames.length - 1] = dessertOptions[Math.floor(Math.random() * dessertOptions.length)];
    }

    // Convert course names to course objects with titles
    const coursesWithTitles = courseNames.map(title => ({
      title,
    }));

    console.log('Generated menu courses:', coursesWithTitles);
    return coursesWithTitles;
  } catch (error) {
    console.error('Menu generation error:', error);
    throw error;
  }
}

serve(async (req) => {
  console.log("=== New recipe API request received ===");
  console.log("Request headers:", req.headers);
  
  if (req.method === 'OPTIONS') {
    console.log("Handling CORS preflight request");
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Check if PERPLEXITY_API_KEY is set
    const apiKey = Deno.env.get('PERPLEXITY_API_KEY');
    if (!apiKey) {
      console.error("API Key is missing!");
      return new Response(
        JSON.stringify({ 
          error: 'Missing API key',
          details: 'PERPLEXITY_API_KEY is not configured',
          timestamp: new Date().toISOString()
        }),
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 500 
        }
      );
    }
    
    const body = await req.json();
    console.log("Request body:", JSON.stringify(body));
    
    // Check if this is a menu generation request
    if (body.generateMenu) {
      console.log('Menu generation request:', body);
      
      const { prompt, menuName, guestCount, courseCount, generateRecipes } = body;
      
      if (!prompt) {
        throw new Error('Menu prompt is required');
      }
      
      // Use provided guestCount or default to 4
      const guests = guestCount ? Number(guestCount) : 4;
      
      // Use provided courseCount or default to 3
      const courses = courseCount ? Number(courseCount) : 3;
      
      try {
        // Generate menu courses
        const menuCourses = await generateMenuCoursesWithRecipes(prompt, guests, courses);
      
        console.log("Menu courses generated successfully:", JSON.stringify(menuCourses));
      
        return new Response(JSON.stringify({ courses: menuCourses }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200
        });
      } catch (menuError) {
        console.error("Menu generation failed:", menuError);
        return new Response(
          JSON.stringify({ 
            error: 'Failed to generate menu', 
            details: menuError.message,
            timestamp: new Date().toISOString()
          }),
          { 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 500 
          }
        );
      }
    }
    
    // Otherwise, handle as a recipe generation request
    const { courseTitle, guestCount, requirements } = body;
    console.log('Generating recipe for:', { courseTitle, guestCount, requirements });

    if (!courseTitle || courseTitle === 'undefined') {
      throw new Error('Course title is required');
    }
    
    if (!guestCount || isNaN(Number(guestCount))) {
      throw new Error('Valid guest count is required');
    }

    const actualGuestCount = Number(guestCount);

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
    7. DO NOT wrap the response in markdown code blocks`;

    try {
      const recipe = await generateRecipeWithRetry(prompt);
      
      // Force servings to match requested guest count
      recipe.servings = actualGuestCount;
      
      console.log("Successfully generated recipe:", JSON.stringify(recipe));
  
      return new Response(JSON.stringify(recipe), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200
      });
    } catch (recipeError) {
      console.error("Recipe generation failed:", recipeError);
      return new Response(
        JSON.stringify({ 
          error: 'Failed to generate recipe', 
          details: recipeError.message,
          timestamp: new Date().toISOString()
        }),
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 500 
        }
      );
    }
  } catch (error) {
    console.error('Error in generate-recipe function:', error);
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
    );
  }
});
