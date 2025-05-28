import React from 'react';
import type { IdeaPromptPair } from '../types';

interface PromptCardProps {
  item: IdeaPromptPair;
  index: number;
  onGenerateImage: (index: number, prompt: string) => void;
  isGeneratingImage: boolean; // True if this specific card's image is being generated
  isGeneratingAllImages: boolean; // True if the "Generate All Images" batch process is active
}

const PromptCard: React.FC<PromptCardProps> = ({ item, index, onGenerateImage, isGeneratingImage, isGeneratingAllImages }) => {
  
  const handleGenerateImageClick = () => {
    // This click is only enabled if effectiveButtonDisabled is false.
    // The parent App component's onGenerateImage callback has its own guards too.
    onGenerateImage(index, item.prompt);
  };

  let buttonText = 'Generate Image';
  let buttonStyles = "bg-gradient-to-r from-purple-500 to-indigo-600 hover:from-purple-600 hover:to-indigo-700 focus:ring-purple-300";
  let showSpinner = false;

  // Determine button disabled state and text
  const effectivelyDisabled = 
    isGeneratingImage || 
    isGeneratingAllImages ||
    (item.generatedImageBase64 && !item.imageError);

  if (isGeneratingImage) {
    buttonText = 'Generating...';
    showSpinner = true;
    buttonStyles = "bg-gradient-to-r from-purple-500 to-indigo-600 focus:ring-purple-300"; 
  } else if (item.generatedImageBase64 && !item.imageError) {
    buttonText = 'Image Ready';
    buttonStyles = "bg-gradient-to-r from-green-500 to-emerald-600 cursor-default focus:ring-green-300";
  } else if (item.imageError) {
    buttonText = 'Retry Image Gen';
    buttonStyles = "bg-gradient-to-r from-red-500 to-orange-600 hover:from-red-600 hover:to-orange-700 focus:ring-red-300";
  } else if (isGeneratingAllImages) {
    // Card is waiting for batch processing, show default text but button will be disabled
    buttonText = 'Generate Image'; 
  }


  return (
    <div className="bg-slate-800 shadow-xl rounded-lg p-6 transition-all hover:shadow-2xl hover:scale-[1.01] flex flex-col justify-between h-full">
      <div>
        <h3 className="text-xl font-semibold text-sky-400 mb-2">
          Idea #{index + 1}: <span className="text-sky-300">{item.idea}</span>
        </h3>
        <p className="text-slate-300 leading-relaxed text-sm italic mb-1">Creative Prompt:</p>
        <p className="text-slate-200 leading-relaxed bg-slate-700 p-3 rounded-md text-sm mb-4 min-h-[60px]">
          {item.prompt}
        </p>
      </div>
      <div className="mt-auto">
        <button
          onClick={handleGenerateImageClick}
          disabled={effectivelyDisabled}
          className={`w-full px-4 py-2 text-sm font-semibold text-white rounded-lg focus:outline-none focus:ring-4 focus:ring-opacity-50 transition-all duration-150 ease-in-out ${effectivelyDisabled ? 'disabled:opacity-70 disabled:cursor-not-allowed' : ''} ${buttonStyles} flex items-center justify-center`}
          aria-label={item.generatedImageBase64 && !item.imageError ? `Image generated for ${item.idea}` : `Generate image for ${item.idea}`}
          aria-live="polite"
        >
          {showSpinner && ( 
            <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
          )}
          {buttonText}
        </button>
        {item.imageError && !isGeneratingImage && ( 
          <p className="text-xs text-red-400 mt-2 text-center" role="alert">{item.imageError}</p>
        )}
         {item.generatedImageBase64 && !isGeneratingImage && !item.imageError && (
          <p className="text-xs text-green-400 mt-2 text-center">Image generated successfully!</p>
        )}
      </div>
    </div>
  );
};

export default PromptCard;
