import { GoogleGenAI, Type } from '@google/genai';
import { DietPlan, WorkoutPlan } from '../types';

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

interface WorkoutParams {
  goal: string;
  level: string;
  days: string;
}

export const generateWorkoutPlan = async (params: WorkoutParams): Promise<WorkoutPlan> => {
    const prompt = `Generate a detailed weekly workout plan for a user with the following details: Goal: ${params.goal}, Fitness Level: ${params.level}, Days per week: ${params.days}.`;

    const workoutPlanSchema = {
      type: Type.OBJECT,
      properties: {
        plan: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              day: { type: Type.STRING },
              focus: { type: Type.STRING },
              exercises: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    name: { type: Type.STRING },
                    sets: { type: Type.STRING },
                    reps: { type: Type.STRING },
                    rest: { type: Type.STRING },
                    description: { type: Type.STRING },
                  },
                  required: ['name', 'sets', 'reps', 'rest', 'description'],
                },
              },
            },
            required: ['day', 'focus', 'exercises'],
          },
        },
      },
      required: ['plan'],
    };

    const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: prompt,
        config: {
            systemInstruction: "You are an expert fitness coach. Generate a detailed, weekly workout plan in JSON format based on the user's specifications. The plan should be structured by day and include exercises, sets, reps, and rest periods. Provide a brief description for each exercise.",
            responseMimeType: 'application/json',
            responseSchema: workoutPlanSchema,
        },
    });
    
    const text = response.text.trim();
    return JSON.parse(text) as WorkoutPlan;
};


interface DietParams {
  goal: string;
  calories: string;
  preference: string;
}

export const generateDietPlan = async (params: DietParams): Promise<DietPlan> => {
    const prompt = `Generate a diet plan for a user with the following details: Goal: ${params.goal}, Daily Caloric Target: ${params.calories}, Dietary Preference: ${params.preference}.`;
    
    const dietPlanSchema = {
        type: Type.OBJECT,
        properties: {
            plan: {
                type: Type.ARRAY,
                items: {
                    type: Type.OBJECT,
                    properties: {
                        day: { type: Type.STRING },
                        meals: {
                            type: Type.OBJECT,
                            properties: {
                                breakfast: {
                                    type: Type.OBJECT,
                                    properties: {
                                        name: { type: Type.STRING },
                                        description: { type: Type.STRING },
                                        calories: { type: Type.NUMBER },
                                    },
                                    required: ['name', 'description', 'calories'],
                                },
                                lunch: {
                                    type: Type.OBJECT,
                                    properties: {
                                        name: { type: Type.STRING },
                                        description: { type: Type.STRING },
                                        calories: { type: Type.NUMBER },
                                    },
                                    required: ['name', 'description', 'calories'],
                                },
                                dinner: {
                                    type: Type.OBJECT,
                                    properties: {
                                        name: { type: Type.STRING },
                                        description: { type: Type.STRING },
                                        calories: { type: Type.NUMBER },
                                    },
                                    required: ['name', 'description', 'calories'],
                                },
                                snack: {
                                    type: Type.OBJECT,
                                    properties: {
                                        name: { type: Type.STRING },
                                        description: { type: Type.STRING },
                                        calories: { type: Type.NUMBER },
                                    },
                                     required: ['name', 'description', 'calories'],
                                },
                            },
                            required: ['breakfast', 'lunch', 'dinner', 'snack'],
                        },
                        total_calories: { type: Type.NUMBER },
                    },
                    required: ['day', 'meals', 'total_calories'],
                },
            },
        },
        required: ['plan'],
    };

    const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: prompt,
        config: {
            systemInstruction: "You are a professional nutritionist. Create a detailed weekly meal plan in JSON format based on the user's dietary needs and preferences. The plan should be structured by day and meal (Breakfast, Lunch, Dinner, Snack). Include estimated calories for each meal and a brief description.",
            responseMimeType: 'application/json',
            responseSchema: dietPlanSchema,
        },
    });

    const text = response.text.trim();
    return JSON.parse(text) as DietPlan;
};