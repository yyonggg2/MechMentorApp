
import React from 'react';
import { AnalysisResult } from '../types';

interface Props {
  analysis: AnalysisResult;
  onTermClick: (term: string) => void;
  onReset: () => void;
}

const AnalysisView: React.FC<Props> = ({ analysis, onTermClick, onReset }) => {
  
  /**
   * Safe text processing logic that fixes the original "innerHTML" logic error.
   * Splits text by terms and renders buttons instead of using unsafe raw HTML.
   */
  const renderHighlightedText = (text: string, terms: string[]) => {
    if (!text) return null;
    const sortedTerms = [...terms].sort((a, b) => b.length - a.length);
    const regex = new RegExp(`(${sortedTerms.map(t => t.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|')})`, 'gi');
    const parts = text.split(regex);

    return parts.map((part, i) => {
      const isTerm = terms.some(t => t.toLowerCase() === part.toLowerCase());
      if (isTerm) {
        return (
          <button
            key={i}
            onClick={() => onTermClick(part)}
            className="px-1 py-0.5 mx-0.5 rounded bg-blue-100 text-blue-700 font-bold hover:bg-blue-200 transition-colors border-b-2 border-blue-400"
          >
            {part}
          </button>
        );
      }
      return <span key={i}>{part}</span>;
    });
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 animate-in fade-in duration-500">
      {/* Text Analysis Side */}
      <div className="space-y-6">
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-200 flex flex-col h-full">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-bold">Technical Specifications</h3>
            <button 
              onClick={onReset}
              className="text-xs text-gray-400 hover:text-red-500 transition-colors"
            >
              Clear Results
            </button>
          </div>
          <div className="flex-1 overflow-y-auto prose prose-blue max-w-none text-gray-700 leading-relaxed">
            {analysis.original_text ? (
              <div className="whitespace-pre-wrap">
                {renderHighlightedText(analysis.original_text, analysis.key_terms)}
              </div>
            ) : (
              <div className="h-full flex items-center justify-center italic text-gray-400">
                No text document provided.
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Diagram Analysis Side */}
      <div className="space-y-6">
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-200">
          <h3 className="text-lg font-bold mb-4">Interactive Component Map</h3>
          {analysis.image_data ? (
            <div className="relative rounded-xl overflow-hidden bg-gray-100 group">
              <img 
                src={analysis.image_data} 
                alt="Hardware Analysis" 
                className="w-full h-auto block"
              />
              <svg 
                className="absolute top-0 left-0 w-full h-full pointer-events-none" 
                viewBox="0 0 1000 1000"
                preserveAspectRatio="none"
              >
                {analysis.diagram_labels.map((item, idx) => {
                  const [ymin, xmin, ymax, xmax] = item.box_2d;
                  return (
                    <g key={idx} className="pointer-events-auto cursor-pointer group/hotspot">
                      <rect 
                        x={xmin} y={ymin} width={xmax - xmin} height={ymax - ymin}
                        className="fill-blue-500/10 stroke-blue-500 stroke-2 opacity-0 group-hover/hotspot:opacity-100 transition-opacity"
                        onClick={() => onTermClick(item.label)}
                      />
                      <circle 
                        cx={xmin + (xmax - xmin) / 2} 
                        cy={ymin + (ymax - ymin) / 2} 
                        r="12"
                        className="fill-blue-600 stroke-white stroke-2 shadow-lg cursor-pointer"
                        onClick={() => onTermClick(item.label)}
                      />
                    </g>
                  );
                })}
              </svg>
            </div>
          ) : (
            <div className="aspect-square flex items-center justify-center bg-gray-50 border-2 border-dashed border-gray-200 rounded-xl text-gray-400 italic">
              No visual diagram provided.
            </div>
          )}
          
          {/* Label List */}
          <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 gap-3">
            {analysis.diagram_labels.map((item, idx) => (
              <div 
                key={idx}
                onClick={() => onTermClick(item.label)}
                className="p-3 bg-gray-50 hover:bg-white hover:shadow-md border border-gray-100 rounded-xl transition-all cursor-pointer group"
              >
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 bg-blue-500 rounded-full group-hover:scale-125 transition-transform"></span>
                  <p className="font-bold text-sm text-gray-800">{item.label}</p>
                </div>
                <p className="text-xs text-gray-500 mt-1 line-clamp-1">{item.description}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default AnalysisView;
