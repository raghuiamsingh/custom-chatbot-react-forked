import React from "react";

/**
 * Introduction message displayed when the chat is empty or when starting a new chat
 */
export const INTRODUCTION_MESSAGE = "**Hi! I'm JAINE, your product discovery sidekick.**\nWhen you need to quickly identify the right product for a client, I'm here to help. Share the health concern, goal, or ingredient preference, and I'll streamline your search so you can make confident, targeted recommendations without digging through the entire catalog.\n\nTell me what your client needs, and I'll do the heavy lifting.";

/**
 * Suggested questions organized by category
 * Single source of truth for all suggested questions
 */
export const SUGGESTED_QUESTIONS_BY_CATEGORY: Record<string, string[]> = {
  sleep: [
    "What supplements support healthy sleep cycles?",
    "What ingredients are commonly used for sleep support?",
    "Which products help promote relaxation?",
  ],
  stress: [
    "What supplements are effective for stress management?",
    "Which ingredients help support a calm nervous system?",
    "What products help reduce occasional tension?",
    "What supplements support emotional resilience?",
    "Which products help the body cope with mental pressure?",
  ],
  energy: [
    "What supplements support daily energy levels?",
    "Which ingredients help reduce fatigue?",
    "What products support sustained energy throughout the day?",
    "Which supplements help reduce mid-day energy crashes?",
    "What ingredients support natural ATP production?",
    "Which products help improve physical stamina?",
    "What supplements support energy without stimulants?",
  ],
  cognitive: [
    "What products support focus and concentration?",
    "What can improve mental clarity?",
    "What supplements are used for brain health?",
    "Which products help with cognitive performance?",
    "What supplements support neurotransmitter balance?",
  ],
  immunity: [
    "What supplements help strengthen the immune system?",
    "Which products support seasonal immunity?",
    "What supplements support the body's natural defense response?",
    "Which ingredients help promote upper respiratory immune health?",
    "What products support immune function during environmental challenges?",
  ],
  gut: [
    "What products improve gut health?",
    "Which supplements support digestion and nutrient absorption?",
    "What helps balance the gut microbiome?",
    "What products reduce bloating and gas?",
    "Which supplements support regular bowel movements?",
    "What can help with occasional acidity or indigestion?",
  ],
  skin_hair_beauty: [
    "What supplements support healthy skin?",
    "Which products help improve hair strength?",
    "What supports nail health?",
    "What ingredients promote skin hydration?",
    "What products help maintain collagen levels in the body?",
  ],
  weight_metabolism: [
    "What supplements support healthy weight management?",
    "Which products help improve metabolism?",
    "What supports appetite or craving control?",
  ],
  fitness_recovery: [
    "What supplements help with workout recovery?",
    "Which ingredients promote muscle repair?",
    "What supports lean muscle growth?",
    "What supplements help reduce inflammation after exercise?",
  ],
  women_health: [
    "What supports hormonal balance in women?",
    "Which supplements support menstrual comfort?",
    "What products help with PMS symptom support?",
    "What supports women's reproductive health?",
    "What supplements are used for perimenopause or menopause support?",
  ],
  men_health: [
    "What supports men's overall vitality?",
    "Which products support testosterone health?",
    "What supplements help with men's performance and energy?",
  ],
  joints_bones_inflammation: [
    "What supports joint comfort and mobility?",
    "Which supplements help reduce inflammation in the body?",
    "What supports bone strength and density?",
  ],
  blood_sugar: [
    "What supplements support healthy blood sugar levels?",
    "Which products help regulate insulin response?",
    "What supplements support balanced carbohydrate metabolism?",
    "Which ingredients help maintain stable glucose levels?",
    "What products support insulin sensitivity?",
  ],
  aging_longevity: [
    "What supplements support healthy aging and longevity?",
    "Which products support cellular health over time?",
    "What supplements promote healthy mitochondrial function?",
    "Which ingredients help protect against age-related oxidative stress?",
    "What products support long-term vitality and healthy lifespan?",
  ],
  liver_detox: [
    "Which supplements support healthy liver function?",
    "What products support healthy detoxification pathways?",
    "What ingredients promote natural toxin elimination?",
    "Which supplements help protect liver cells from stress?",
    "What products support optimal phase I and phase II detox processes?",
  ],
};

/**
 * Helper function to parse markdown bold (**text**) and convert to JSX
 */
export const parseMarkdownBold = (text: string): React.ReactNode => {
  const parts: React.ReactNode[] = [];
  const regex = /\*\*(.*?)\*\*/g;
  let lastIndex = 0;
  let match;

  while ((match = regex.exec(text)) !== null) {
    // Add text before the match
    if (match.index > lastIndex) {
      parts.push(text.substring(lastIndex, match.index));
    }
    // Add the bold text
    parts.push(<strong key={match.index}>{match[1]}</strong>);
    lastIndex = regex.lastIndex;
  }

  // Add remaining text
  if (lastIndex < text.length) {
    parts.push(text.substring(lastIndex));
  }

  return parts.length > 0 ? parts : text;
};

/**
 * Utility function to randomly select 4 unique categories and 1 question from each
 * @returns Array of 4 questions, one from each randomly selected category
 */
export const getRandomSuggestedQuestions = (): string[] => {
  const categories = Object.keys(SUGGESTED_QUESTIONS_BY_CATEGORY);
  
  // Shuffle categories array
  const shuffledCategories = [...categories].sort(() => Math.random() - 0.5);
  
  // Pick 4 unique categories
  const selectedCategories = shuffledCategories.slice(0, 4);
  
  // Pick 1 random question from each selected category
  const questions = selectedCategories.map((category) => {
    const categoryQuestions = SUGGESTED_QUESTIONS_BY_CATEGORY[category];
    const randomIndex = Math.floor(Math.random() * categoryQuestions.length);
    return categoryQuestions[randomIndex];
  });
  
  return questions;
};

/**
 * Generate multiple sets of suggested questions (for fallback scenarios)
 * Each set contains 4 questions from different categories
 * @param numSets Number of sets to generate (default: 3)
 * @returns Array of question sets, each containing 4 questions
 */
export const generateSuggestedQuestionSets = (numSets: number = 3): string[][] => {
  const sets: string[][] = [];
  for (let i = 0; i < numSets; i++) {
    sets.push(getRandomSuggestedQuestions());
  }
  return sets;
};

