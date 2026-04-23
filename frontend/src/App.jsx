import React, { useState } from 'react';
import Welcome from './components/Welcome';
import Sidebar from './components/Sidebar';
import AIConfig from './components/AIConfig';
import UploadPage from './components/UploadPage';
import ReviewQueue from './components/ReviewQueue';
import Results from './components/Results';

function App() {
  const [showWelcome, setShowWelcome] = useState(true);
  const [currentPage, setCurrentPage] = useState('config');
  const [aiConfig, setAiConfig] = useState(null);
  const [workflowId, setWorkflowId] = useState(null);
  const [gradingResult, setGradingResult] = useState(null);

  const handleStart = () => {
    setShowWelcome(false);
    setCurrentPage('config');
  };

  const handleConfigSave = (config) => {
    setAiConfig(config);
    setCurrentPage('upload');
    alert('AI configuration saved! You can now upload files.');
  };

  const handleGradingInitiated = (data) => {
    setWorkflowId(data.workflow_id);
    setCurrentPage('review');
  };

  const handleReviewComplete = (result) => {
    setGradingResult(result);
    setCurrentPage('results');
  };

  const handleNewGrading = () => {
    setWorkflowId(null);
    setGradingResult(null);
    setCurrentPage('upload');
  };

  if (showWelcome) {
    return <Welcome onStart={handleStart} />;
  }

  return (
    <div className="flex min-h-screen bg-gray-50">
      {/* Sidebar */}
      <Sidebar currentPage={currentPage} onNavigate={setCurrentPage} />

      {/* Main Content */}
      <div className="flex-1">
        {currentPage === 'config' && (
          <AIConfig onSave={handleConfigSave} />
        )}

        {currentPage === 'upload' && (
          <UploadPage 
            config={aiConfig}
            onGradingInitiated={handleGradingInitiated}
          />
        )}

        {currentPage === 'review' && (
          <>
            {workflowId ? (
              <ReviewQueue 
                workflowId={workflowId}
                onComplete={handleReviewComplete}
              />
            ) : (
              <div className="flex items-center justify-center min-h-screen p-8">
                <div className="text-center max-w-2xl">
                  <div className="paper-bg rounded-2xl shadow-lg p-12 border-2 border-gray-200">
                    <div className="text-8xl mb-6">✏️</div>
                    <h3 className="text-4xl font-bold text-gray-900 mb-4 redink-font text-red-600">
                      No Grades to Review
                    </h3>
                    <p className="text-lg text-gray-600 mb-8">
                      Upload files and start the grading process to see proposed grades here.
                    </p>
                    <div className="grid grid-cols-3 gap-4 text-sm">
                      <div className="paper-bg p-4 rounded-lg border-2 border-gray-200">
                        <div className="text-3xl mb-2">1️⃣</div>
                        <p className="font-semibold text-gray-700">Configure AI</p>
                      </div>
                      <div className="paper-bg p-4 rounded-lg border-2 border-gray-200">
                        <div className="text-3xl mb-2">2️⃣</div>
                        <p className="font-semibold text-gray-700">Upload Files</p>
                      </div>
                      <div className="paper-bg p-4 rounded-lg border-2 border-red-300 bg-red-50">
                        <div className="text-3xl mb-2">3️⃣</div>
                        <p className="font-semibold text-red-700">Review Here</p>
                      </div>
                    </div>
                    <button
                      onClick={() => setCurrentPage('upload')}
                      className="mt-8 bg-red-600 hover:bg-red-700 text-white font-semibold px-8 py-4 rounded-lg transition-all"
                    >
                      Go to Upload →
                    </button>
                  </div>
                </div>
              </div>
            )}
          </>
        )}

        {currentPage === 'results' && (
          <>
            {gradingResult ? (
              <Results 
                result={gradingResult}
                onNewGrading={handleNewGrading}
              />
            ) : (
              <div className="flex items-center justify-center min-h-screen p-8">
                <div className="text-center max-w-2xl">
                  <div className="paper-bg rounded-2xl shadow-lg p-12 border-2 border-gray-200">
                    <div className="text-8xl mb-6">📋</div>
                    <h3 className="text-4xl font-bold text-gray-900 mb-4 redink-font text-red-600">
                      No Results Yet
                    </h3>
                    <p className="text-lg text-gray-600 mb-8">
                      Complete the review process to see final results and feedback here.
                    </p>
                    <button
                      onClick={() => setCurrentPage('upload')}
                      className="bg-red-600 hover:bg-red-700 text-white font-semibold px-8 py-4 rounded-lg transition-all"
                    >
                      Start New Grading →
                    </button>
                  </div>
                </div>
              </div>
            )}
          </>
        )}

        {currentPage === 'publish' && (
          <div className="max-w-6xl mx-auto p-12">
            <div className="mb-8">
              <h2 className="text-5xl font-bold text-red-600 redink-font mb-3">
                Student History
              </h2>
              <p className="text-lg text-gray-600">
                All graded students will appear here
              </p>
            </div>

            <div className="paper-bg rounded-2xl shadow-lg p-16 text-center border-2 border-gray-200">
              <div className="text-8xl mb-6">📊</div>
              <h3 className="text-3xl font-bold text-gray-900 mb-4">
                No Students Graded Yet
              </h3>
              <p className="text-lg text-gray-600 mb-8 max-w-2xl mx-auto">
                Once you start grading assignments, you'll see a complete history here with student names, grades, and feedback.
              </p>
              
              {/* Preview of what table will look like */}
              <div className="max-w-4xl mx-auto">
                <div className="bg-gray-50 rounded-lg p-6 border-2 border-dashed border-gray-300">
                  <div className="grid grid-cols-4 gap-4 text-sm font-semibold text-gray-500 mb-3">
                    <div>Student Name</div>
                    <div>Grade</div>
                    <div>Date Graded</div>
                    <div>Actions</div>
                  </div>
                  <div className="text-gray-400 py-8">
                    <p className="italic">Student records will appear here...</p>
                  </div>
                </div>
              </div>

              <div className="mt-8">
                <button
                  onClick={() => setCurrentPage('upload')}
                  className="bg-red-600 hover:bg-red-700 text-white font-semibold px-8 py-3 rounded-lg transition-all"
                >
                  Start Grading →
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
export default App;