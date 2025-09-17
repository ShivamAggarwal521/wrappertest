// Chat service for API integration
export interface ChatMessage {
  id: number;
  text: string;
  sender: 'user' | 'bot';
  timestamp: Date;
  isButton?: boolean;
  isFile?: boolean;
  fileName?: string;
}

export interface ApiResponse {
  success: boolean;
  message: string;
  data?: any;
}

// Backend API Response Interface
export type BackendApiResponse = {
  web_used: any[] | undefined;
  query: string;
  translated_query?: string;
  answer: string;
  predicted_questions?: string[];
  time_taken?: number;
  chunks_used?: string[];
  language?: string;
};

// Language code mapping utility
export const getApiLanguageCode = (languageCode: string): string => {
  const languageCodeMap: { [key: string]: string } = {
  'en': 'en-IN',
  'hi': 'hi-IN',
  'es': 'es',
  'fr': 'fr',
  'de': 'de',
  'it': 'it',
  'pt': 'pt',
  'ru': 'ru',
  'ja': 'ja',
  'zh': 'zh-Hans',
  'ko': 'ko',
  'ar': 'ar',
  'bn': 'bn-IN',
  'ta': 'ta-IN',
  'te': 'te-IN',
  'gu': 'gu-IN',
  'kn': 'kn-IN',
  'ml': 'ml-IN',
  'mr': 'mr-IN',
  'pa': 'pa-IN',
  'ur': 'ur-IN',  // changed from 'ur-PK' to 'ur-IN' based on available `languages` array
  'ne': 'ne',
  'or': 'or-IN',
  'as': 'as-IN',
  'brx': 'brx',
  'doi': 'doi',
  'gom': 'gom',
  'ks': 'ks',
  'mai': 'mai',
  'mni': 'mni',
  'sat': 'sat',
  'sd': 'sd',
  'ms': 'ms',
};

  
  return languageCodeMap[languageCode] || 'en-IN';
};

// Real API call to your FastAPI backend
export const sendMessageToAPI = async (
  message: string,
  context?: string,
  langCode?: string
): Promise<BackendApiResponse> => {
  try {
    const response = await fetch('http://10.150.0.4:8000/query', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        query: message,
        lang_code: langCode || 'en-IN'
      })
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data: BackendApiResponse = await response.json();
    return data; // ✅ keep everything (including predicted_questions)
  } catch (error) {
    console.error('Error calling backend API:', error);
    if (error instanceof TypeError && error.message.includes('fetch')) {
      console.log('Network error - API server may not be running at http://10.150.0.4:8000');
    } else if (error instanceof Error && error.message.includes('HTTP error')) {
      console.log('API server responded with an error');
    }

    console.log('Falling back to simulated response...');
    // Ensure fallback returns the SAME SHAPE as BackendApiResponse
    const fallbackAnswer = generateSmartResponse(message, context); // likely a string now
    return {
      query: message,
      translated_query: message,
      answer: typeof fallbackAnswer === 'string' ? fallbackAnswer : String(fallbackAnswer),
      predicted_questions: [
        'Can you explain more?',
        'Show an example.',
        'Give me related topics.'
      ],
      time_taken: 0,
      chunks_used: [],
      language: langCode || 'en-IN',
      web_used: undefined
    };
  }
};


// Enhanced response generation (fallback when backend is unavailable)
const generateSmartResponse = (userMessage: string, _context?: string): string => {
  const message = userMessage.toLowerCase();

  if (message.includes('hello') || message.includes('hi') || message.includes('hey')) {
    return "Hi there! 👋 How can I support you today? You can ask me about health, fitness, diet, medications, or upload documents for analysis.";
  }

  if (message.includes('health') || message.includes('report') || message.includes('medical')) {
    return "Sure! I can assist you with health-related topics like:\n• Analyzing medical reports\n• Providing health recommendations\n• Tracking symptoms\nHow can I help you today? 🩺";
  }

  if (message.includes('symptom') || message.includes('pain') || message.includes('fever')) {
    return "I understand you're not feeling well. Can you describe your symptoms in more detail? This will help me give you better guidance.";
  }

  if (message.includes('medication') || message.includes('medicine') || message.includes('pill')) {
    return "Let's talk medications! 💊 You can ask about drug usage, interactions, side effects, or set up a reminder.";
  }

  if (message.includes('appointment') || message.includes('doctor') || message.includes('hospital')) {
    return "While I can't book appointments directly, I can help you prepare for doctor visits or remind you of appointments. What do you need help with?";
  }

  if (message.includes('diet') || message.includes('nutrition') || message.includes('food')) {
    return "Looking for healthy eating tips? 🥗 I can assist with balanced diets, meal planning, and nutrition facts. What are your goals?";
  }

  if (message.includes('exercise') || message.includes('workout') || message.includes('fitness')) {
    return "Fitness time! 💪 Whether you're just starting or a gym regular, I can offer workout suggestions, routines, or health benefits.";
  }

  if (message.includes('stress') || message.includes('mental') || message.includes('anxiety') || message.includes('sleep')) {
    return "Mental well-being matters! 🧘 I can guide you with:\n• Breathing exercises\n• Sleep tips\n• Managing stress\nLet me know what you’re experiencing.";
  }

  if (message.includes('reminder') || message.includes('alarm') || message.includes('notification')) {
    return "Want to set a reminder? ⏰ I can help you remember to take meds, drink water, or go for a walk. What should I remind you about?";
  }

  if (message.includes('weather') || message.includes('temperature')) {
    return "I'm not equipped with live weather data, but I can suggest ways to stay healthy in any weather! Would you like tips for cold, heat, or rain?";
  }

  if (message.includes('name') || message.includes('who are you') || message.includes('anuvadini') || message.includes('anuvadi')) {
    return "I'm Anuvadini 🤖 — your AI-powered health assistant. I help break down language barriers by providing multilingual support for health queries, document analysis, and medical information. I can assist you in multiple languages including Hindi, English, and many others. Ask me anything about health, wellness, or medical documents!";
  }

  if (message.includes('thank') || message.includes('thanks')) {
    return "You're very welcome! 😊 I'm always here if you need support or have more questions.";
  }

  if (message.includes('bye') || message.includes('goodbye')) {
    return "Goodbye! Take care and stay healthy. 👋 Come back anytime if you need help.";
  }

  if (message.includes('file') || message.includes('document') || message.includes('upload')) {
    return "To analyze a document, click the 📎 icon and upload a PDF, image, or health report. I’ll read and summarize it for you!";
  }

  if (message.includes('help') || message.includes('support')) {
    return "Here’s what I can help with:\n🩺 Health queries\n📁 File/document analysis\n💊 Medication support\n🧘 Mental wellness\n📆 Reminders\n\nJust ask what you need!";
  }

  // 🔄 Default fallback responses
  const defaultResponses = [
    "That’s a good question! Could you please give me a bit more detail?",
    "I'm listening. Tell me more so I can assist you better!",
    "Hmm, interesting! Could you clarify what you're looking for?",
    "I didn’t quite catch that. Want to rephrase it slightly?",
    "Tell me more! I’d love to help you understand or explore this.",
    "I'm here to help! Try asking about a health topic, uploading a file, or describing a symptom.",
    "I’m not sure I understand that yet — but I’m learning! 😊 Can you ask differently?"
  ];

  return defaultResponses[Math.floor(Math.random() * defaultResponses.length)];
};


// File processing simulation
export const processFile = async (file: File): Promise<string> => {
  return new Promise((resolve) => {
    setTimeout(() => {
      const fileType = file.type;
      const fileName = file.name;
      
      if (fileType.includes('image')) {
        resolve(`I've analyzed your image "${fileName}". This appears to be a medical image. I can help you understand general information about medical imaging, but please consult with a healthcare professional for proper diagnosis and treatment.`);
      } else if (fileType.includes('pdf') || fileType.includes('document')) {
        resolve(`I've received your document "${fileName}". I can help you understand medical documents, lab results, or health reports. What specific information would you like me to explain or analyze?`);
      } else {
        resolve(`I've received your file "${fileName}". I can help you with various types of documents. What would you like me to help you with regarding this file?`);
      }
    }, 2000);
  });
};

