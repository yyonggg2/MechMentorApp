
import React from 'react';
import { TermExplanation } from '../types';

interface Props {
  term: TermExplanation;
  onClose: () => void;
  onSave: (term: TermExplanation) => void;
  isSaved: boolean;
}

const TermModal: React.FC<Props> = ({ term, onClose, onSave, isSaved }) => {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose}></div>
      <div className="relative bg-white w-full max-w-2xl rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh] animate-in slide-in-from-bottom duration-300">
        
        {/* Header */}
        <div className="p-6 bg-gray-50 border-b flex items-center justify-between">
          <h2 className="text-2xl font-black text-gray-900 flex items-center gap-3">
            <span className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center text-white text-lg">?</span>
            {term.term}
          </h2>
          <button onClick={onClose} className="p-2 hover:bg-gray-200 rounded-full transition-colors text-gray-500">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path></svg>
          </button>
        </div>

        {/* Content */}
        <div className="p-8 overflow-y-auto space-y-8">
          <section>
            <h3 className="text-xs font-bold text-blue-600 uppercase tracking-widest mb-2">Mentor's Perspective</h3>
            <p className="text-lg text-gray-700 leading-relaxed font-medium">
              {term.explanation}
            </p>
          </section>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="p-4 bg-green-50 rounded-2xl border border-green-100">
              <h4 className="text-sm font-bold text-green-700 mb-3 flex items-center gap-2">
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd"></path></svg>
                Advantages (Pros)
              </h4>
              <ul className="space-y-2">
                {term.pros.map((pro, i) => <li key={i} className="text-sm text-green-800">• {pro}</li>)}
              </ul>
            </div>
            <div className="p-4 bg-red-50 rounded-2xl border border-red-100">
              <h4 className="text-sm font-bold text-red-700 mb-3 flex items-center gap-2">
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd"></path></svg>
                Considerations (Cons)
              </h4>
              <ul className="space-y-2">
                {term.cons.map((con, i) => <li key={i} className="text-sm text-red-800">• {con}</li>)}
              </ul>
            </div>
          </div>

          <section>
            <h3 className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-4">Alternatives to Explore</h3>
            <div className="flex flex-wrap gap-3">
              {term.alternatives.map((alt, i) => (
                <div key={i} className="px-4 py-2 bg-gray-100 rounded-full text-sm font-bold text-gray-700">
                  {alt.term} <span className="font-normal text-gray-400">— {alt.description}</span>
                </div>
              ))}
            </div>
          </section>

          <section>
            <h3 className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-4">Supplier & Community Links</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {term.links.map((link, i) => (
                <a 
                  key={i} href={link.url} target="_blank" rel="noreferrer"
                  className="flex items-center justify-between p-4 border border-gray-100 rounded-2xl hover:bg-blue-50 hover:border-blue-200 transition-all group"
                >
                  <div>
                    <p className="text-sm font-bold text-gray-900">{link.title}</p>
                    <p className="text-xs text-blue-600 font-medium">{link.category}</p>
                  </div>
                  <svg className="w-5 h-5 text-gray-300 group-hover:text-blue-500 transform group-hover:translate-x-1 transition-all" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M14 5l7 7m0 0l-7 7m7-7H3"></path></svg>
                </a>
              ))}
            </div>
          </section>
        </div>

        {/* Footer Actions */}
        <div className="p-6 bg-white border-t flex gap-4">
          <button 
            onClick={() => onSave(term)}
            disabled={isSaved}
            className={`flex-1 py-4 rounded-2xl font-bold flex items-center justify-center gap-2 transition-all ${isSaved ? 'bg-gray-100 text-gray-400 cursor-default' : 'bg-blue-600 text-white shadow-lg shadow-blue-200 hover:bg-blue-700 active:scale-95'}`}
          >
            {isSaved ? (
              <>
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd"></path></svg>
                Saved to Notebook
              </>
            ) : (
              <>
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"></path></svg>
                Save to My Notebook
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default TermModal;
