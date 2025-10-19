const express = require('express');
const { exec } = require('child_process');
const app = express();
app.use(express.json());

// Simple endpoint that runs the MCP tool
app.post('/tool/:toolName', async (req, res) => {
  const { toolName } = req.params;
  const { method, params } = req.body;
  
  // Security check
  if (req.headers.authorization !== `Bearer ${process.env.SECRET_TOKEN}`) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  
  try {
    // Run the MCP tool
    exec(`npx -y @zqiren/web-search --method ${method} --params '${JSON.stringify(params)}'`, 
      (error, stdout, stderr) => {
        if (error) {
          return res.status(500).json({ error: error.message });
        }
        res.json({ result: stdout });
      }
    );
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.listen(process.env.PORT || 3000);
