"use client";

import { useState, useEffect, useRef } from "react";
import axios, { AxiosError } from 'axios';
import ReactMarkdown from 'react-markdown';
import Link from 'next/link';
import Image from 'next/image';

// --- Data Interfaces ---
interface Term {
  id: number;
  term: string;
  analysis: string; // Now stores stringified TermExplanation
}

interface Link {
  title: string;
  url: string;
  category: string;
}

interface Alternative {
  term: string;
  description: string;
}

interface TermExplanation {
  explanation: string;
  pros: string[];
  cons: string[];
  alternatives: Alternative[];
  links: Link[];
}

interface DiagramLabel {
  label: string;
  description: string;
  box: [number, number, number, number];
}

interface AnalysisResult {
  key_terms: string[];
  diagram_labels: DiagramLabel[];
  original_text: string;
}

// --- Helper Function ---
function escapeRegExp(string: string) {
  if (typeof string !== 'string') {
    return '';
  }
  return string.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

const vibrantColors = [
  '#FF5733', // Red-Orange
  '#33FF57', // Lime Green
  '#3357FF', // Strong Blue
  '#FF33A1', // Hot Pink
  '#A133FF', // Purple
  '#33FFF6', // Cyan
  '#FFC300', // Vivid Yellow
];

function calculateLabelPositions(labels: DiagramLabel[]) {
  const positions: { x: number; y: number, width: number, height: number }[] = [];
  const labelHeight = 4; // Percentage of image height
  const labelWidth = 12; // Percentage of image width

  return labels.map(label => {
    const x_center = (label.box[0] + label.box[2]) / 2 * 100;
    const y_center = (label.box[1] + label.box[3]) / 2 * 100;

    let best_pos = { x: 0, y: 0 };
    let min_overlap = Infinity;

    // Check 8 positions around the center
    for (let i = 0; i < 8; i++) {
      const angle = (i / 8) * 2 * Math.PI;
      const x = x_center + Math.cos(angle) * 20;
      const y = y_center + Math.sin(angle) * 20;

      // Boundary checks
      if (x < 5 || x > 95 || y < 5 || y > 95) continue;

      let overlap = 0;
      for (const p of positions) {
        const dist_x = Math.abs(x - p.x);
        const dist_y = Math.abs(y - p.y);
        if (dist_x < p.width && dist_y < p.height) {
          overlap++;
        }
      }

      if (overlap < min_overlap) {
        min_overlap = overlap;
        best_pos = { x, y };
      }
    }
    
    positions.push({ ...best_pos, width: labelWidth, height: labelHeight });
    return { ...label, dot: { x: x_center, y: y_center }, text: best_pos };
  });
}

// --- Main Component ---
export default function Home() {
  const apiUrl = process.env.NEXT_PUBLIC_API_URL;
  // --- State Management ---
  const [documentFile, setDocumentFile] = useState<File | null>(null);
  const [diagramFile, setDiagramFile] = useState<File | null>(null);
  const [analysis, setAnalysis] = useState<AnalysisResult | null>(null);
  const [selectedTerm, setSelectedTerm] = useState<string | null>(null);
  const [termExplanation, setTermExplanation] = useState<TermExplanation | null>(null);
  const [isTermLoading, setIsTermLoading] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [statusMessage, setStatusMessage] = useState("Your analysis will appear here.");
  const [jobId, setJobId] = useState<string | null>(null); // Keep track of the analysis job
  const [diagramUrl, setDiagramUrl] = useState<string | null>(null);

  const documentInputRef = useRef<HTMLInputElement>(null);
  const diagramInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!selectedTerm) {
      setTermExplanation(null);
      return;
    }

    const controller = new AbortController();
    const { signal } = controller;

    const fetchExplanation = async () => {
      setIsTermLoading(true);
      setTermExplanation(null);
      try {
        const response = await fetch(`${apiUrl}/explain-term/`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ term: selectedTerm }),
          signal,
        });

        if (!response.ok) {
          throw new Error("Failed to fetch explanation.");
        }

        const result: TermExplanation = await response.json();
        if (!signal.aborted) {
          setTermExplanation(result);
        }
      } catch (error) {
        if (error instanceof Error && error.name !== 'AbortError') {
          console.error("Error fetching explanation:", error);
          setTermExplanation({
            explanation: `Failed to load explanation for ${selectedTerm}.`,
            pros: [],
            cons: [],
            alternatives: [],
            links: [],
          });
        }
      } finally {
        if (!signal.aborted) {
          setIsTermLoading(false);
        }
      }
    };

    fetchExplanation();

    return () => {
      controller.abort();
    };
  }, [selectedTerm, apiUrl]);

  // --- Data Fetching ---
  const pollJobStatus = (id: string) => {
    const interval = setInterval(async () => {
      try {
        const response = await fetch(`${apiUrl}/status/${id}`);
        if (!response.ok) {
            throw new Error("Server responded with an error.");
        }
        const data = await response.json();

        if (data.status === "complete") {
          clearInterval(interval);
          setAnalysis(data.result);
          setIsLoading(false);
          setStatusMessage("Analysis complete!");
        } else if (data.status === "failed") {
          clearInterval(interval);
          setIsLoading(false);
          setStatusMessage(`Analysis failed: ${data.error}`);
        }
      } catch (error: unknown) {
        clearInterval(interval);
        setIsLoading(false);
        if (error instanceof Error) {
          setStatusMessage(`Failed to get job status: ${error.message}`);
        } else {
          setStatusMessage("Failed to get job status due to an unknown error.");
        }
      }
    }, 3000);
  };

  // --- Event Handlers ---
  const handleAnalyze = async () => {
    if (!documentFile && !diagramFile) {
      alert("Please upload a document or a diagram.");
      return;
    }

    setIsLoading(true);
    setAnalysis(null);
    setSelectedTerm(null);
    setTermExplanation(null);
    setStatusMessage("Submitting analysis job...");
    sessionStorage.removeItem("analysisResult");


    const formData = new FormData();
    if (documentFile) {
        formData.append("document", documentFile);
    }
    if (diagramFile) {
        formData.append("diagram", diagramFile);
    }


    try {
      const response = await fetch(`${apiUrl}/analyze/`, {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || "Failed to start analysis job.");
      }

      const { job_id } = await response.json();
      setJobId(job_id);
      setStatusMessage("Analysis in progress... This may take a moment.");
      pollJobStatus(job_id);
    } catch (error) {
      setIsLoading(false);
      if (error instanceof Error) {
        setStatusMessage(`Error: ${error.message}`);
      } else {
        setStatusMessage("An unknown error occurred during analysis.");
      }
    }
  };

  const handleTermClick = (term: string) => {
    if (selectedTerm === term) {
      setSelectedTerm(null);
    } else {
      setSelectedTerm(term);
    }
  };

  const handleSaveTerm = async (term: string, explanation: TermExplanation) => {
    try {
      const response = await axios.post(`${apiUrl}/terms/`, {
        term: term,
        analysis: JSON.stringify(explanation)
      });

      if (response.status === 200) {
        alert(`Term "${term}" saved to notebook!`);
      } else {
        alert(`Failed to save term: ${response.data.detail || 'Unknown error'}`);
      }
    } catch (error) {
      const axiosError = error as AxiosError<{ detail?: string }>;
      console.error("Full Axios Error:", axiosError);
      if (axiosError.response) {
        console.error("Axios Response Data:", axiosError.response.data);
        console.error("Axios Response Status:", axiosError.response.status);
        console.error("Axios Response Headers:", axiosError.response.headers);
        alert(`Error: ${axiosError.response.data?.detail || axiosError.message}`);
      } else if (axiosError.request) {
        console.error("Axios Request Data:", axiosError.request);
        alert("Error: The server did not respond. Please check if it's running.");
      } else {
        console.error('Error Message:', axiosError.message);
        alert(`An unexpected error occurred: ${axiosError.message}`);
      }
    }
  };

  const handleClearAnalysis = () => {
    setAnalysis(null);
    setSelectedTerm(null);
    setTermExplanation(null);
    setDiagramUrl(null);
    setStatusMessage("Your analysis will appear here.");
    sessionStorage.removeItem("analysisResult");
  };

  const handleClearDocument = () => {
    setDocumentFile(null);
    if (documentInputRef.current) {
      documentInputRef.current.value = "";
    }
  };

  const handleClearDiagram = () => {
    setDiagramFile(null);
    setDiagramUrl(null);
    if (diagramInputRef.current) {
      diagramInputRef.current.value = "";
    }
  };

  // --- Rendering Logic ---
  const createHighlightedHtml = (text: string, terms: string[]) => {
    if (!text || !terms || terms.length === 0) {
      return { __html: text.replace(/\n/g, '<br />') };
    }
    
    const validTerms = terms.filter((t): t is string => typeof t === "string" && t.length > 0);
    if (validTerms.length === 0) {
        return { __html: text.replace(/\n/g, '<br />') };
    }

    const regex = new RegExp(`(${validTerms.map(escapeRegExp).join("|")})`, "gi");
    
    const html = text.replace(/\n/g, '<br />').split(regex).map((part) => {
        if (typeof part !== 'string') return '';
        const lowerCasePart = part.toLowerCase();
        const matchingTerm = validTerms.find(term => term.toLowerCase() === lowerCasePart);

        if (matchingTerm) {
            const termId = matchingTerm.toLowerCase().replace(/\s+/g, "-");
            return `<span class="text-blue-600 font-bold cursor-pointer" onclick="document.getElementById('term-button-${termId}')?.click()">${part}</span>`;
        }
        return `<span>${part}</span>`;
    }).join("");

    return { __html: html };
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
            AI Mechanical Mentor
          </h1>
          <Link href="/notebook" className="text-gray-500 hover:text-gray-800" title="View Notebook">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </Link>
        </div>
      </header>

      <main className="container mx-auto px-6 py-12">
        <div className="max-w-4xl mx-auto">
          <div className="bg-white rounded-xl shadow-lg border border-gray-200 p-8">
            {analysis ? (
              // --- Analysis View ---
              <div className="relative">
                <h2 className="text-2xl font-bold text-gray-800 mb-4">Analysis Result</h2>
                <button
                  onClick={handleClearAnalysis}
                  className="absolute top-0 right-0 text-gray-400 hover:text-gray-800 transition-colors"
                  aria-label="Clear analysis"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
                <div className="prose max-w-none">
                  {analysis.original_text && (
                    <div className="mb-8">
                      <h3 className="text-xl font-semibold border-b pb-2 mb-4">Original Text</h3>
                      <div
                        className="prose max-w-none"
                        dangerouslySetInnerHTML={createHighlightedHtml(analysis.original_text, analysis.key_terms)}
                      />
                    </div>
                  )}
                  {analysis.key_terms.filter(term => typeof term === 'string' && term).map((term) => (
                    <button key={`term-button-${term}`} id={`term-button-${term.toLowerCase().replace(/\s+/g, "-")}`} onClick={() => handleTermClick(term)} className="hidden" />
                  ))}
                </div>

                {diagramUrl && analysis?.diagram_labels && (
                  <div className="mt-8">
                    <h3 className="text-xl font-semibold border-b pb-2 mb-4">Diagram Analysis</h3>
                    <div className="relative">
                      <Image src={diagramUrl} alt="Uploaded Diagram" className="w-full h-auto rounded-lg" width={800} height={600} priority />
                      <svg className="absolute top-0 left-0 w-full h-full">
                        {calculateLabelPositions(analysis.diagram_labels).map((label, index) => {
                          const color = vibrantColors[index % vibrantColors.length];
                          return (
                            <g key={index} className="cursor-pointer" onClick={() => handleTermClick(label.label)}>
                              <circle cx={`${label.dot.x}%`} cy={`${label.dot.y}%`} r="5" fill={color} />
                              <line x1={`${label.dot.x}%`} y1={`${label.dot.y}%`} x2={`${label.text.x}%`} y2={`${label.text.y}%`} stroke={color} strokeWidth="2" />
                              <text x={`${label.text.x}%`} y={`${label.text.y}%`} fill={color} dy="-5" textAnchor={label.text.x > label.dot.x ? "start" : "end"} className="font-bold">
                                {label.label}
                              </text>
                            </g>
                          );
                        })}
                      </svg>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              // --- Upload View ---
              <div>
                <h2 className="text-2xl font-bold text-gray-800 mb-2">Upload Your Files</h2>
                <p className="text-gray-500 mb-6">
                  Upload a document and/or a diagram to get started.
                </p>
                <div className="space-y-6">
                  <div className="relative">
                    <label htmlFor="document" className="block text-sm font-medium text-gray-700 mb-1">Document</label>
                    <input
                      type="file"
                      id="document"
                      ref={documentInputRef}
                      onChange={(e) => setDocumentFile(e.target.files ? e.target.files[0] : null)}
                      className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-gray-100 file:text-gray-700 hover:file:bg-gray-200"
                    />
                    {documentFile && (
                      <button onClick={handleClearDocument} className="absolute top-7 right-3 text-gray-400 hover:text-gray-700">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                    )}
                  </div>
                  <div className="relative">
                    <label htmlFor="diagram" className="block text-sm font-medium text-gray-700 mb-1">Diagram</label>
                    <input
                      type="file"
                      id="diagram"
                      ref={diagramInputRef}
                      onChange={(e) => {
                        const file = e.target.files ? e.target.files[0] : null;
                        setDiagramFile(file);
                        if (diagramUrl) {
                          URL.revokeObjectURL(diagramUrl);
                        }
                        if (file) {
                          setDiagramUrl(URL.createObjectURL(file));
                        } else {
                          setDiagramUrl(null);
                        }
                      }}
                      className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-gray-100 file:text-gray-700 hover:file:bg-gray-200"
                    />
                    {diagramFile && (
                      <button onClick={handleClearDiagram} className="absolute top-7 right-3 text-gray-400 hover:text-gray-700">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                    )}
                  </div>
                  <p className="text-xs text-gray-500 pt-2">
                    Supports TXT, MD for documents. PNG, JPG, WEBP for diagrams. Max 10MB.
                  </p>
                </div>
                <button onClick={handleAnalyze} disabled={isLoading || (!documentFile && !diagramFile)} className="mt-8 w-full bg-blue-600 text-white font-bold py-3 px-4 rounded-lg hover:bg-blue-700 transition-colors disabled:bg-blue-300 disabled:cursor-not-allowed">
                  {isLoading ? statusMessage : "Analyze"}
                </button>
              </div>
            )}
          </div>
        </div>

        {selectedTerm && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4">
            <div className="bg-white p-8 rounded-lg shadow-2xl max-w-2xl w-full max-h-full overflow-y-auto">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-2xl font-bold text-gray-800">{selectedTerm}</h2>
                <button onClick={() => setSelectedTerm(null)} className="text-gray-500 hover:text-gray-800 text-2xl">&times;</button>
              </div>
              {isTermLoading ? (
                <p>Loading explanation...</p>
              ) : termExplanation ? (
                <div>
                  <div className="prose max-w-none">
                    <ReactMarkdown>{termExplanation.explanation}</ReactMarkdown>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <h4 className="font-semibold">Pros</h4>
                      <ul className="list-disc list-inside">{termExplanation.pros.map((pro, i) => <li key={i}>{pro}</li>)}</ul>
                    </div>
                    <div>
                      <h4 className="font-semibold">Cons</h4>
                      <ul className="list-disc list-inside">{termExplanation.cons.map((con, i) => <li key={i}>{con}</li>)}</ul>
                    </div>
                    <div>
                      <h4 className="font-semibold">Alternatives</h4>
                      <ul className="list-disc list-inside space-y-1">
                        {termExplanation.alternatives.map((alt, i) => (
                          <li key={i}>
                            <span
                              className="font-semibold text-blue-600 cursor-pointer hover:underline"
                              onClick={() => handleTermClick(alt.term)}
                            >
                              {alt.term}:
                            </span>
                            <span className="ml-1">{alt.description}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                  <div className="mt-4 space-y-3">
                    <h3 className="text-lg font-semibold border-b pb-1">Further Reading</h3>
                    {Object.entries(groupLinksByCategory(termExplanation.links)).map(([category, links]) => (
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
                  <button onClick={() => {
                      if (selectedTerm && termExplanation) {
                          handleSaveTerm(selectedTerm, termExplanation)
                      }
                  }} className="mt-6 w-full bg-green-500 text-white font-semibold py-2 px-4 rounded-lg hover:bg-green-600 transition-colors">
                    Save to Notebook
                  </button>
                </div>
              ) : (
                <p>No explanation available.</p>
              )}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
