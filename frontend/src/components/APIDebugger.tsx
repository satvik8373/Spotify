import { useState } from 'react';
import { Button } from '@/components/ui/button';
import axiosInstance from '@/lib/axios';
import { toast } from 'sonner';
import axios from 'axios';

const APIDebugger = () => {
  const [results, setResults] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  const testConnection = async () => {
    setLoading(true);
    try {
      // Test with configured axiosInstance
      const response = await axiosInstance.get('/test/health');
      console.log('API Health Response:', response.data);
      
      // Also test direct connection to the API
      const directApiUrl = import.meta.env.VITE_API_URL || 'https://spotify-api-drab.vercel.app/api';
      const directResponse = await axios.get(`${directApiUrl}/test/health`);
      
      setResults({
        axiosInstance: response.data,
        directConnection: directResponse.data,
        timestamp: new Date().toISOString()
      });
      
      toast.success('API Connection Successful');
    } catch (error: any) {
      console.error('API Connection Test Error:', error);
      setResults({
        error: true,
        message: error.message,
        response: error.response?.data,
        timestamp: new Date().toISOString()
      });
      toast.error('API Connection Failed');
    } finally {
      setLoading(false);
    }
  };

  const testPlaylistsConnection = async () => {
    setLoading(true);
    try {
      // Test playlists endpoint
      const response = await axiosInstance.get('/test/playlists-debug');
      console.log('Playlists Debug Response:', response.data);
      
      // Try to get all playlists
      const playlistsResponse = await axiosInstance.get('/playlists');
      
      setResults({
        playlistsDebug: response.data,
        playlistsData: playlistsResponse.data,
        count: playlistsResponse.data.length,
        timestamp: new Date().toISOString()
      });
      
      toast.success('Playlists API Connection Successful');
    } catch (error: any) {
      console.error('Playlists Connection Test Error:', error);
      setResults({
        error: true,
        message: error.message,
        response: error.response?.data,
        timestamp: new Date().toISOString()
      });
      toast.error('Playlists API Connection Failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-4 p-4 border rounded-lg bg-card">
      <h2 className="text-xl font-semibold">API Connection Debugger</h2>
      <div className="flex gap-2">
        <Button onClick={testConnection} disabled={loading}>
          {loading ? 'Testing...' : 'Test API Connection'}
        </Button>
        <Button onClick={testPlaylistsConnection} disabled={loading} variant="outline">
          {loading ? 'Testing...' : 'Test Playlists API'}
        </Button>
      </div>

      {results && (
        <div className="mt-4">
          <h3 className="font-medium mb-2">Results:</h3>
          <pre className="bg-black p-3 rounded overflow-auto max-h-60 text-xs text-white">
            {JSON.stringify(results, null, 2)}
          </pre>
        </div>
      )}
      
      <div className="text-sm text-muted-foreground">
        <p>Current API URL: {axiosInstance.defaults.baseURL}</p>
        <p>Environment: {import.meta.env.MODE}</p>
        <p>VITE_API_URL: {import.meta.env.VITE_API_URL || 'Not set'}</p>
      </div>
    </div>
  );
};

export default APIDebugger;
