import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import cors from "cors";
import dotenv from "dotenv";
import { ethers } from "ethers";

dotenv.config();

const app = express();
const PORT = 3000;

app.use(cors());
app.use(express.json());

// In-memory job storage for simple polling
const jobs: Record<string, {
  status: 'pending' | 'processing' | 'completed' | 'failed',
  transactions: { hash?: string, status: 'pending' | 'success' | 'failed', error?: string }[],
  total: number,
  current: number,
  error?: string
}> = {};

app.get("/api/health", (req, res) => {
  res.json({ status: "ok" });
});

app.post("/api/faucet", async (req, res) => {
  const { walletAddress } = req.body;

  if (!walletAddress || !ethers.isAddress(walletAddress)) {
    return res.status(400).json({ error: "Invalid wallet address" });
  }

  const jobId = Math.random().toString(36).substring(7);
  jobs[jobId] = {
    status: 'processing',
    transactions: [],
    total: 10,
    current: 0
  };

  // Start the background process
  runFaucetTransactions(jobId, walletAddress);

  res.json({ jobId });
});

app.get("/api/faucet/status/:jobId", (req, res) => {
  const job = jobs[req.params.jobId];
  if (!job) {
    return res.status(404).json({ error: "Job not found" });
  }
  res.json(job);
});

async function runFaucetTransactions(jobId: string, recipient: string) {
  const job = jobs[jobId];
  const rpcUrl = process.env.RPC_URL;
  const privateKey = process.env.FAUCET_PRIVATE_KEY;
  const contractAddress = process.env.USDC_CONTRACT_ADDRESS;

  if (!rpcUrl || !privateKey || !contractAddress) {
    job.status = 'failed';
    job.error = "Server configuration missing (RPC_URL, FAUCET_PRIVATE_KEY, or USDC_CONTRACT_ADDRESS)";
    return;
  }

  try {
    const provider = new ethers.JsonRpcProvider(rpcUrl);
    const wallet = new ethers.Wallet(privateKey, provider);
    
    // ABI for faucet or transfer. Defaulting to a common faucet signature
    // but also fallback to standard ERC20 transfer if preferred by user.
    // We'll try to call 'faucet(address)' first.
    const abi = [
      "function faucet(address to) public",
      "function transfer(address to, uint256 amount) public returns (bool)"
    ];
    const contract = new ethers.Contract(contractAddress, abi, wallet);

    for (let i = 0; i < 10; i++) {
      try {
        job.transactions.push({ status: 'pending' });
        
        let tx;
        try {
          // Attempt faucet call
          tx = await contract.faucet(recipient);
        } catch (e) {
          // Fallback to transfer if faucet doesn't exist (assuming 1 USDC = 10^6 decimals usually)
          const amount = ethers.parseUnits(process.env.FAUCET_AMOUNT || "100", 6);
          tx = await contract.transfer(recipient, amount);
        }

        job.transactions[i].hash = tx.hash;
        await tx.wait();
        job.transactions[i].status = 'success';

        // Brief delay between transactions to avoid nonce issues or rate limits
        if (i < 9) await new Promise(resolve => setTimeout(resolve, 1000));
      } catch (error: any) {
        console.error(`Transaction ${i} failed:`, error);
        job.transactions[i].status = 'failed';
        job.transactions[i].error = error.message;
        // Depending on requirements, we might continue or stop. 
        // Let's continue for other transactions.
      }
      job.current = i + 1;
    }

    job.status = 'completed';
  } catch (error: any) {
    console.error("Main faucet loop error:", error);
    job.status = 'failed';
    job.error = error.message;
  }
}

async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
