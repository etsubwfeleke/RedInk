import React, { useState, useEffect } from 'react';
import Welcome from './components/Welcome';
import Sidebar from './components/Sidebar';
import AIConfig from './components/AIconfig';
import UploadPage from './components/UploadPage';
import ReviewQueue from './components/ReviewQueue';
import Results from './components/Results';
import PublishPage from './components/PublishPage';
import GradingPage from './components/GradingPage';
import BulkReview from './components/BulkReview';

function App() {
  const [showWelcome, setShowWelcome] = useState(true);
  const [currentPage, setCurrentPage] = useState('config');
  const [aiConfig, setAiConfig] = useState(null);
  const [workflowId, setWorkflowId] = useState(null);
  const [gradingResult, setGradingResult] = useState(null);
  const [bulkResults, setBulkResults] = useState(null);
  const [isBulkMode, setIsBulkMode] = useState(false);


  useEffect(() => {
    const saved = localStorage.getItem('redink_config');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        setAiConfig(parsed);
      } catch (e) {
        console.error('Failed to load saved config');
      }
    }
  }, []);

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
  
  // Save to student history
  const studentRecord = {
    name: result.student_name || 'Student ' + (Date.now() % 1000),
    course: 'Course 1',
    totalScore: result.total_score,
    maxScore: result.max_total_score,
    percentage: result.percentage,
    grade: getGradeLetter(result.percentage),
    grades: result.grades,
    overallComments: result.overall_comments,
    timestamp: Date.now()
  };
  
  // Load existing students
  const saved = localStorage.getItem('redink_students');
  const students = saved ? JSON.parse(saved) : [];
  
  // Add new student
  students.push(studentRecord);
  
  // Save back
  localStorage.setItem('redink_students', JSON.stringify(students));
  
  setCurrentPage('results');
};

// Helper function for grade letter
const getGradeLetter = (percent) => {
  if (percent >= 90) return 'A';
  if (percent >= 80) return 'B';
  if (percent >= 70) return 'C';
  if (percent >= 60) return 'D';
  return 'F';
};
  

  const handleNewGrading = () => {
    setWorkflowId(null);
    setGradingResult(null);
    setCurrentPage('grading');
  };  

  if (showWelcome) {
    return <Welcome onStart={handleStart} />;
  }
  const handleBulkGradingInitiated = (data) => {
  setBulkResults(data);
  setIsBulkMode(true);
  setCurrentPage('review');
};

const handleBulkComplete = (allResults) => {
  // Save all students to history
  allResults.forEach(result => {
    const studentRecord = {
      name: result.student_name || 'Unknown',
      course: 'Course 1',
      totalScore: result.total_score,
      maxScore: result.max_total_score,
      percentage: result.percentage,
      grade: getGradeLetter(result.percentage),
      grades: result.grades,
      overallComments: result.overall_comments,
      timestamp: Date.now()
    };
    
    const saved = localStorage.getItem('redink_students');
    const students = saved ? JSON.parse(saved) : [];
    students.push(studentRecord);
    localStorage.setItem('redink_students', JSON.stringify(students));
  });

  setBulkResults(null);
  setIsBulkMode(false);
  setCurrentPage('publish');
  alert(`Successfully graded ${allResults.length} students!`);
};

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
          <UploadPage onCourseSetup={() => {}} />
        )}

        {currentPage === 'grading' && (
          <GradingPage 
            config={aiConfig}
            onGradingInitiated={handleGradingInitiated}
            onBulkGradingInitiated={handleBulkGradingInitiated}
          />
        )}

        {currentPage === 'review' && (
          <>
            {isBulkMode && bulkResults ? (
              <BulkReview 
                bulkData={bulkResults}
                config={aiConfig}
                onComplete={handleBulkComplete}
              />
            ) : workflowId ? (
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
                        <p className="font-semibold text-gray-700">Setup Course</p>
                      </div>
                      <div className="paper-bg p-4 rounded-lg border-2 border-red-300 bg-red-50">
                        <div className="text-3xl mb-2">3️⃣</div>
                        <p className="font-semibold text-red-700">Grade Students</p>
                      </div>
                    </div>
                    <button
                      onClick={() => setCurrentPage('grading')}
                      className="mt-8 bg-red-600 hover:bg-red-700 text-white font-semibold px-8 py-4 rounded-lg transition-all"
                    >
                      Go to Grading →
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
          <PublishPage />
        )}
      </div>
    </div>
  );
}
          
export default App;