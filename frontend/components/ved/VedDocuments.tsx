import React, { useState, useEffect, useRef } from 'react';
import { 
  BookOpen, 
  FileText, 
  Plus, 
  Search, 
  Trash2, 
  Loader2, 
  CheckCircle2, 
  Eye, 
  X, 
  AlertCircle, 
  Database, 
  Sparkles,
  UploadCloud,
  FileSpreadsheet,
  FileCode,
  File
} from 'lucide-react';

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://127.0.0.1:3001';

export default function VedDocuments() {
  const [sources, setSources] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [uploadMode, setUploadMode] = useState<'file' | 'text'>('file');
  const [newTitle, setNewTitle] = useState('');
  const [newContent, setNewContent] = useState('');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [inspectorSource, setInspectorSource] = useState<any>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const fetchSources = async () => {
    setIsLoading(true);
    setErrorMessage('');
    try {
      const response = await fetch(`${BACKEND_URL}/knowledge`);
      const data = await response.json();
      setSources(Array.isArray(data) ? data : []);
    } catch (err: any) {
      console.error('Error fetching VED documents:', err);
      setErrorMessage('Failed to load knowledge base documents');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchSources();
  }, []);

  const handleFileSelect = (file: File) => {
    setSelectedFile(file);
    if (!newTitle.trim()) {
      // Auto-populate title from file name without extension
      const nameWithoutExt = file.name.replace(/\.[^/.]+$/, "");
      setNewTitle(nameWithoutExt);
    }
    setErrorMessage('');
  };

  const handleAddDocument = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');

    if (uploadMode === 'file') {
      if (!selectedFile) {
        setErrorMessage('Please select a file to upload (PDF, CSV, TXT, JSON, MD)');
        return;
      }

      setIsSubmitting(true);
      try {
        const formData = new FormData();
        formData.append('file', selectedFile);
        formData.append('title', newTitle.trim() || selectedFile.name);
        formData.append('entity', 'VED');

        const response = await fetch(`${BACKEND_URL}/knowledge/upload`, {
          method: 'POST',
          body: formData
        });

        const data = await response.json();
        if (response.ok && data.success) {
          setSelectedFile(null);
          setNewTitle('');
          setIsModalOpen(false);
          fetchSources();
        } else {
          setErrorMessage(data.error || 'Failed to upload file');
        }
      } catch (err: any) {
        setErrorMessage(err.message || 'Error uploading file to server');
      } finally {
        setIsSubmitting(false);
      }
      return;
    }

    // Text Mode
    if (!newTitle.trim() || !newContent.trim()) {
      setErrorMessage('Please provide both a title and content');
      return;
    }

    setIsSubmitting(true);
    try {
      const response = await fetch(`${BACKEND_URL}/knowledge/text`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: newTitle.trim(),
          content: newContent.trim(),
          entity: 'VED'
        })
      });

      if (response.ok) {
        setNewTitle('');
        setNewContent('');
        setIsModalOpen(false);
        fetchSources();
      } else {
        const data = await response.json();
        setErrorMessage(data.error || 'Failed to save document');
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'Error saving document');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to remove this document from VED knowledge?')) return;
    try {
      const response = await fetch(`${BACKEND_URL}/knowledge/${id}`, {
        method: 'DELETE'
      });
      if (response.ok) {
        if (inspectorSource?.id === id) setInspectorSource(null);
        fetchSources();
      }
    } catch (err) {
      console.error('Failed to delete document:', err);
    }
  };

  const filteredSources = sources.filter(s => 
    (s.title || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
    (s.content || '').toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="flex-1 flex flex-col min-w-0 bg-[#070708] p-8 overflow-y-auto scrollbar-hide text-white">
      <div className="max-w-6xl mx-auto w-full space-y-8 pb-16">
        
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-white/5 pb-6">
          <div>
            <div className="flex items-center gap-2.5 mb-1.5">
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-widest bg-blue-500/10 text-blue-400 border border-blue-500/20">
                Knowledge Base
              </span>
              <span className="text-xs text-neutral-500 font-medium font-mono">
                {sources.length} Verified Sources Active
              </span>
            </div>
            <h1 className="text-2xl font-black tracking-tight text-white font-display">Documents</h1>
            <p className="text-xs text-neutral-400 font-medium mt-0.5">
              What does VED know? Manage the factual documents and knowledge sources that ground all AI responses.
            </p>
          </div>

          <button
            onClick={() => setIsModalOpen(true)}
            className="px-4 py-2.5 bg-white text-black hover:bg-neutral-200 text-xs font-bold rounded-xl transition-all flex items-center gap-2 shadow-sm cursor-pointer self-start md:self-auto"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Add Document</span>
          </button>
        </div>

        {/* Search & Stats Bar */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="md:col-span-2 relative">
            <Search className="w-3.5 h-3.5 absolute left-3.5 top-1/2 -translate-y-1/2 text-neutral-500" />
            <input
              type="text"
              placeholder="Search documents and factual content..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-4 py-2.5 bg-[#0c0c0e] border border-white/5 rounded-xl text-xs text-white placeholder-neutral-500 focus:outline-none focus:border-white/20 transition-all font-medium"
            />
          </div>
          <div className="p-3.5 rounded-xl bg-[#0c0c0e] border border-white/5 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Database className="w-4 h-4 text-emerald-400" />
              <span className="text-xs font-semibold text-neutral-300">Grounded Knowledge</span>
            </div>
            <span className="text-xs font-mono font-bold text-white">{sources.length} Entries</span>
          </div>
        </div>

        {/* Knowledge Status Alert */}
        <div className="p-4 rounded-2xl bg-white/[0.02] border border-white/5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            <div>
              <div className="text-xs font-bold text-white">Factual Lock-in Enabled</div>
              <div className="text-[11px] text-neutral-400">
                VED strictly prioritizes facts in these documents over generic model knowledge, answering caller inquiries with zero hallucination.
              </div>
            </div>
          </div>
        </div>

        {/* Documents Grid / List */}
        {isLoading ? (
          <div className="py-20 flex flex-col items-center justify-center text-neutral-500 gap-3">
            <Loader2 className="w-6 h-6 animate-spin text-white" />
            <p className="text-xs font-medium">Loading VED knowledge library...</p>
          </div>
        ) : filteredSources.length === 0 ? (
          <div className="py-20 border border-dashed border-white/10 rounded-3xl flex flex-col items-center justify-center text-center p-8">
            <BookOpen className="w-10 h-10 text-neutral-600 mb-3" />
            <h3 className="text-sm font-bold text-white mb-1">No documents found</h3>
            <p className="text-xs text-neutral-400 max-w-sm mb-5">
              {searchQuery ? 'No documents match your query.' : 'Add knowledge text or guidelines to equip VED with institutional intelligence.'}
            </p>
            <button
              onClick={() => setIsModalOpen(true)}
              className="px-4 py-2 bg-white text-black text-xs font-bold rounded-xl hover:bg-neutral-200 transition-all cursor-pointer"
            >
              Add First Document
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {filteredSources.map((source: any) => (
              <div
                key={source.id}
                className="p-5 border border-white/5 rounded-2xl bg-[#0c0c0e] hover:border-white/15 transition-all flex flex-col justify-between group relative"
              >
                <div>
                  <div className="flex items-start justify-between gap-3 mb-3">
                    <div className="flex items-center gap-2">
                      <div className="p-2 rounded-lg bg-white/5 text-neutral-300">
                        {source.type === 'PDF' ? (
                          <FileText className="w-4 h-4 text-rose-400" />
                        ) : source.type === 'CSV' ? (
                          <FileSpreadsheet className="w-4 h-4 text-emerald-400" />
                        ) : source.type === 'JSON' ? (
                          <FileCode className="w-4 h-4 text-amber-400" />
                        ) : (
                          <FileText className="w-4 h-4 text-blue-400" />
                        )}
                      </div>
                      <span className="text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                        {source.type || 'TEXT'}
                      </span>
                    </div>
                    <button
                      onClick={() => handleDelete(source.id)}
                      className="text-neutral-500 hover:text-rose-400 p-1.5 rounded-lg hover:bg-white/5 transition-all cursor-pointer"
                      title="Delete Document"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  <h3 className="text-sm font-bold text-white mb-1.5 line-clamp-1">{source.title || 'Untitled Document'}</h3>
                  <p className="text-xs text-neutral-400 font-medium leading-relaxed line-clamp-3 mb-4">
                    {source.content || 'No content preview available.'}
                  </p>
                </div>

                <div className="pt-3 border-t border-white/5 flex items-center justify-between text-[11px] text-neutral-500">
                  <span className="font-mono">{source.created_at ? new Date(source.created_at).toLocaleDateString() : 'Active'}</span>
                  <button
                    onClick={() => setInspectorSource(source)}
                    className="text-white hover:text-neutral-300 font-semibold flex items-center gap-1 cursor-pointer"
                  >
                    <Eye className="w-3 h-3" />
                    <span>View Text</span>
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Add Document Modal */}
        {isModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
            <div className="bg-[#0c0c0e] border border-white/10 rounded-2xl w-full max-w-lg p-6 space-y-5 shadow-2xl relative">
              <div className="flex items-center justify-between border-b border-white/5 pb-4">
                <div className="flex items-center gap-2">
                  <BookOpen className="w-4 h-4 text-emerald-400" />
                  <h3 className="text-sm font-bold text-white">Add Knowledge to VED</h3>
                </div>
                <button 
                  onClick={() => setIsModalOpen(false)}
                  className="text-neutral-400 hover:text-white p-1 rounded-lg cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Upload Mode Selector */}
              <div className="grid grid-cols-2 p-1 bg-white/5 rounded-xl gap-1">
                <button
                  type="button"
                  onClick={() => setUploadMode('file')}
                  className={`py-2 text-xs font-bold rounded-lg transition-all flex items-center justify-center gap-2 cursor-pointer ${
                    uploadMode === 'file' 
                      ? 'bg-white text-black shadow-sm' 
                      : 'text-neutral-400 hover:text-white'
                  }`}
                >
                  <UploadCloud className="w-3.5 h-3.5" />
                  <span>Upload File (PDF/CSV/TXT)</span>
                </button>
                <button
                  type="button"
                  onClick={() => setUploadMode('text')}
                  className={`py-2 text-xs font-bold rounded-lg transition-all flex items-center justify-center gap-2 cursor-pointer ${
                    uploadMode === 'text' 
                      ? 'bg-white text-black shadow-sm' 
                      : 'text-neutral-400 hover:text-white'
                  }`}
                >
                  <FileText className="w-3.5 h-3.5" />
                  <span>Direct Text Entry</span>
                </button>
              </div>

              <form onSubmit={handleAddDocument} className="space-y-4">
                <div>
                  <label className="text-[11px] font-bold text-neutral-400 block mb-1.5 uppercase tracking-wider">
                    Document Title / Topic (Optional)
                  </label>
                  <input
                    type="text"
                    placeholder={selectedFile ? selectedFile.name : "e.g. Fee Schedule, Product FAQ, Registration Data"}
                    value={newTitle}
                    onChange={(e) => setNewTitle(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-[#070708] border border-white/10 rounded-xl text-xs text-white placeholder-neutral-500 focus:outline-none focus:border-white/20 transition-all"
                  />
                </div>

                {uploadMode === 'file' ? (
                  <div>
                    <label className="text-[11px] font-bold text-neutral-400 block mb-1.5 uppercase tracking-wider">
                      Choose File from Computer
                    </label>
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept=".pdf,.csv,.txt,.json,.md,text/plain,text/csv,application/pdf,application/json"
                      onChange={(e) => {
                        if (e.target.files && e.target.files[0]) {
                          handleFileSelect(e.target.files[0]);
                        }
                      }}
                      className="hidden"
                    />

                    <div
                      onClick={() => fileInputRef.current?.click()}
                      className={`border-2 border-dashed rounded-2xl p-6 flex flex-col items-center justify-center cursor-pointer transition-all ${
                        selectedFile
                          ? 'border-emerald-500/50 bg-emerald-500/5'
                          : 'border-white/10 hover:border-white/20 bg-white/[0.02]'
                      }`}
                    >
                      {selectedFile ? (
                        <div className="flex flex-col items-center text-center space-y-2">
                          <div className="p-3 bg-emerald-500/10 text-emerald-400 rounded-xl">
                            <CheckCircle2 className="w-6 h-6" />
                          </div>
                          <div>
                            <p className="text-xs font-bold text-white">{selectedFile.name}</p>
                            <p className="text-[10px] text-neutral-400">
                              {(selectedFile.size / 1024).toFixed(1)} KB • Ready for VED knowledge ingestion
                            </p>
                          </div>
                          <span className="text-[10px] font-semibold text-emerald-400 underline">
                            Click to choose a different file
                          </span>
                        </div>
                      ) : (
                        <div className="flex flex-col items-center text-center space-y-2">
                          <div className="p-3 bg-white/5 text-neutral-300 rounded-xl">
                            <UploadCloud className="w-6 h-6" />
                          </div>
                          <div>
                            <p className="text-xs font-bold text-white">Click or drag file to upload</p>
                            <p className="text-[11px] text-neutral-400 mt-0.5">
                              Supports PDF, CSV, TXT, JSON, and Markdown (up to 15MB)
                            </p>
                          </div>
                          <div className="flex items-center gap-1.5 pt-1">
                            <span className="px-2 py-0.5 bg-white/5 rounded text-[9px] text-neutral-400 font-mono">.pdf</span>
                            <span className="px-2 py-0.5 bg-white/5 rounded text-[9px] text-neutral-400 font-mono">.csv</span>
                            <span className="px-2 py-0.5 bg-white/5 rounded text-[9px] text-neutral-400 font-mono">.txt</span>
                            <span className="px-2 py-0.5 bg-white/5 rounded text-[9px] text-neutral-400 font-mono">.json</span>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                ) : (
                  <div>
                    <label className="text-[11px] font-bold text-neutral-400 block mb-1.5 uppercase tracking-wider">
                      Content & Factual Guidelines
                    </label>
                    <textarea
                      required={uploadMode === 'text'}
                      rows={6}
                      placeholder="Enter the factual facts, answers, dates, eligibility details, or institutional procedures VED will reference directly..."
                      value={newContent}
                      onChange={(e) => setNewContent(e.target.value)}
                      className="w-full px-3.5 py-2.5 bg-[#070708] border border-white/10 rounded-xl text-xs text-white placeholder-neutral-500 focus:outline-none focus:border-white/20 transition-all"
                    />
                  </div>
                )}

                {errorMessage && (
                  <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 flex items-center gap-2 text-xs text-rose-400">
                    <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                    <span>{errorMessage}</span>
                  </div>
                )}

                <div className="flex items-center justify-end gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => {
                      setIsModalOpen(false);
                      setSelectedFile(null);
                      setErrorMessage('');
                    }}
                    className="px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-neutral-300 text-xs font-semibold cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmitting || (uploadMode === 'file' && !selectedFile)}
                    className="px-4 py-2 rounded-xl bg-white text-black hover:bg-neutral-200 text-xs font-bold flex items-center gap-2 cursor-pointer transition-all disabled:opacity-50"
                  >
                    {isSubmitting && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                    <span>{uploadMode === 'file' ? 'Upload & Process File' : 'Save to Knowledge Base'}</span>
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* View Document Modal */}
        {inspectorSource && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
            <div className="bg-[#0c0c0e] border border-white/10 rounded-2xl w-full max-w-lg p-6 space-y-4 shadow-2xl relative">
              <div className="flex items-center justify-between border-b border-white/5 pb-3">
                <h3 className="text-sm font-bold text-white">{inspectorSource.title}</h3>
                <button 
                  onClick={() => setInspectorSource(null)}
                  className="text-neutral-400 hover:text-white p-1 rounded-lg cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
              <div className="max-h-80 overflow-y-auto pr-2">
                <p className="text-xs text-neutral-300 leading-relaxed whitespace-pre-wrap">
                  {inspectorSource.content}
                </p>
              </div>
              <div className="pt-2 flex justify-end">
                <button
                  onClick={() => setInspectorSource(null)}
                  className="px-4 py-2 bg-white text-black rounded-xl text-xs font-bold hover:bg-neutral-200 cursor-pointer"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
