import { useState } from 'react';
// import abusiveWordsData from '../../Jsonfile/abusiveWords.json'
const abusiveWordsData = {
  "en": ["abuse", "hate", "spam", "offensive"],
  "hi": ["गाली", "नफरत", "स्पैम"],
  "es": ["abuso", "odio", "spam"],
  "fr": ["abus", "haine", "spam"],
  "de": ["missbrauch", "hass", "spam"],
  "it": ["abuso", "odio", "spam"],
  "pt": ["abuso", "ódio", "spam"],
  "ru": ["злоупотребление", "ненависть", "спам"],
  "ja": ["虐待", "憎しみ", "スパム"],
  "zh": ["滥用", "仇恨", "垃圾邮件"],
  "ar": ["إساءة", "كراهية", "بريد مزعج"],
  "bn": ["অপব্যবহার", "ঘৃণা", "স্প্যাম"],
  "ta": ["தவறான பயன்பாடு", "வெறுப்பு", "ஸ்பேம்"],
  "te": ["దుర్వినియోగం", "ద్వేషం", "స్పామ్"],
  "gu": ["દુરુપયોગ", "દ્વેષ", "સ્પામ"],
  "mr": ["दुरुपयोग", "द्वेष", "स्पॅम"],
  "kn": ["ದುರುಪಯೋಗ", "ದ್ವೇಷ", "ಸ್ಪ್ಯಾಮ್"],
  "ml": ["ദുരുപയോഗം", "ദ്വേഷം", "സ്പാം"],
  "pa": ["ਦੁਰਵਰਤੋਂ", "ਨਫਰਤ", "ਸਪੈਮ"],
  "ur": ["غلط استعمال", "نفرت", "اسپیم"],
  "or": ["ଦୁରୁପଯୋଗ", "ଘୃଣା", "ସ୍ପାମ୍"],
  "as": ["দুৰ্ব্যৱহাৰ", "ঘৃণা", "স্পাম"],
  "ne": ["दुरुपयोग", "घृणा", "स्पाम"]
}

const getAllAbusiveWords = (): string[] => {
  const words: string[] = [];
  Object.values(abusiveWordsData).forEach((languageWords: string[]) => {
    words.push(...languageWords);
  });
  return words;
};

const abusiveWords = getAllAbusiveWords();

// Helper function to check if a character is a word boundary
const isWordBoundary = (char: string): boolean => {
  // Check for whitespace, punctuation, or start/end of string
  return /[\s\p{P}]/u.test(char) || char === '';
};

// Helper function to check if a word is at a word boundary
const isWordAtBoundary = (text: string, startIndex: number, wordLength: number): boolean => {
  const beforeChar = startIndex > 0 ? text[startIndex - 1] : '';
  const afterChar = startIndex + wordLength < text.length ? text[startIndex + wordLength] : '';

  return isWordBoundary(beforeChar) && isWordBoundary(afterChar);
};

const filterMessage = (message: string): string => {
  let filteredMessage = message;

  abusiveWords.forEach(word => {
    // Escape special regex characters
    const escapedWord = word.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

    // Create a case-insensitive regex without word boundaries
    const regex = new RegExp(escapedWord, 'gi');

    // Find all matches and check if they're at word boundaries
    let match;
    const matches: Array<{ index: number, word: string }> = [];

    while ((match = regex.exec(message)) !== null) {
      const matchIndex = match.index;
      const matchWord = match[0];

      // Check if this match is at a word boundary
      if (isWordAtBoundary(message, matchIndex, matchWord.length)) {
        matches.push({ index: matchIndex, word: matchWord });
      }
    }

    // Replace matches from end to start to avoid index shifting
    matches.reverse().forEach(({ index, word }) => {
      const before = filteredMessage.substring(0, index);
      const after = filteredMessage.substring(index + word.length);
      filteredMessage = before + '******' + after;
    });
  });

  return filteredMessage;
};

const containsAbuse = (original: string, filtered: string): boolean => {
  return original.toLowerCase() !== filtered.toLowerCase();
};

interface AbuseFilterResult {
  filteredMessage: string;
  isAbusive: boolean;
  violationCount: number;
  incrementViolation: () => void;
  isBanned: boolean;
}

export const useAbuseFilter = (message: string, maxViolations: number = 4): AbuseFilterResult => {
  const [violationCount, setViolationCount] = useState<number>(0);
  const [isBanned, setIsBanned] = useState<boolean>(false);

  const filteredMessage = filterMessage(message);
  const isAbusive = containsAbuse(message, filteredMessage);

  const incrementViolation = () => {
    setViolationCount(prev => {
      const newCount = prev + 1;
      if (newCount >= maxViolations) {
        setIsBanned(true);
      }
      return newCount;
    });
  };

  return { filteredMessage, isAbusive, violationCount, incrementViolation, isBanned };
};