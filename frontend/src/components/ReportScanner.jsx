import React, { useState } from 'react';
import { Upload, FileText, CheckCircle, AlertCircle, Loader2, Sparkles } from 'lucide-react';
import axios from 'axios';
import './report.css'
const ReportScanner = () => {
  const [file, setFile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);

  const handleFileChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
      setError(null);
      setResult(null);
    }
  };

  const handleUpload = async () => {
    if (!file) return;

    setLoading(true);
    setError(null);
    const formData = new FormData();
    formData.append('file', file);

    try {
      const response = await axios.post('http://127.0.0.1:8000/scan-report', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });
      setResult(response.data);
    } catch (err) {
      setError('Analysis failed. Ensure the backend is running and the file is an image.');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="section-card">
        <h2 className="text-2xl font-bold mb-6 flex items-center gap-2">
          <Sparkles className="text-purple-500" /> AI Medical Report Scanner
        </h2>
        
        <div className="upload-zone border-2 border-dashed border-gray-300 rounded-xl p-8 text-center hover:border-blue-400 transition-colors cursor-pointer group">
          <input 
            type="file" 
            onChange={handleFileChange} 
            className="hidden" 
            id="file-upload" 
            accept="image/*"
          />
          <label htmlFor="file-upload" className="cursor-pointer">
            <div className="flex flex-col items-center gap-3">
              <Upload className="w-12 h-12 text-gray-400 group-hover:text-blue-500 transition-colors" />
              <p className="text-lg font-medium">
                {file ? file.name : "Select or Drag Clinical Report Image"}
              </p>
              <p className="text-sm text-gray-500">Supports PNG, JPG, or PDF (Images only for now)</p>
            </div>
          </label>
        </div>

        {file && !loading && !result && (
          <div className="mt-6 flex justify-center">
            <button 
              onClick={handleUpload}
              className="bg-purple-600 text-white px-8 py-3 rounded-lg hover:bg-purple-700 transition-all shadow-lg hover:shadow-purple-200 flex items-center gap-2"
            >
              Analyze with Gemini AI
            </button>
          </div>
        )}

        {loading && (
          <div className="mt-8 text-center space-y-4">
            <Loader2 className="w-10 h-10 animate-spin text-purple-600 mx-auto" />
            <p className="text-lg font-semibold animate-pulse">Analyzing...</p>
            <div className="w-full bg-gray-100 h-2 rounded-full overflow-hidden max-w-xs mx-auto">
              <div className="bg-purple-600 h-full animate-[progress_2s_infinite]"></div>
            </div>
          </div>
        )}

        {error && (
          <div className="mt-6 p-4 bg-red-50 text-red-600 rounded-lg flex items-center gap-2 border border-red-100">
            <AlertCircle className="w-5 h-5 flex-shrink-0" /> {error}
          </div>
        )}
      </div>

      {result && (
        <div className="section-card bg-gradient-to-br from-white to-purple-50 border-purple-100 shadow-xl animate-scale-up">
          <div className="flex justify-between items-start mb-6">
            <h3 className="text-xl font-bold flex items-center gap-2">
              <FileText className="text-purple-600" /> Analysis Result
            </h3>
            <div className="flex flex-col items-end">
              <span className={`px-3 py-1 rounded-full text-xs font-bold ${result.confidence_score > 0.8 ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'}`}>
                Confidence: {(result.confidence_score * 100).toFixed(0)}%
              </span>
              {!result.is_valid_medical_report && (
                <span className="text-red-500 text-[10px] mt-1 font-bold">POSSIBLY NON-MEDICAL</span>
              )}
            </div>
          </div>

          <div className="space-y-6">
            <div>
              <p className="text-gray-700 leading-relaxed italic border-l-4 border-purple-200 pl-4 py-1">
                "{result.summary}"
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <h4 className="font-bold text-sm text-purple-700 uppercase mb-3 tracking-wider">Key Observations</h4>
                <ul className="space-y-2">
                  {result.key_observations.map((obs, i) => (
                    <li key={i} className="flex items-start gap-2 text-sm text-gray-600">
                      <CheckCircle className="w-4 h-4 text-green-500 mt-0.5 flex-shrink-0" />
                      {obs}
                    </li>
                  ))}
                </ul>
              </div>

              <div>
                <h4 className="font-bold text-sm text-red-700 uppercase mb-3 tracking-wider">Detected Conditions</h4>
                <div className="flex flex-wrap gap-2">
                  {result.detected_conditions.map((cond, i) => (
                    <span key={i} className="bg-red-50 text-red-700 px-3 py-1 rounded-md text-xs font-semibold border border-red-100">
                      {cond}
                    </span>
                  ))}
                  {result.detected_conditions.length === 0 && (
                    <span className="text-gray-400 text-sm italic">None explicitly detected</span>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ReportScanner;
