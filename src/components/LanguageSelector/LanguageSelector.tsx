import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Globe } from 'lucide-react';
// import { useLanguage } from '../services/languageContext';

interface LanguageSelectorProps {
  isOpen: boolean;
  onClose: () => void;
  currentLanguage: string;
  onLanguageChange: (languageCode: string) => void;
}

const LanguageSelector: React.FC<LanguageSelectorProps> = ({
  isOpen,
  onClose,
  currentLanguage,
  onLanguageChange,
}) => {
  // const { currentLanguage: contextLanguage } = useLanguage();

  const languages = [
    { code: 'en', name: 'English', flag: '🇺🇸' },
    { code: 'es', name: 'Español', flag: '🇪🇸' },
    { code: 'fr', name: 'Français', flag: '🇫🇷' },
    { code: 'de', name: 'Deutsch', flag: '🇩🇪' },
    { code: 'it', name: 'Italiano', flag: '🇮🇹' },
    { code: 'pt', name: 'Português', flag: '🇵🇹' },
    { code: 'ru', name: 'Русский', flag: '🇷🇺' },
    { code: 'ja', name: '日本語', flag: '🇯🇵' },
    { code: 'zh', name: '中文', flag: '🇨🇳' },
    { code: 'hi', name: 'हिन्दी', flag: '🇮🇳' },
    { code: 'ar', name: 'العربية', flag: '🇸🇦' },
    { code: 'bn', name: 'বাংলা', flag: '🇧🇩' },
    { code: 'te', name: 'తెలుగు', flag: '🇮🇳' },
    { code: 'ta', name: 'தமிழ்', flag: '🇮🇳' },
    { code: 'gu', name: 'ગુજરાતી', flag: '🇮🇳' },
    { code: 'mr', name: 'मराठी', flag: '🇮🇳' },
    { code: 'kn', name: 'ಕನ್ನಡ', flag: '🇮🇳' },
    { code: 'ml', name: 'മലയാളം', flag: '🇮🇳' },
    { code: 'pa', name: 'ਪੰਜਾਬੀ', flag: '🇮🇳' },
    { code: 'ur', name: 'اردو', flag: '🇵🇰' },
    { code: 'or', name: 'ଓଡ଼ିଆ', flag: '🇮🇳' },
    { code: 'as', name: 'অসমীয়া', flag: '🇮🇳' },
    { code: 'ne', name: 'नेपाली', flag: '🇳🇵' },
    { code: 'ko', name: '한국어', flag: '🇰🇷' },
  ];

  const handleLanguageSelect = (languageCode: string) => {
    onLanguageChange(languageCode);
  };

  return (
    <>
      <style>
        {`
          .language-modal-container {
            position: fixed !important;
            top: 0 !important;
            left: 0 !important;
            right: 0 !important;
            bottom: 0 !important;
            display: flex !important;
            align-items: center !important;
            justify-content: center !important;
            z-index: 1000 !important;
            pointer-events: none !important;
          }
          .language-modal-content {
            pointer-events: auto !important;
            position: relative !important;
            top: auto !important;
            left: auto !important;
            transform: none !important;
          }
        `}
      </style>
      <AnimatePresence>
        {isOpen && (
          <div className="language-modal-container">
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={onClose}
              style={{
                position: 'absolute',
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                backgroundColor: 'rgba(0, 0, 0, 0.5)',
                zIndex: 1000,
              }}
            />

          {/* Modal */}
          <motion.div
            className="language-modal-content"
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            transition={{ type: 'spring', stiffness: 300, damping: 25 }}
            onClick={(e) => e.stopPropagation()}
            style={{
              background: '#ffffff',
              borderRadius: '16px',
              padding: '24px',
              width: '90vw',
              maxWidth: '500px',
              maxHeight: '70vh',
              overflow: 'auto',
              boxShadow: '0 20px 40px rgba(0, 0, 0, 0.15)',
              zIndex: 1001,
              margin: '0',
              display: 'flex',
              flexDirection: 'column',
            }}
          >
            {/* Header */}
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: '20px',
                paddingBottom: '16px',
                borderBottom: '1px solid #e5e7eb',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <Globe size={24} color="#6366f1" />
                <h2 style={{ margin: 0, fontSize: '20px', fontWeight: '600', color: '#1f2937' }}>
                  Select Language
                </h2>
              </div>
              <motion.button
                onClick={onClose}
                whileHover={{ scale: 1.1, rotate: 90 }}
                whileTap={{ scale: 0.9 }}
                style={{
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  color: '#6b7280',
                  fontSize: '1.5rem',
                  padding: '4px',
                }}
              >
                <X size={24} />
              </motion.button>
            </div>

            {/* Language Grid */}
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
                gap: '8px',
                maxHeight: '350px',
                overflowY: 'auto',
                flex: 1,
                minHeight: 0,
              }}
            >
              {languages.map((language) => (
                <motion.button
                  key={language.code}
                  onClick={() => handleLanguageSelect(language.code)}
                  whileHover={{ scale: 1.02, backgroundColor: '#f3f4f6' }}
                  whileTap={{ scale: 0.98 }}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '12px',
                    padding: '12px 16px',
                    border: currentLanguage === language.code ? '2px solid #6366f1' : '1px solid #e5e7eb',
                    borderRadius: '8px',
                    background: currentLanguage === language.code ? '#eef2ff' : '#ffffff',
                    cursor: 'pointer',
                    textAlign: 'left',
                    transition: 'all 0.2s ease',
                  }}
                >
                  <span style={{ fontSize: '20px' }}>{language.flag}</span>
                  <div>
                    <div
                      style={{
                        fontWeight: currentLanguage === language.code ? '600' : '500',
                        color: currentLanguage === language.code ? '#6366f1' : '#1f2937',
                        fontSize: '14px',
                      }}
                    >
                      {language.name}
                    </div>
                    <div
                      style={{
                        fontSize: '12px',
                        color: '#6b7280',
                        textTransform: 'uppercase',
                      }}
                    >
                      {language.code}
                    </div>
                  </div>
                  {currentLanguage === language.code && (
                    <motion.div
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      style={{
                        marginLeft: 'auto',
                        color: '#6366f1',
                        fontSize: '16px',
                      }}
                    >
                      ✓
                    </motion.div>
                  )}
                </motion.button>
              ))}
            </div>
          </motion.div>
          </div>
        )}
      </AnimatePresence>
    </>
  );
};

export default LanguageSelector;
