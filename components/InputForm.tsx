import React from 'react';
import type { AspectRatioOption } from '../types';

interface InputFormProps {
  category: string;
  setCategory: (category: string) => void;
  numIdeas: string;
  setNumIdeas: (numIdeas: string) => void;
  aspectRatio: string;
  setAspectRatio: (aspectRatio: string) => void;
  aspectRatioOptions: AspectRatioOption[];
  onSubmit: () => void;
  isLoading: boolean;
}

const InputForm: React.FC<InputFormProps> = ({
  category,
  setCategory,
  numIdeas,
  setNumIdeas,
  aspectRatio,
  setAspectRatio,
  aspectRatioOptions,
  onSubmit,
  isLoading,
}) => {
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit();
  };

  return (
    <form onSubmit={handleSubmit} className="p-6 mb-8 bg-slate-800 shadow-2xl rounded-xl max-w-3xl mx-auto">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
        <div>
          <label htmlFor="category" className="block mb-2 text-sm font-medium text-sky-300">
            Image Category
          </label>
          <input
            type="text"
            id="category"
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            placeholder="e.g., Animals, Landscapes"
            className="w-full px-4 py-3 bg-slate-700 border border-slate-600 rounded-lg text-slate-100 focus:ring-2 focus:ring-sky-500 focus:border-sky-500 outline-none transition-colors"
            required
            aria-label="Image Category"
          />
        </div>
        <div>
          <label htmlFor="numIdeas" className="block mb-2 text-sm font-medium text-sky-300">
            Number of Ideas
          </label>
          <input
            type="number"
            id="numIdeas"
            value={numIdeas}
            onChange={(e) => setNumIdeas(e.target.value)}
            placeholder="e.g., 5"
            min="1"
            max="20" // Max ideas to keep performance reasonable for image gen
            className="w-full px-4 py-3 bg-slate-700 border border-slate-600 rounded-lg text-slate-100 focus:ring-2 focus:ring-sky-500 focus:border-sky-500 outline-none transition-colors"
            required
            aria-label="Number of Ideas"
          />
        </div>
        <div>
          <label htmlFor="aspectRatio" className="block mb-2 text-sm font-medium text-sky-300">
            Aspect Ratio
          </label>
          <select
            id="aspectRatio"
            value={aspectRatio}
            onChange={(e) => setAspectRatio(e.target.value)}
            className="w-full px-4 py-3 bg-slate-700 border border-slate-600 rounded-lg text-slate-100 focus:ring-2 focus:ring-sky-500 focus:border-sky-500 outline-none transition-colors aspect-ratio-select"
            aria-label="Image Aspect Ratio"
          >
            {aspectRatioOptions.map(option => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>
      </div>
      <button
        type="submit"
        disabled={isLoading}
        className="w-full px-6 py-3 font-semibold text-white bg-gradient-to-r from-sky-500 to-blue-600 rounded-lg hover:from-sky-600 hover:to-blue-700 focus:outline-none focus:ring-4 focus:ring-sky-300 focus:ring-opacity-50 transition-all duration-150 ease-in-out disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
      >
        {isLoading ? (
          <>
            <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
            Generating...
          </>
        ) : (
          'Forge Prompts'
        )}
      </button>
    </form>
  );
};

export default InputForm;