# USDC DEPO

Automated USDC faucet tool for executing multiple transactions in one click.

## Features
- **One-Click Execution**: Send 10 USDC faucet transactions sequentially.
- **Real-Time Logs**: Watch transaction hashes appear as they are confirmed on-chain.
- **Balance Tracking**: Native USDC balance monitoring for the connected wallet.
- **Bold UI**: High-impact "Bold Typography" design theme.

## Setup Instructions

1. **Environment Variables**:
   You must set the following secrets in your hosting environment (e.g., AI Studio Secrets or Vercel Env):
   - `RPC_URL`: Your Ethereum Sepolia RPC provider (e.g., Alchemy/Infura).
   - `FAUCET_PRIVATE_KEY`: The private key of the account holding/sending testnet USDC.
   - `USDC_CONTRACT_ADDRESS`: The address of the USDC contract (default is Sepolia: `0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238`).
   - `VITE_USDC_CONTRACT_ADDRESS`: Same as above (prefixed for frontend visibility).

2. **Frontend**:
   Built with React + Tailwind CSS + Ethers.js.
   
3. **Backend**:
   Built with Express.js to securely manage the private key and sequential transaction logic.

## Deployment
This app is optimized for Cloud Run (via AI Studio) and can be exported to GitHub for Vercel deployment. Note that the backend requires a Node.js runtime.
