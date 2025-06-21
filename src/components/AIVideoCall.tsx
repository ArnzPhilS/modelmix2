import React, { useState, useEffect } from 'react';
import { X, Video, MessageCircle, Send, Loader2, AlertCircle, CheckCircle, ExternalLink, Clock, User, FileText } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { tavusService } from '../services/tavusService';

interface AIVideoCallProps {
  isOpen: boolean;
  onClose: () => void;
}

interface ConversationData {
  conversation_id: string;
  conversation_url: string;
  status: string;
}

export const AIVideoCall: React.FC<AIVideoCallProps> = ({ isOpen, onClose }) => {
  const { user, getCurrentTier } = useAuth();
  const [step, setStep] = useState<'setup' | 'creating' | 'ready' | 'error'>('setup');
  const [conversationName, setConversationName] = useState('');
  const [conversationContext, setConversationContext] = useState('');
  const [conversationData, setConversationData] = useState<ConversationData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (isOpen) {
      // Reset state when modal opens
      setStep('setup');
      setConversationName('');
      setConversationContext('');
      setConversationData(null);
      setError(null);
      setIsLoading(false);
    }
  }, [isOpen]);

  const handleCreateConversation = async () => {
    if (!user) {
      setError('Please sign in to use AI Video Call');
      return;
    }

    // Validate inputs
    const validation = tavusService.validateConversationInputs(conversationName, conversationContext);
    if (!validation.isValid) {
      setError(validation.error || 'Invalid input');
      return;
    }

    setIsLoading(true);
    setError(null);
    setStep('creating');

    try {
      const userTier = getCurrentTier();
      
      // First test if we can access the replica
      console.log('Testing replica access...');
      const canAccessReplica = await tavusService.testReplicaAccess(userTier);
      if (!canAccessReplica) {
        throw new Error('Cannot access the AI replica. Please check your API key permissions or contact support.');
      }
      
      console.log('Replica access confirmed, creating conversation...');
      const response = await tavusService.createConversation(
        conversationName.trim(),
        conversationContext.trim(),
        userTier
      );

      setConversationData(response);
      setStep('ready');
    } catch (error) {
      console.error('Failed to create Tavus conversation:', error);
      setError(error instanceof Error ? error.message : 'Failed to create video call');
      setStep('error');
    } finally {
      setIsLoading(false);
    }
  };

  const handleStartVideoCall = () => {
    if (conversationData?.conversation_url) {
      window.open(conversationData.conversation_url, '_blank', 'noopener,noreferrer');
    }
  };

  const handleRetry = () => {
    setStep('setup');
    setError(null);
    setConversationData(null);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4 animate-fadeIn">
      <div className="bg-white rounded-xl max-w-2xl w-full p-6 max-h-[90vh] overflow-y-auto transform animate-slideUp">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-blue-100 rounded-lg animate-bounceIn">
              <Video size={20} className="text-blue-600" />
            </div>
            <div>
              <h2 className="text-xl font-semibold text-gray-900">AI Video Call</h2>
              <p className="text-sm text-gray-500">Start a real-time video conversation with AI</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-lg hover:bg-gray-100 transition-all duration-200 hover:scale-110"
            disabled={isLoading}
          >
            <X size={20} className="text-gray-500" />
          </button>
        </div>

        {/* Setup Step */}
        {step === 'setup' && (
          <div className="space-y-6 animate-fadeInUp">
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <div className="flex items-start space-x-3">
                <div className="p-1 bg-blue-100 rounded-lg flex-shrink-0">
                  <Video className="text-blue-600" size={16} />
                </div>
                <div>
                  <h4 className="font-medium text-blue-800 mb-1">AI Video Call Setup</h4>
                  <p className="text-sm text-blue-700">
                    Configure your video conversation with our AI assistant. Provide a name and context to personalize the experience.
                  </p>
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  <User size={16} className="inline mr-1" />
                  Conversation Name *
                </label>
                <input
                  type="text"
                  value={conversationName}
                  onChange={(e) => setConversationName(e.target.value)}
                  placeholder="e.g., Product Strategy Discussion, Learning Session, etc."
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all duration-200"
                  maxLength={100}
                  disabled={isLoading}
                />
                <p className="text-xs text-gray-500 mt-1">
                  {conversationName.length}/100 characters
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  <FileText size={16} className="inline mr-1" />
                  Conversation Context *
                </label>
                <textarea
                  value={conversationContext}
                  onChange={(e) => setConversationContext(e.target.value)}
                  placeholder="Describe what you'd like to discuss, your goals, or any specific topics you want to cover..."
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all duration-200 resize-none"
                  rows={4}
                  maxLength={1000}
                  disabled={isLoading}
                />
                <p className="text-xs text-gray-500 mt-1">
                  {conversationContext.length}/1000 characters
                </p>
              </div>
            </div>

            {error && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-3 animate-shakeX">
                <div className="flex items-center space-x-2 text-red-700">
                  <AlertCircle size={16} />
                  <span className="text-sm">{error}</span>
                </div>
              </div>
            )}

            <div className="flex space-x-3 pt-4">
              <button
                onClick={onClose}
                className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                disabled={isLoading}
              >
                Cancel
              </button>
              <button
                onClick={handleCreateConversation}
                disabled={!conversationName.trim() || !conversationContext.trim() || isLoading}
                className="flex-1 flex items-center justify-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 hover:scale-105 transform"
              >
                {isLoading ? (
                  <>
                    <Loader2 size={16} className="animate-spin" />
                    <span>Creating...</span>
                  </>
                ) : (
                  <>
                    <Video size={16} />
                    <span>Create Video Call</span>
                  </>
                )}
              </button>
            </div>
          </div>
        )}

        {/* Creating Step */}
        {step === 'creating' && (
          <div className="text-center py-12 animate-fadeInUp">
            <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Loader2 size={32} className="text-blue-600 animate-spin" />
            </div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">Setting up your video call...</h3>
            <p className="text-gray-600 mb-4">
              We're preparing your AI video conversation. This may take a moment.
            </p>
            <div className="flex items-center justify-center space-x-2 text-sm text-gray-500">
              <Clock size={16} />
              <span>Estimated time: 30-60 seconds</span>
            </div>
          </div>
        )}

        {/* Ready Step */}
        {step === 'ready' && conversationData && (
          <div className="text-center py-8 animate-fadeInUp">
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <CheckCircle size={32} className="text-green-600" />
            </div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">Video call is ready!</h3>
            <p className="text-gray-600 mb-6">
              Your AI video conversation has been set up successfully.
            </p>

            <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 mb-6 text-left">
              <h4 className="font-medium text-gray-900 mb-3">Conversation Details</h4>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-600">Name:</span>
                  <span className="font-medium">{conversationName}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Status:</span>
                  <span className="text-green-600 font-medium">{conversationData.status}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">ID:</span>
                  <span className="font-mono text-xs">{conversationData.conversation_id}</span>
                </div>
              </div>
            </div>

            <div className="space-y-3">
              <button
                onClick={handleStartVideoCall}
                className="w-full flex items-center justify-center space-x-2 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-all duration-200 hover:scale-105 transform"
              >
                <ExternalLink size={18} />
                <span>Start Video Call</span>
              </button>
              
              <button
                onClick={onClose}
                className="w-full px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
              >
                Close
              </button>
            </div>

            <div className="mt-4 text-xs text-gray-500">
              The video call will open in a new tab. Make sure to allow camera and microphone access.
            </div>
          </div>
        )}

        {/* Error Step */}
        {step === 'error' && (
          <div className="text-center py-8 animate-fadeInUp">
            <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <AlertCircle size={32} className="text-red-600" />
            </div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">Setup Failed</h3>
            <p className="text-gray-600 mb-4">
              We couldn't set up your video call. Please try again.
            </p>

            {error && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-3 mb-6 text-left">
                <p className="text-sm text-red-700">{error}</p>
                
                {/* Show helpful hints based on error type */}
                {error.includes('API key') && (
                  <div className="mt-2 text-xs text-red-600 bg-red-100 p-2 rounded">
                    💡 <strong>Tip:</strong> Make sure a valid Tavus API key is configured in the Admin Dashboard under Global API Keys.
                  </div>
                )}
                
                {error.includes('replica') && (
                  <div className="mt-2 text-xs text-red-600 bg-red-100 p-2 rounded">
                    💡 <strong>Tip:</strong> The AI replica may not be accessible with your API key. Please contact support.
                  </div>
                )}
                
                {error.includes('Invalid request') && (
                  <div className="mt-2 text-xs text-red-600 bg-red-100 p-2 rounded">
                    💡 <strong>Tip:</strong> Please check that your conversation name and context are properly filled out and try again.
                  </div>
                )}
                
                {error.includes('Network error') && (
                  <div className="mt-2 text-xs text-red-600 bg-red-100 p-2 rounded">
                    💡 <strong>Tip:</strong> Please check your internet connection and try again.
                  </div>
                )}
              </div>
            )}

            <div className="space-y-3">
              <button
                onClick={handleRetry}
                className="w-full flex items-center justify-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                <Video size={16} />
                <span>Try Again</span>
              </button>
              
              <button
                onClick={onClose}
                className="w-full px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        )}

        {/* Info Section */}
        {step === 'setup' && (
          <div className="mt-6 bg-gray-50 border border-gray-200 rounded-lg p-4 animate-fadeInUp" style={{ animationDelay: '0.2s' }}>
            <h4 className="font-medium text-gray-800 mb-2">About AI Video Calls</h4>
            <ul className="text-sm text-gray-600 space-y-1">
              <li>• Real-time video conversation with AI assistant</li>
              <li>• Powered by Tavus technology for natural interactions</li>
              <li>• Camera and microphone access required</li>
              <li>• Conversations are personalized based on your context</li>
              <li>• Works best in Chrome, Firefox, or Safari browsers</li>
            </ul>
          </div>
        )}
      </div>
    </div>
  );
};