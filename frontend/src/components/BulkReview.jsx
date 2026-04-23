import React, { useState, useEffect } from 'react';
import ReviewQueue from './ReviewQueue';
import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

function BulkReview({ bulkData, config, onComplete }) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [completedGrades, setCompletedGrades] = useState([]);
  const [currentWorkflowId, setCurrentWorkflowId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const totalStudents = bulkData.students.length;
  const currentStudent = bulkData.students[currentIndex];
  const isLastStudent = currentIndex === totalStudents - 1;

  // Grade current student when index changes
  useEffect(() => {
    gradeCurrentStudent();
  }, [currentIndex]);

  const fileToBase64 = (file) => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result.split(',')[1]);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  };

  const gradeCurrentStudent = async () => {
    setLoading(true);
    setError(null);

    try {
      const studentFile = await fileToBase64(currentStudent.file);

      const request = {
        llm_provider: config.llm_provider,
        api_key: config.api_key,
        model_name: config.model_name || null,
        rubric_file: bulkData.rubric_file,
        rubric_filename: bulkData.rubric_filename,
        student_file: studentFile,
        student_filename: currentStudent.filename,
        golden_file: bulkData.golden_file,
        golden_filename: bulkData.golden_filename,
        student_name: currentStudent.student_name,
        additional_context: bulkData.additional_context
      };

      const response = await axios.post(`${API_URL}/api/grading/initiate`, request);
      setCurrentWorkflowId(response.data.workflow_id);
      setLoading(false);

    } catch (err) {
      console.error('Error grading student:', err);
      setError(err.response?.data?.detail || err.message);
      setLoading(false);
    }
  };

  const handleStudentComplete = (result) => {
    const updated = [...completedGrades, { ...result, student_name: currentStudent.student_name }];
    setCompletedGrades(updated);

    if (isLastStudent) {
      // All done
      onComplete(updated);
    } else {
      // Move to next student
      setCurrentIndex(currentIndex + 1);
      setCurrentWorkflowId(null);
    }
  };

  return (
    <div>
      {/* Progress Header */}
      <div className="bg-white border-b-2 border-gray-200 px-12 py-6 sticky top-0 z-10">
        <div className="max-w-6xl mx-auto">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-2xl font-bold text-gray-900">
                Bulk Grading Progress
              </h3>
              <p className="text-gray-600">
                Student {currentIndex + 1} of {totalStudents}: {currentStudent.student_name}
              </p>
            </div>
            <div className="text-right">
              <div className="text-sm text-gray-500 mb-1">Completed</div>
              <div className="text-3xl font-bold text-red-600">
                {completedGrades.length} / {totalStudents}
              </div>
            </div>
          </div>

          {/* Progress Bar */}
          <div className="h-3 bg-gray-200 rounded-full overflow-hidden">
            <div
              className="h-full bg-red-600 transition-all duration-500"
              style={{ width: `${(completedGrades.length / totalStudents) * 100}%` }}
            />
          </div>
        </div>
      </div>

      {/* Current Student Review */}
      {loading ? (
        <div className="max-w-4xl mx-auto p-12 text-center">
          <div className="paper-bg p-12 rounded-2xl">
            <div className="mb-6">
              <Icon name="spinner" loading size="massive" />
            </div>
            <h3 className="text-2xl font-bold text-gray-900 mb-2">
              Grading {currentStudent.student_name}...
            </h3>
            <p className="text-gray-600">
              AI is analyzing the assignment and generating proposed grades
            </p>
          </div>
        </div>
      ) : error ? (
        <div className="max-w-4xl mx-auto p-12">
          <div className="paper-bg border-l-4 border-red-500 p-8 rounded-lg">
            <h3 className="text-2xl font-bold text-red-900 mb-2">
              Error Grading {currentStudent.student_name}
            </h3>
            <p className="text-red-800 mb-6">{error}</p>
            <button
              onClick={() => {
                if (isLastStudent) {
                  onComplete(completedGrades);
                } else {
                  setCurrentIndex(currentIndex + 1);
                }
              }}
              className="bg-red-600 hover:bg-red-700 text-white font-semibold px-6 py-3 rounded-lg"
            >
              {isLastStudent ? 'Finish' : 'Skip to Next Student →'}
            </button>
          </div>
        </div>
      ) : currentWorkflowId ? (
        <ReviewQueue
          workflowId={currentWorkflowId}
          onComplete={handleStudentComplete}
          studentName={currentStudent.student_name}
        />
      ) : null}
    </div>
  );
}

export default BulkReview;