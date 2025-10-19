const express = require('express');
const { spawn } = require('child_process');
const path = require('path');
const app = express();
app.use(express.json());

// Run the local MCP server
app.post('/search', async (req, res) => {
  const { query, limit = 5 } = req.body;
  
  // Security check
  if (req.headers.authorization !== `Bearer ${process.env.SECRET_TOKEN}`) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  
  try {
    // Build the TypeScript if needed
    const { execSync } = require('child_process');
    execSync('npm run build', { stdio: 'ignore' });
    
    // Run the MCP server with the search command
    const mcpProcess = spawn('node', [path.join(__dirname, 'build/index.js')], {
      stdio: ['pipe', 'pipe', 'pipe']
    });
    
    let output = '';
    let errorOutput = '';
    
    // Collect output
    mcpProcess.stdout.on('data', (data) => {
      output += data.toString();
    });
    
    mcpProcess.stderr.on('data', (data) => {
      errorOutput += data.toString();
    });
    
    // Send request to MCP server via stdin
    const request = {
      jsonrpc: '2.0',
      method: 'tools/call',
      params: {
        name: 'search',
        arguments: { query, limit }
      },
      id: 1
    };
    
    mcpProcess.stdin.write(JSON.stringify(request) + '\n');
    
    // Wait for response
    setTimeout(() => {
      mcpProcess.kill();
      
      try {
        // Parse the MCP response
        const lines = output.split('\n');
        for (const line of lines) {
          if (line.includes('"result"')) {
            const response = JSON.parse(line);
            return res.json({ results: response.result });
          }
        }
        
        // If no result found in output, return error output for debugging
        res.json({ results: [], debug: errorOutput });
      } catch (e) {
        res.status(500).json({ error: 'Failed to parse MCP response', output, errorOutput });
      }
    }, 5000); // 5 second timeout
    
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Health check
app.get('/', (req, res) => {
  res.json({ status: 'Web Search MCP Bridge is running' });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});