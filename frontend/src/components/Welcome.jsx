import React from 'react';

function Welcome({ onStart }) {
  return (
    <div className="min-h-screen flex items-center justify-center p-8">
      <div className="text-center max-w-4xl">
        {/* Logo with underline decoration */}
        <div className="relative inline-block mb-6">
          <h1 className="text-9xl text-red-600 redink-font font-bold">
            RedInk
          </h1>
          <div className="absolute -bottom-4 left-0 right-0 h-1 bg-red-400 rounded-full opacity-50"></div>
        </div>
        
        {/* Tagline */}
        <p className="text-4xl text-gray-700 mb-4 redink-font">
          Let's grade some A+'s
        </p>
        
        <p className="text-lg text-gray-600 mb-12 max-w-2xl mx-auto">
          AI-powered grading assistant with human-in-the-loop review. 
          Save time while maintaining quality and fairness in student evaluations.
        </p>
        
        {/* Start Button */}
        <button
          onClick={onStart}
          className="bg-red-600 hover:bg-red-700 text-white text-2xl px-16 py-5 rounded-xl shadow-xl transition-all transform hover:scale-105 hover:shadow-2xl font-semibold"
        >
          Start Grading
        </button>
        
        {/* Features Grid */}
        <div className="grid grid-cols-3 gap-8 mt-20">
          <div className="paper-bg p-6 rounded-lg">
            <div className="text-4xl mb-3">🤖</div>
            <h3 className="font-semibold text-gray-900 mb-2">AI-Powered</h3>
            <p className="text-sm text-gray-600">Multi-agent system analyzes rubrics and student work</p>
          </div>
          <div className="paper-bg p-6 rounded-lg">
            <div className="text-4xl mb-3">👤</div>
            <h3 className="font-semibold text-gray-900 mb-2">Human Review</h3>
            <p className="text-sm text-gray-600">You have final say on all grades and feedback</p>
          </div>
          <div className="paper-bg p-6 rounded-lg">
            <div className="text-4xl mb-3">⚡</div>
            <h3 className="font-semibold text-gray-900 mb-2">Save Time</h3>
            <p className="text-sm text-gray-600">Grade faster without sacrificing quality</p>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Welcome;