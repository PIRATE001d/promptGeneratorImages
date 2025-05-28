import React, { useState, useCallback, useMemo } from 'react';
import JSZip from 'jszip';
import Header from './components/Header';
import InputForm from './components/InputForm';
import PromptCard from './components/PromptCard';
import LoadingSpinner from './components/LoadingSpinner';
import { generateIdeas, generateCreativePrompt, generateImageFromPrompt } from './services/geminiService';
import type { IdeaPromptPair, AspectRatioOption } from './types';

const ASPECT_RATIO_OPTIONS: AspectRatioOption[] = [
  { label: "Square (1:1)", value: "1:1" },
  { label: "Landscape (16:9)", value: "16:9" },
  { label: "Portrait (9:16)", value: "9:16" },
  { label: "Landscape (4:3)", value: "4:3" },
  { label: "Portrait (3:4)", value: "3:4" },
  { label: "Landscape (3:2)", value: "3:2" },
  { label: "Portrait (2:3)", value: "2:3" },
  { label: "Landscape (2:1)", value: "2:1" },
  { label: "Portrait (1:2)", value: "1:2" },
  { label: "Portrait (4:5)", value: "4:5" },
];

const App: React.FC = () => {
  const [category, setCategory] = useState<string>('');
  const [numIdeas, setNumIdeas] = useState<string>('3');
  const [aspectRatio, setAspectRatio] = useState<string>(ASPECT_RATIO_OPTIONS[0].value);
  const [isLoading, setIsLoading] = useState<boolean>(false); // For prompt generation
  const [isGeneratingAllImages, setIsGeneratingAllImages] = useState<boolean>(false); // For batch image generation
  const [loadingMessage, setLoadingMessage] = useState<string>('');
  const [results, setResults] = useState<IdeaPromptPair[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [generatingImageForIndex, setGeneratingImageForIndex] = useState<number | null>(null);

  const handleGeneratePrompts = useCallback(async () => {
    if (!category.trim() || !numIdeas.trim()) {
      setError("Please provide both a category and the number of ideas.");
      return;
    }
    
    const ideasCount = parseInt(numIdeas, 10);
    if (isNaN(ideasCount) || ideasCount <= 0 || ideasCount > 20) {
      setError("Number of ideas must be between 1 and 20.");
      return;
    }

    setIsLoading(true);
    setError(null);
    setResults([]);
    setGeneratingImageForIndex(null);
    setIsGeneratingAllImages(false); // Reset batch generation state
    
    try {
      setLoadingMessage(`Generating ${ideasCount} ideas for "${category}"...`);
      const ideas = await generateIdeas(category, ideasCount);

      if (!ideas || ideas.length === 0) {
        setError("No ideas could be generated. Try a different category or check API key.");
        setIsLoading(false);
        return;
      }
      
      setLoadingMessage(`Generating creative prompts for ${ideas.length} ideas...`);
      
      const promptPromises = ideas.map(async (idea) => {
        const creativePrompt = await generateCreativePrompt(idea);
        return { idea, prompt: creativePrompt, generatedImageBase64: undefined, imageError: undefined, imageFileName: undefined };
      });
      
      const generatedResults = await Promise.all(promptPromises);
      setResults(generatedResults.filter(r => r.prompt && !r.prompt.startsWith("Failed to generate")));
      
      if (generatedResults.some(r => r.prompt && r.prompt.startsWith("Failed to generate"))) {
        setError("Some prompts could not be generated. See results below.");
      }

    } catch (err) {
      console.error("Error in prompt generation process:", err);
      setError(err instanceof Error ? err.message : "An unknown error occurred during prompt generation. Check API key or console.");
    } finally {
      setIsLoading(false);
      setLoadingMessage('');
    }
  }, [category, numIdeas]);

  const handleGenerateImageForPrompt = useCallback(async (index: number, promptText: string) => {
    // This function can be called by individual card clicks or by handleGenerateAllImages.
    // The control for preventing multiple simultaneous calls is handled by the callers.
    setGeneratingImageForIndex(index);
    // Clear previous error for this specific image before retrying/generating
    setResults(prevResults => prevResults.map((res, i) => i === index ? {...res, imageError: undefined } : res));

    try {
      const base64ImageData = await generateImageFromPrompt(promptText, aspectRatio);
      const safeIdeaName = results[index].idea.replace(/[^a-z0-9_]/gi, '_').toLowerCase().substring(0, 50);
      const fileName = `${safeIdeaName}_${index + 1}.jpeg`;

      setResults(prevResults => 
        prevResults.map((item, i) => 
          i === index 
            ? { ...item, generatedImageBase64: base64ImageData, imageFileName: fileName, imageError: undefined } 
            : item
        )
      );
    } catch (err) {
      console.error(`Error generating image for prompt at index ${index}:`, err);
      const errorMessage = err instanceof Error ? `Image Gen Failed: ${err.message.substring(0,100)}...` : "Image generation failed.";
      setResults(prevResults => 
        prevResults.map((item, i) => 
          i === index 
            ? { ...item, generatedImageBase64: undefined, imageFileName: undefined, imageError: errorMessage } 
            : item
        )
      );
      // Optionally, re-throw or signal error to handleGenerateAllImages if needed for more complex error handling in batch.
      // For now, setting the error on the item is sufficient.
    } finally {
      setGeneratingImageForIndex(null);
    }
  }, [aspectRatio, results]); // Removed generatingImageForIndex from dependencies as it's set inside

  const imagesToGenerateCount = useMemo(() => {
    return results.filter(r => !r.generatedImageBase64 && !r.imageError).length;
  }, [results]);

  const handleGenerateAllImages = useCallback(async () => {
    if (isGeneratingAllImages || isLoading || imagesToGenerateCount === 0) return;

    setIsGeneratingAllImages(true);
    setError(null); 
    let generatedCountInBatch = 0; // Count for current batch progress message

    for (let i = 0; i < results.length; i++) {
      const item = results[i];
      if (!item.generatedImageBase64 && !item.imageError) {
        generatedCountInBatch++;
        setLoadingMessage(`Generating image ${generatedCountInBatch} of ${imagesToGenerateCount} for "${item.idea.substring(0,30)}..."`);
        try {
          await handleGenerateImageForPrompt(i, item.prompt);
        } catch (batchError) {
          // Error is handled within handleGenerateImageForPrompt by setting item.imageError.
          // Loop continues.
          console.error(`Batch generation error for item ${i} was caught in loop:`, batchError);
        }
      }
    }

    setIsGeneratingAllImages(false);
    setLoadingMessage('');
  }, [results, isLoading, isGeneratingAllImages, imagesToGenerateCount, handleGenerateImageForPrompt]);


  const downloadCSV = useCallback(() => {
    if (results.length === 0) {
      alert("No prompts to download!");
      return;
    }
    const headers = "Idea/Theme,Creative Prompt\n";
    const csvContent = results
      .map(item => `"${item.idea.replace(/"/g, '""')}","${item.prompt.replace(/"/g, '""')}"`)
      .join("\n");
    
    const blob = new Blob([headers + csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute("download", `creative_prompts_${category.replace(/\s+/g, '_') || 'export'}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }, [results, category]);

  const downloadAllImagesAsZip = useCallback(async () => {
    const imagesToZip = results.filter(r => r.generatedImageBase64 && r.imageFileName);
    if (imagesToZip.length === 0) {
      alert("No images have been successfully generated to download!");
      return;
    }

    const zip = new JSZip();
    imagesToZip.forEach(item => {
      zip.file(item.imageFileName!, item.generatedImageBase64!, { base64: true });
    });

    try {
      setLoadingMessage("Zipping images...");
      const zipBlob = await zip.generateAsync({ type: "blob" });
      const link = document.createElement("a");
      const url = URL.createObjectURL(zipBlob);
      link.setAttribute("href", url);
      link.setAttribute("download", `generated_images_${category.replace(/\s+/g, '_') || 'export'}.zip`);
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (e) {
      console.error("Error creating ZIP file:", e);
      setError("Could not create ZIP file. See console for details.");
    } finally {
        setLoadingMessage("");
    }
  }, [results, category]);

  const generatedImagesCount = useMemo(() => results.filter(r => r.generatedImageBase64).length, [results]);
  const totalPromptsCount = results.length;
  const canGenerateMoreImages = useMemo(() => totalPromptsCount > 0 && imagesToGenerateCount > 0, [totalPromptsCount, imagesToGenerateCount]);


  return (
    <div className="container mx-auto px-4 py-8 min-h-screen flex flex-col">
      <Header />
      
      <main className="flex-grow">
        <InputForm
          category={category}
          setCategory={setCategory}
          numIdeas={numIdeas}
          setNumIdeas={setNumIdeas}
          aspectRatio={aspectRatio}
          setAspectRatio={setAspectRatio}
          aspectRatioOptions={ASPECT_RATIO_OPTIONS}
          onSubmit={handleGeneratePrompts}
          isLoading={isLoading || isGeneratingAllImages} // Disable form if any main loading is happening
        />

        {(isLoading || isGeneratingAllImages) && (
          <div className="flex flex-col items-center justify-center my-10 p-6 bg-slate-800 rounded-lg shadow-xl">
            <LoadingSpinner size="w-12 h-12" />
            <p className="mt-4 text-lg text-sky-300">
              {loadingMessage || (isLoading ? 'Generating prompts...' : 'Generating images...')}
            </p>
          </div>
        )}

        {error && !isGeneratingAllImages && ( // Only show general error if not in batch image gen (batch errors are per card)
          <div className="my-6 p-4 bg-red-900 border border-red-700 text-red-200 rounded-lg shadow-md max-w-2xl mx-auto text-center" role="alert">
            <h3 className="font-bold text-lg">Error</h3>
            <p>{error}</p>
            {error.includes("API Key") && <p className="text-sm mt-2">Please ensure your API_KEY environment variable is correctly set up and valid.</p>}
          </div>
        )}

        {!isLoading && results.length > 0 && ( // Show this section if prompts are loaded, regardless of batch image gen status
          <div className="my-8">
            <div className="flex flex-col sm:flex-row justify-between items-center mb-6 gap-4">
              <h2 className="text-3xl font-semibold text-slate-200">Generated Prompts ({results.length})</h2>
              <div className="flex gap-3 flex-wrap justify-center">
                <button
                  onClick={downloadCSV}
                  disabled={isLoading || isGeneratingAllImages}
                  className="px-6 py-2 font-medium text-slate-900 bg-gradient-to-r from-green-400 to-teal-500 rounded-lg hover:from-green-500 hover:to-teal-600 focus:outline-none focus:ring-4 focus:ring-green-300 focus:ring-opacity-50 transition-all duration-150 ease-in-out flex items-center disabled:opacity-60 disabled:cursor-not-allowed"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M3 17a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm3.293-7.707a1 1 0 011.414 0L9 10.586V3a1 1 0 112 0v7.586l1.293-1.293a1 1 0 111.414 1.414l-3 3a1 1 0 01-1.414 0l-3-3a1 1 0 010-1.414z" clipRule="evenodd" />
                  </svg>
                  Download CSV
                </button>
                {results.length > 0 && (
                   <button
                    onClick={handleGenerateAllImages}
                    disabled={isLoading || isGeneratingAllImages || !canGenerateMoreImages}
                    className="px-6 py-2 font-medium text-white bg-gradient-to-r from-cyan-500 to-blue-500 rounded-lg hover:from-cyan-600 hover:to-blue-600 focus:outline-none focus:ring-4 focus:ring-cyan-300 focus:ring-opacity-50 transition-all duration-150 ease-in-out flex items-center disabled:opacity-60 disabled:cursor-not-allowed"
                  >
                    {isGeneratingAllImages ? ( 
                       <LoadingSpinner size="w-5 h-5 mr-2" color="text-white" />
                    ) : (
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" viewBox="0 0 20 20" fill="currentColor">
                         <path d="M4 3a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V5a2 2 0 00-2-2H4zm12 12H4l4-8 3 6 2-4 3 6z" />
                       </svg>
                    )}
                    {isGeneratingAllImages ? 'Generating All...' : `Generate All (${imagesToGenerateCount})`}
                  </button>
                )}
                <button
                  onClick={downloadAllImagesAsZip}
                  disabled={isLoading || generatedImagesCount === 0 || isGeneratingAllImages}
                  className="px-6 py-2 font-medium text-white bg-gradient-to-r from-pink-500 to-rose-500 rounded-lg hover:from-pink-600 hover:to-rose-600 focus:outline-none focus:ring-4 focus:ring-pink-300 focus:ring-opacity-50 transition-all duration-150 ease-in-out flex items-center disabled:opacity-60 disabled:cursor-not-allowed"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                  </svg>
                  Download Images ({generatedImagesCount})
                </button>
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {results.map((item, index) => (
                <PromptCard 
                  key={index} 
                  item={item} 
                  index={index}
                  onGenerateImage={(idx, prompt) => {
                      // This guard ensures individual clicks don't interfere with ongoing single/batch generation
                      if (generatingImageForIndex === null && !isGeneratingAllImages) {
                          handleGenerateImageForPrompt(idx, prompt);
                      }
                  }}
                  isGeneratingImage={generatingImageForIndex === index}
                  isGeneratingAllImages={isGeneratingAllImages}
                />
              ))}
            </div>
          </div>
        )}
         {!isLoading && !isGeneratingAllImages && results.length === 0 && category && (
          <div className="text-center py-10 text-slate-400">
            <p>No prompts generated yet. Fill the form above and click "Forge Prompts".</p>
            <p>After prompts appear, click "Generate Image" on each card or "Generate All Images".</p>
          </div>
        )}
         {!isLoading && !isGeneratingAllImages && results.length === 0 && !category && (
          <div className="text-center py-10 text-slate-400">
            <p>Welcome! Enter a category, number of ideas, and select an aspect ratio to begin.</p>
          </div>
        )}
      </main>
      <footer className="text-center py-6 mt-auto">
        <p className="text-sm text-slate-500">
          Powered by Gemini API. Designed with Tailwind CSS.
        </p>
      </footer>
    </div>
  );
};

export default App;
