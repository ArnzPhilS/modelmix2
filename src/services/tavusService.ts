import { globalApiService } from './globalApiService';
import { UserTier } from '../types';

interface TavusConversationRequest {
  replica_id: string;
  conversation_name?: string;
  conversation_context?: string;
  callback_url?: string;
}

interface TavusConversationResponse {
  conversation_id: string;
  conversation_url: string;
  status: string;
}

class TavusService {
  private readonly REPLICA_ID = 'r79e1c033f';
  private readonly API_BASE_URL = 'https://tavusapi.com/v2';

  async createConversation(
    conversationName: string,
    conversationContext: string,
    userTier: UserTier = 'tier1'
  ): Promise<TavusConversationResponse> {
    // Get API key (personal or global)
    const apiKey = await this.getApiKey(userTier);
    
    if (!apiKey) {
      throw new Error('Tavus API key not available. Please configure it in settings or contact support for global key access.');
    }

    // Try different request formats based on Tavus API documentation
    const requestBody = {
      replica_id: this.REPLICA_ID,
      conversation_name: conversationName,
      conversation_context: conversationContext
    };

    console.log('Tavus API Request:', {
      url: `${this.API_BASE_URL}/conversations`,
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey ? 'present' : 'missing'
      },
      body: requestBody,
      replicaId: this.REPLICA_ID
    });

    try {
      const response = await fetch(`${this.API_BASE_URL}/conversations`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': apiKey
        },
        body: JSON.stringify(requestBody)
      });

      console.log('Tavus API Response Status:', response.status);

      if (!response.ok) {
        let errorData;
        try {
          errorData = await response.json();
          console.log('Tavus API Error Response:', errorData);
        } catch (parseError) {
          console.log('Failed to parse error response:', parseError);
          errorData = { message: `HTTP ${response.status}: ${response.statusText}` };
        }
        
        // Provide more specific error messages
        if (response.status === 400) {
          // Check if it's a replica ID issue
          if (errorData.message && errorData.message.includes('replica')) {
            throw new Error(`Invalid replica ID: The replica '${this.REPLICA_ID}' may not exist or be accessible with your API key.`);
          }
          throw new Error(`Invalid request: ${errorData.message || 'Please check your conversation details and try again.'}`);
        } else if (response.status === 401) {
          throw new Error('Invalid API key. Please check your Tavus API key configuration.');
        } else if (response.status === 403) {
          throw new Error('Access forbidden. Please check your Tavus API key permissions.');
        } else if (response.status === 404) {
          throw new Error('Replica not found. Please contact support.');
        } else {
          throw new Error(errorData.message || `Tavus API error: ${response.status}`);
        }
      }

      const data = await response.json();
      console.log('Tavus API Success Response:', data);
      
      // Increment global usage if using global key
      const isGlobalKey = await this.isUsingGlobalKey(userTier);
      if (isGlobalKey) {
        await globalApiService.incrementGlobalUsage('tavus');
      }

      return data;
    } catch (error) {
      console.error('Tavus API error:', error);
      
      // Re-throw with more user-friendly message if it's a network error
      if (error instanceof TypeError && error.message.includes('fetch')) {
        throw new Error('Network error: Unable to connect to Tavus API. Please check your internet connection.');
      }
      
      throw error;
    }
  }

  // Alternative method to test the replica ID first
  async testReplicaAccess(userTier: UserTier = 'tier1'): Promise<boolean> {
    const apiKey = await this.getApiKey(userTier);
    
    if (!apiKey) {
      return false;
    }

    try {
      // Test if we can access the replica
      const response = await fetch(`${this.API_BASE_URL}/replicas/${this.REPLICA_ID}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': apiKey
        }
      });

      console.log('Replica access test:', response.status);
      return response.ok;
    } catch (error) {
      console.error('Replica access test failed:', error);
      return false;
    }
  }

  async getConversationStatus(conversationId: string, userTier: UserTier = 'tier1'): Promise<any> {
    const apiKey = await this.getApiKey(userTier);
    
    if (!apiKey) {
      throw new Error('Tavus API key not available.');
    }

    try {
      const response = await fetch(`${this.API_BASE_URL}/conversations/${conversationId}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': apiKey
        }
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || `Tavus API error: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Tavus status check error:', error);
      throw error;
    }
  }

  private async getApiKey(userTier: UserTier): Promise<string | null> {
    // For now, we'll primarily use global keys since personal Tavus keys are less common
    // In a real implementation, you'd check for personal keys first
    
    try {
      const globalKey = await globalApiService.getGlobalApiKey('tavus', userTier);
      console.log('Tavus global key check:', { hasKey: !!globalKey, userTier });
      return globalKey;
    } catch (error) {
      console.error('Error accessing Tavus API key:', error);
      return null;
    }
  }

  private async isUsingGlobalKey(userTier: UserTier): Promise<boolean> {
    // For now, assume we're always using global keys for Tavus
    // In a real implementation, you'd check if user has personal key first
    return true;
  }

  // Helper method to validate conversation inputs
  validateConversationInputs(name: string, context: string): { isValid: boolean; error?: string } {
    if (!name || name.trim().length === 0) {
      return { isValid: false, error: 'Conversation name is required' };
    }

    if (!context || context.trim().length === 0) {
      return { isValid: false, error: 'Conversation context is required' };
    }

    if (name.length > 100) {
      return { isValid: false, error: 'Conversation name must be 100 characters or less' };
    }

    if (context.length > 1000) {
      return { isValid: false, error: 'Conversation context must be 1000 characters or less' };
    }

    return { isValid: true };
  }

  // Get replica information
  getReplicaInfo() {
    return {
      id: this.REPLICA_ID,
      name: 'ModelMix AI Assistant',
      description: 'AI video conversation assistant for ModelMix platform'
    };
  }

  // Test API key validity
  async testApiKey(apiKey: string): Promise<boolean> {
    try {
      const response = await fetch(`${this.API_BASE_URL}/replicas`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': apiKey
        }
      });

      return response.ok;
    } catch (error) {
      console.error('Tavus API key test failed:', error);
      return false;
    }
  }
}

export const tavusService = new TavusService();