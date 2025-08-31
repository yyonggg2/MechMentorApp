"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";

// --- Data Interfaces ---
interface Link {
  title: string;
  url: string;
  category: string;
}

interface TermExplanation {
  explanation: string;
  pros: string[];
  cons: string[];
  alternatives: string[];
  links: Link[];
}

interface Term {
  id: number;
  term: string;
  analysis: string; // This now stores a stringified TermExplanation
  created_at: string;
}

export default function Notebook() {
  const apiUrl = process.env.NEXT_PUBLIC_API_URL;
  const [terms, setTerms] = useState<Term[]>([]);
  const [selectedTerm, setSelectedTerm] = useState<Term | null>(null);

  const fetchTerms = useCallback(async () => {
    try {
      const response = await fetch(`${apiUrl}/terms/`);
      if (response.ok) {
        const data = await response.json();
        setTerms(data);
      }
    } catch (error) {
      console.error("Failed to fetch terms:", error);
    }
  }, [apiUrl]);

  useEffect(() => {
    fetchTerms();
  }, [fetchTerms]);

  const parseAnalysis = (analysisString: string): TermExplanation | null => {
    try {
      return JSON.parse(analysisString);
    } catch (e) {
      console.error("Failed to parse analysis JSON:", e);
      return null;
    }
  };

  const groupLinksByCategory = (links: Link[]) => {
    return links.reduce((acc, link) => {
      const category = link.category || "Uncategorized";
      if (!acc[category]) {
        acc[category] = [];
      }
      acc[category].push(link);
      return acc;
    }, {} as Record<string, Link[]>);
  };

  return (
    <div className="bg-white min-h-screen text-gray-800 font-sans">
      <header className="bg-gray-50 border-b border-gray-200">
        <div className="container mx-auto px-6 py-4 flex justify-between items-center">
          <h1 className="text-2xl font-semibold text-gray-700">
            Terminology Notebook
          </h1>
          <Link href="/" className="text-blue-500 hover:underline">
            &larr; Back to Analysis
          </Link>
        </div>
      </header>

      <main className="container mx-auto px-6 py-12">
        <div className="bg-gray-50 p-8 rounded-lg border border-gray-200">
          {terms.length > 0 ? (
            <ul className="space-y-4">
              {terms.map((term) => (
                <li
                  key={term.id}
                  className="p-4 bg-white rounded-md shadow-sm cursor-pointer hover:shadow-lg transition-shadow"
                  onClick={() => setSelectedTerm(term)}
                >
                  <div className="flex justify-between items-center">
                    <h3 className="font-semibold text-lg text-blue-600">{term.term}</h3>
                    <p className="text-sm text-gray-500">
                      {new Date(term.created_at).toLocaleString()}
                    </p>
                  </div>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-gray-600">
              Your saved terms will appear here. Click 'Save to Notebook' on the analysis page to add one.
            </p>
          )}
        </div>
      </main>

      {selectedTerm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4">
          <div className="bg-white p-8 rounded-lg shadow-2xl max-w-2xl w-full max-h-full overflow-y-auto">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-2xl font-bold text-gray-800">{selectedTerm.term}</h2>
              <button onClick={() => setSelectedTerm(null)} className="text-gray-500 hover:text-gray-800 text-2xl">&times;</button>
            </div>
            {(() => {
                const analysis = parseAnalysis(selectedTerm.analysis);
                if (!analysis) {
                    return <p>Could not display analysis. Data may be corrupt.</p>;
                }
                return (
                    <div>
                      <p className="text-gray-700 mb-4">{analysis.explanation}</p>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div>
                          <h4 className="font-semibold">Pros</h4>
                          <ul className="list-disc list-inside">{analysis.pros.map((pro, i) => <li key={i}>{pro}</li>)}</ul>
                        </div>
                        <div>
                          <h4 className="font-semibold">Cons</h4>
                          <ul className="list-disc list-inside">{analysis.cons.map((con, i) => <li key={i}>{con}</li>)}</ul>
                        </div>
                        <div>
                          <h4 className="font-semibold">Alternatives</h4>
                          <ul className="list-disc list-inside">{analysis.alternatives.map((alt, i) => <li key={i}>{alt}</li>)}</ul>
                        </div>
                      </div>
                      <div className="mt-4 space-y-3">
                        <h3 className="text-lg font-semibold border-b pb-1">Further Reading</h3>
                        {Object.entries(groupLinksByCategory(analysis.links)).map(([category, links]) => (
                          <div key={category}>
                            <h4 className="font-semibold text-md">{category === 'Supplier' ? 'Shop' : category}</h4>
                            <ul className="list-none pl-2 space-y-1">
                              {links.map((link, i) => (
                                <li key={i}>
                                  <a href={link.url} target="_blank" rel="noopener noreferrer" className="text-blue-500 hover:underline">
                                    {link.title}
                                  </a>
                                </li>
                              ))}
                            </ul>
                          </div>
                        ))}
                      </div>
                    </div>
                );
            })()}
          </div>
        </div>
      )}
    </div>
  );
}