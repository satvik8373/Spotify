import React, { useState, useEffect } from 'react';
import { Box, Typography, Button, Paper, List, ListItem, ListItemText, Divider, Alert, CircularProgress } from '@mui/material';
import { testApiConnection, testDatabaseConnection, getApiRoutes } from '../../utils/api-test';

const ApiDebugPage = () => {
  const [apiStatus, setApiStatus] = useState(null);
  const [dbStatus, setDbStatus] = useState(null);
  const [routes, setRoutes] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Environment info
  const apiUrl = import.meta.env?.VITE_API_URL || 'Not set';
  
  // Log environment info
  console.log('Debug page loaded with environment info:');
  console.log('API URL:', apiUrl);
  console.log('Environment:', import.meta.env?.MODE || 'Not set');

  const runAllTests = async () => {
    setLoading(true);
    setError(null);
    
    try {
      console.log('Starting API connection tests...');
      // Test API connection
      const apiResult = await testApiConnection();
      setApiStatus(apiResult);
      console.log('API test complete:', apiResult);
      
      // If API is connected, test database connection
      if (apiResult.success) {
        console.log('Testing database connection...');
        const dbResult = await testDatabaseConnection();
        setDbStatus(dbResult);
        console.log('Database test complete:', dbResult);
        
        // If database is connected, get routes
        if (dbResult.success) {
          console.log('Getting API routes...');
          const routesResult = await getApiRoutes();
          setRoutes(routesResult.routes || []);
          console.log('Routes retrieval complete:', routesResult);
        }
      }
    } catch (err) {
      console.error('Error running tests:', err);
      setError(err.message || 'An error occurred while running tests');
    } finally {
      setLoading(false);
      console.log('All tests completed.');
    }
  };

  useEffect(() => {
    runAllTests();
  }, []);

  return (
    <Box sx={{ maxWidth: 800, margin: '0 auto', p: 3 }}>
      <Typography variant="h4" sx={{ mb: 3 }}>API Connection Debug</Typography>
      
      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}
      
      <Paper sx={{ p: 2, mb: 3 }}>
        <Typography variant="h6">Environment Information</Typography>
        <List>
          <ListItem>
            <ListItemText primary="API URL" secondary={apiUrl} />
          </ListItem>
          <ListItem>
            <ListItemText 
              primary="Environment" 
              secondary={import.meta.env?.MODE || 'development'} 
            />
          </ListItem>
        </List>
      </Paper>
      
      <Paper sx={{ p: 2, mb: 3 }}>
        <Typography variant="h6">API Connection Status</Typography>
        {loading && !apiStatus ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', p: 2 }}>
            <CircularProgress />
          </Box>
        ) : (
          <>
            {apiStatus && (
              <Box sx={{ mt: 2 }}>
                <Alert 
                  severity={apiStatus.success ? "success" : "error"}
                  sx={{ mb: 2 }}
                >
                  {apiStatus.success 
                    ? `Connected to API (Status: ${apiStatus.statusCode})` 
                    : `Failed to connect to API: ${apiStatus.error}`}
                </Alert>
                
                {apiStatus.success && apiStatus.data && (
                  <List dense>
                    <ListItem>
                      <ListItemText 
                        primary="Environment" 
                        secondary={apiStatus.data.environment || 'Not reported'} 
                      />
                    </ListItem>
                    <ListItem>
                      <ListItemText 
                        primary="Running on Vercel" 
                        secondary={apiStatus.data.vercel || 'No'} 
                      />
                    </ListItem>
                    <ListItem>
                      <ListItemText 
                        primary="Timestamp" 
                        secondary={apiStatus.data.timestamp || 'Not reported'} 
                      />
                    </ListItem>
                  </List>
                )}
              </Box>
            )}
          </>
        )}
      </Paper>
      
      <Paper sx={{ p: 2, mb: 3 }}>
        <Typography variant="h6">Database Connection Status</Typography>
        {loading && !dbStatus ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', p: 2 }}>
            <CircularProgress />
          </Box>
        ) : (
          <>
            {dbStatus ? (
              <Box sx={{ mt: 2 }}>
                <Alert 
                  severity={dbStatus.success && dbStatus.isConnected ? "success" : "error"}
                  sx={{ mb: 2 }}
                >
                  {dbStatus.success 
                    ? (dbStatus.isConnected 
                        ? "Connected to database" 
                        : "API is working but database is disconnected")
                    : `Failed to check database status: ${dbStatus.error}`}
                </Alert>
                
                {dbStatus.success && dbStatus.data && (
                  <pre>{JSON.stringify(dbStatus.data, null, 2)}</pre>
                )}
              </Box>
            ) : (
              <Alert severity="info">Database status not checked yet</Alert>
            )}
          </>
        )}
      </Paper>
      
      <Paper sx={{ p: 2, mb: 3 }}>
        <Typography variant="h6">Available API Routes</Typography>
        {routes.length > 0 ? (
          <List dense>
            {routes.map((route, index) => (
              <React.Fragment key={index}>
                <ListItem>
                  <ListItemText primary={route} />
                </ListItem>
                {index < routes.length - 1 && <Divider />}
              </React.Fragment>
            ))}
          </List>
        ) : (
          <Alert severity="info">No routes available or not fetched yet</Alert>
        )}
      </Paper>
      
      <Button 
        variant="contained" 
        color="primary" 
        onClick={runAllTests}
        disabled={loading}
        sx={{ mr: 2 }}
      >
        {loading ? 'Running Tests...' : 'Run Tests Again'}
      </Button>
      
      <Button 
        variant="outlined" 
        color="secondary" 
        onClick={() => window.open('https://mavrixfy.site', '_blank')}
        sx={{ mr: 2 }}
      >
        Go to Frontend
      </Button>
      
      <Button 
        variant="outlined" 
        color="primary" 
        onClick={() => window.open(apiUrl, '_blank')}
      >
        Go to Backend
      </Button>
    </Box>
  );
};

export default ApiDebugPage; 