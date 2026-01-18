
import React, { useState, useEffect } from 'react';
import { analyzeContent, explainTerm } from './services/gemini';
import { AnalysisResult, TermExplanation } from './types';
import AnalysisView from './components/AnalysisView';
import TermModal from './components/TermModal';
import Notebook from './components/Notebook';

const App: React.FC = () => {
  const [view, setView] = useState<'home' | 'notebook'>('home');
  const [loading, setLoading] = useState(false);
  const [analysis, setAnalysis] = useState<AnalysisResult | null>(null);
  const [selectedTerm, setSelectedTerm] = useState<TermExplanation | null>(null);
  const [termLoading, setTermLoading] = useState(false);
  const [savedTerms, setSavedTerms] = useState<TermExplanation[]>([]);

  useEffect(() => {
    const saved = localStorage.getItem('mechmentor_notebook');
    if (saved) setSavedTerms(JSON.parse(saved));
  }, []);

  const saveToNotebook = (term: TermExplanation) => {
    const updated = [...savedTerms.filter(t => t.term !== term.term), term];
    setSavedTerms(updated);
    localStorage.setItem('mechmentor_notebook', JSON.stringify(updated));
  };

  const removeFromNotebook = (termName: string) => {
    const updated = savedTerms.filter(t => t.term !== termName);
    setSavedTerms(updated);
    localStorage.setItem('mechmentor_notebook', JSON.stringify(updated));
  };

  const handleFileUpload = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const textFile = formData.get('textFile') as File;
    const imgFile = formData.get('imgFile') as File;

    if (!textFile.size && !imgFile.size) return;

    setLoading(true);
    try {
      let textContent = '';
      if (textFile.size) textContent = await textFile.text();

      let imageObj;
      if (imgFile.size) {
        const reader = new FileReader();
        const base64Promise = new Promise<string>((resolve) => {
          reader.onload = () => resolve((reader.result as string).split(',')[1]);
          reader.readAsDataURL(imgFile);
        });
        imageObj = {
          data: await base64Promise,
          mimeType: imgFile.type
        };
      }

      const result = await analyzeContent(textContent || undefined, imageObj);
      setAnalysis(result);
    } catch (err) {
      console.error(err);
      alert("Analysis failed. Please check your API key or file format.");
    } finally {
      setLoading(false);
    }
  };

  const handleTermClick = async (term: string) => {
    setTermLoading(true);
    try {
      const explanation = await explainTerm(term);
      setSelectedTerm(explanation);
    } catch (err) {
      console.error(err);
    } finally {
      setTermLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col font-sans">
      {/* Persistent Header */}
      <header className="sticky top-0 z-40 bg-white border-b border-gray-200 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
          <div 
            className="flex items-center gap-2 cursor-pointer" 
            onClick={() => setView('home')}
          >
            <div className="w-8 h-8 bg-blue-500 rounded-lg flex items-center justify-center text-white font-bold">M</div>
            <h1 className="text-xl font-bold tracking-tight text-gray-900">MechMentor</h1>
          </div>
          <nav className="flex gap-4">
            <button 
              onClick={() => setView('home')}
              className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${view === 'home' ? 'bg-blue-50 text-blue-500' : 'text-gray-600 hover:bg-gray-100'}`}
            >
              Analysis
            </button>
            <button 
              onClick={() => setView('notebook')}
              className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${view === 'notebook' ? 'bg-blue-50 text-blue-600' : 'text-gray-600 hover:bg-gray-100'}`}
            >
              Notebook ({savedTerms.length})
            </button>
          </nav>
        </div>
      </header>

      <main className="flex-1 w-full max-w-7xl mx-auto p-4 md:p-8">
        {view === 'home' ? (
          <div className="space-y-8">
            {!analysis ? (
              <div className="max-w-2xl mx-auto mt-12">
                <div className="bg-white p-8 rounded-2xl shadow-xl border border-gray-100">
                  <h2 className="text-2xl font-bold mb-2">Technical Analysis</h2>
                  <p className="text-gray-500 mb-8">Upload a mechanical diagram or a specification document to begin your learning journey.</p>
                  
                  <form onSubmit={handleFileUpload} className="space-y-6">
                    <div className="space-y-2">
                      <label className="text-sm font-semibold text-gray-700">Technical Text (TXT/MD)</label>
                      <input 
                        name="textFile" 
                        type="file" 
                        accept=".txt,.md" 
                        className="w-full p-3 border border-gray-200 rounded-xl bg-gray-50 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
                      />
                    </div>
                    
                    <div className="space-y-2">
                      <label className="text-sm font-semibold text-gray-700">Diagram / Image (PNG/JPG)</label>
                      <input 
                        name="imgFile" 
                        type="file" 
                        accept="image/*" 
                        className="w-full p-3 border border-gray-200 rounded-xl bg-gray-50 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
                      />
                    </div>

                    <button 
                      type="submit" 
                      disabled={loading}
                      className="w-full py-4 bg-blue-600 text-white rounded-xl font-bold text-lg shadow-lg shadow-blue-200 hover:bg-blue-700 disabled:opacity-50 transition-all transform active:scale-95"
                    >
                      {loading ? (
                        <span className="flex items-center justify-center gap-2">
                          <svg className="animate-spin h-5 w-5 text-white" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                          </svg>
                          Analyzing Hardware...
                        </span>
                      ) : "Start Analysis"}
                    </button>
                  </form>
                </div>
              </div>
            ) : (
              <AnalysisView 
                analysis={analysis} 
                onTermClick={handleTermClick} 
                onReset={() => setAnalysis(null)}
              />
            )}
          </div>
        ) : (
          <Notebook 
            terms={savedTerms} 
            onTermClick={handleTermClick}
            onDelete={removeFromNotebook}
          />
        )}
      </main>

      {/* Overlays */}
      {selectedTerm && (
        <TermModal 
          term={selectedTerm} 
          onClose={() => setSelectedTerm(null)} 
          onSave={saveToNotebook}
          isSaved={savedTerms.some(t => t.term === selectedTerm.term)}
        />
      )}

      {termLoading && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/20 backdrop-blur-sm">
          <div className="bg-white p-6 rounded-2xl shadow-2xl flex flex-col items-center gap-4">
            <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
            <p className="font-bold text-gray-700 italic">Consulting the Expert Mentor...</p>
          </div>
        </div>
      )}
    </div>
  );
};

export default App;
