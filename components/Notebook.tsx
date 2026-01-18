
import React from 'react';
import { TermExplanation } from '../types';

interface Props {
  terms: TermExplanation[];
  onTermClick: (term: string) => void;
  onDelete: (termName: string) => void;
}

const Notebook: React.FC<Props> = ({ terms, onTermClick, onDelete }) => {
  return (
    <div className="max-w-4xl mx-auto py-8 animate-in slide-in-from-top duration-500">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h2 className="text-3xl font-black text-gray-900 tracking-tight">Your Hardware Library</h2>
          <p className="text-gray-500 mt-1">A curated collection of your engineering research.</p>
        </div>
        <div className="bg-blue-50 text-blue-700 px-4 py-2 rounded-full font-bold text-sm">
          {terms.length} Terms
        </div>
      </div>

      {terms.length === 0 ? (
        <div className="text-center py-20 bg-white rounded-3xl border-2 border-dashed border-gray-200">
          <div className="w-20 h-20 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-10 h-10 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"></path></svg>
          </div>
          <p className="text-gray-400 font-medium">Your notebook is currently empty.</p>
          <p className="text-gray-400 text-sm">Analyze content and click "Save" to build your library.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {terms.map((term, idx) => (
            <div 
              key={idx}
              className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 hover:shadow-xl hover:scale-[1.02] transition-all cursor-pointer group relative flex flex-col justify-between h-full"
              onClick={() => onTermClick(term.term)}
            >
              <div>
                <div className="flex items-center justify-between mb-4">
                  <span className="text-xs font-bold text-blue-600 bg-blue-50 px-3 py-1 rounded-full">{new Date(term.timestamp).toLocaleDateString()}</span>
                  <button 
                    onClick={(e) => {
                      e.stopPropagation();
                      onDelete(term.term);
                    }}
                    className="opacity-0 group-hover:opacity-100 p-2 hover:bg-red-50 hover:text-red-500 rounded-full transition-all text-gray-300"
                    title="Delete from notebook"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path></svg>
                  </button>
                </div>
                <h3 className="text-xl font-black text-gray-900 mb-2">{term.term}</h3>
                <p className="text-sm text-gray-500 line-clamp-3 leading-relaxed">
                  {term.explanation}
                </p>
              </div>
              <div className="mt-6 flex items-center gap-2 text-blue-600 font-bold text-sm">
                View Detail
                <svg className="w-4 h-4 transform group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M14 5l7 7m0 0l-7 7m7-7H3"></path></svg>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default Notebook;
