import React, { useState, useEffect, useCallback } from 'react';
import { ethers } from 'ethers';

declare global {
  interface Window {
    ethereum?: any;
  }
}

import { motion, AnimatePresence } from 'motion/react';
import { Wallet, RefreshCw, CheckCircle2, XCircle, Loader2, ExternalLink, ArrowRight, MousePointerClick, Activity } from 'lucide-react';
import { getUSDCBalance, shortenAddress } from './lib/web3';

interface Transaction {
  hash?: string;
  status: 'pending' | 'success' | 'failed';
  error?: string;
}

interface JobStatus {
  status: 'pending' | 'processing' | 'completed' | 'failed';
  transactions: Transaction[];
  total: number;
  current: number;
  error?: string;
}

export default function App() {
  const [account, setAccount] = useState<string | null>(null);
  const [balance, setBalance] = useState<string | null>(null);
  const [isConnecting, setIsConnecting] = useState(false);
  const [jobId, setJobId] = useState<string | null>(null);
  const [jobStatus, setJobStatus] = useState<JobStatus | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const connectWallet = async () => {
    if (typeof window.ethereum === 'undefined') {
      alert('Please install MetaMask to use this app');
      return;
    }
    setIsConnecting(true);
    try {
      const provider = new ethers.BrowserProvider(window.ethereum);
      const accounts = await provider.send('eth_requestAccounts', []);
      setAccount(accounts[0]);
    } catch (err) {
      console.error('Connection error:', err);
    } finally {
      setIsConnecting(false);
    }
  };

  const fetchBalance = useCallback(async () => {
    if (!account) return;
    try {
      const provider = new ethers.BrowserProvider(window.ethereum);
      const bal = await getUSDCBalance(account, provider);
      setBalance(bal);
    } catch (err) {
      console.error('Balance error:', err);
    }
  }, [account]);

  useEffect(() => {
    if (account) {
      fetchBalance();
      const interval = setInterval(fetchBalance, 10000); // Pulse balance every 10s
      return () => clearInterval(interval);
    }
  }, [account, fetchBalance]);

  const handleRunFaucet = async () => {
    if (!account) return;
    setJobId(null);
    setJobStatus(null);
    
    try {
      const response = await fetch('/api/faucet', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ walletAddress: account })
      });
      const data = await response.json();
      if (data.jobId) {
        setJobId(data.jobId);
      } else {
        alert(data.error || 'Failed to start faucet');
      }
    } catch (err) {
      console.error('Faucet error:', err);
      alert('Failed to connect to backend');
    }
  };

  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (jobId && (!jobStatus || (jobStatus.status !== 'completed' && jobStatus.status !== 'failed'))) {
      interval = setInterval(async () => {
        try {
          const response = await fetch(`/api/faucet/status/${jobId}`);
          const data = await response.json();
          setJobStatus(data);
          if (data.status === 'completed' || data.status === 'failed') {
            clearInterval(interval);
            fetchBalance(); // Refresh balance when done
          }
        } catch (err) {
          console.error('Polling error:', err);
        }
      }, 2000);
    }
    return () => clearInterval(interval);
  }, [jobId, jobStatus, fetchBalance]);

  return (
    <div className="min-h-screen flex flex-col p-4 md:p-8 max-w-[1400px] mx-auto overflow-hidden">
      {/* Header */}
      <nav className="flex items-center justify-between mb-8">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 bg-usdc rounded-full flex items-center justify-center font-bold text-xl text-white shadow-[0_0_20px_rgba(39,117,202,0.3)]">
            $
          </div>
          <span className="text-2xl font-black tracking-tighter">USDC DEPO</span>
        </div>
        
        <div className="flex items-center space-x-4">
          <div className="hidden md:flex px-4 py-2 border-accent bg-surface rounded-full items-center space-x-2 text-sm font-medium">
            <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
            <span className="text-zinc-400 font-bold tracking-tight">Sepolia Testnet</span>
          </div>
          
          <button 
            onClick={account ? undefined : connectWallet}
            className={`px-6 py-2 rounded-full font-bold text-sm transition-all duration-300 flex items-center gap-2 ${
              account 
              ? 'bg-zinc-900 text-zinc-400 border border-white/5 cursor-default' 
              : 'bg-white text-black hover:scale-105 active:scale-95 shadow-lg'
            }`}
          >
            {isConnecting && <Loader2 className="w-3 h-3 animate-spin" />}
            {account ? shortenAddress(account) : 'Connect Wallet'}
          </button>
        </div>
      </nav>

      <main className="flex-1 grid grid-cols-1 md:grid-cols-12 gap-6 min-h-0">
        {/* Left Column */}
        <div className="col-span-1 md:col-span-7 flex flex-col space-y-6 min-h-0">
          {/* Balance Section */}
          <div className="bg-surface border-accent rounded-3xl p-10 flex-1 relative overflow-hidden flex flex-col justify-center min-h-[250px]">
            <div className="relative z-10">
              <div className="flex justify-between items-start">
                <span className="text-xs uppercase tracking-[0.2em] text-zinc-500 font-black">Current Balance</span>
                <button 
                  onClick={() => { setIsRefreshing(true); fetchBalance().finally(() => setIsRefreshing(false)); }}
                  className="text-white/10 hover:text-white transition-colors p-2"
                >
                  <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`} />
                </button>
              </div>
              <div className="flex items-baseline gap-4 mt-2">
                <span className="text-5xl md:text-8xl font-black tracking-tighter">
                  {balance === null ? '---' : balance}
                </span>
                <span className="text-xl md:text-3xl font-black text-zinc-500 uppercase tracking-tighter">USDC</span>
              </div>
            </div>
            <div className="absolute -right-16 -bottom-16 w-64 h-64 bg-usdc opacity-5 rounded-full blur-[100px] pointer-events-none"></div>
            <div className="absolute top-0 left-0 w-full h-1 bg-linear-to-r from-transparent via-usdc/20 to-transparent"></div>
          </div>

          {/* Action Section */}
          <div className="bg-surface border-accent rounded-3xl p-10 space-y-8">
            <div className="flex justify-between items-end">
              <h2 className="text-3xl md:text-5xl font-black leading-none tracking-tighter">
                BATCH<br/>PROCESSOR
              </h2>
              <div className="text-right">
                <span className="text-[10px] font-black text-zinc-600 uppercase tracking-widest block mb-1">Queue Status</span>
                <span className="text-xl md:text-2xl font-mono text-usdc font-black">
                  {jobStatus ? Math.round((jobStatus.current / jobStatus.total) * 100) : 0}% COMPLETE
                </span>
              </div>
            </div>

            <div className="w-full h-4 bg-zinc-900 rounded-full overflow-hidden border border-white/5">
              <motion.div 
                className="h-full bg-usdc shadow-[0_0_20px_rgba(39,117,202,0.6)]"
                initial={{ width: 0 }}
                animate={{ width: jobStatus ? `${(jobStatus.current / jobStatus.total) * 100}%` : 0 }}
                transition={{ type: "spring", bounce: 0, duration: 0.8 }}
              />
            </div>

            <button 
              disabled={!account || (jobId && jobStatus?.status === 'processing')}
              onClick={handleRunFaucet}
              className={`w-full py-6 btn-gradient rounded-2xl text-xl font-black uppercase tracking-widest disabled:opacity-20 disabled:cursor-not-allowed group relative overflow-hidden`}
            >
              <span className="relative z-10 flex items-center justify-center gap-3">
                {jobStatus?.status === 'processing' ? (
                  <>
                    <Loader2 className="w-6 h-6 animate-spin" />
                    <span>Processing...</span>
                  </>
                ) : (
                  <>
                    <ArrowRight className="w-6 h-6 group-hover:translate-x-2 transition-transform" />
                    <span>Run 10 Faucet Transactions</span>
                  </>
                )}
              </span>
            </button>
          </div>
        </div>

        {/* Right Column: Logs */}
        <div className="col-span-1 md:col-span-5 bg-surface border-accent rounded-3xl p-8 flex flex-col min-h-[500px]">
          <div className="flex items-center justify-between mb-8">
            <h3 className="text-xs font-black uppercase tracking-[0.2em] text-zinc-500">Transaction Log</h3>
            <div className="flex items-center gap-2 px-3 py-1 bg-zinc-900 rounded-full">
              <div className="w-1 h-1 rounded-full bg-usdc animate-pulse"></div>
              <span className="text-[8px] font-black tracking-widest text-zinc-400 uppercase">Live Feed</span>
            </div>
          </div>

          <div className="flex-1 space-y-3 overflow-y-auto pr-2 custom-scrollbar min-h-0">
            {!jobStatus ? (
              <div className="h-full flex flex-col items-center justify-center text-center p-10 opacity-10">
                <Activity className="w-12 h-12 mb-4" />
                <span className="text-[10px] font-black uppercase tracking-widest">Idle System Stance</span>
              </div>
            ) : (
              <AnimatePresence mode="popLayout">
                {jobStatus.transactions.map((tx, idx) => (
                  <motion.div
                    key={idx}
                    layout
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className={`p-4 border-accent bg-zinc-900/50 rounded-xl flex items-center justify-between transition-all ${
                      tx.status === 'pending' ? 'ring-1 ring-usdc shadow-[0_0_15px_rgba(39,117,202,0.1)]' : 'opacity-60'
                    }`}
                  >
                    <div className="flex items-center space-x-3">
                      <div className={`w-2 h-2 rounded-full ${
                        tx.status === 'success' ? 'bg-green-500' : 
                        tx.status === 'failed' ? 'bg-red-500' : 'bg-usdc animate-pulse'
                      }`} />
                      <div className="flex flex-col">
                        <span className="font-mono text-xs text-white/90">
                          {tx.hash ? `${tx.hash.slice(0, 6)}...${tx.hash.slice(-4)}` : 'Waiting for ID...'}
                        </span>
                        <span className="text-[8px] font-black uppercase text-zinc-500">TX {String(idx + 1).padStart(2, '0')}</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className={`text-[10px] font-black ${
                        tx.status === 'success' ? 'text-green-500' : 
                        tx.status === 'failed' ? 'text-red-500' : 'text-usdc'
                      }`}>
                        {tx.status.toUpperCase()}
                      </span>
                      {tx.hash && (
                        <a 
                          href={`https://sepolia.etherscan.io/tx/${tx.hash}`}
                          target="_blank"
                          rel="noreferrer"
                          className="p-1.5 bg-white/5 rounded-lg hover:bg-white/10 transition-colors"
                        >
                          <ExternalLink className="w-3 h-3 text-zinc-400" />
                        </a>
                      )}
                    </div>
                  </motion.div>
                ))}
              </AnimatePresence>
            )}
          </div>
          
          {jobStatus?.status === 'failed' && (
            <div className="mt-4 p-4 bg-red-500/10 border border-red-500/20 rounded-xl">
              <span className="text-[10px] font-black text-red-500 uppercase tracking-widest block mb-1">Execution Blocked</span>
              <p className="text-xs text-red-500/80 leading-relaxed">{jobStatus.error}</p>
            </div>
          )}
        </div>
      </main>

      {/* Footer */}
      <footer className="mt-8 flex flex-col md:flex-row items-center justify-between py-6 border-t border-white/5 gap-4">
        <div className="flex space-x-6 text-[8px] md:text-[10px] font-black text-zinc-600 uppercase tracking-widest">
          <span>Gas Optimization: SEPOLIA_V1</span>
          <span className="hidden md:inline">Protocol: USDC_ERC20</span>
          <span>System: 99.9% Uptime</span>
        </div>
        <div className="text-[10px] font-black text-zinc-500 tracking-tighter flex items-center gap-2">
          <div className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse"></div>
          USDC DEPO V1.0.4 &copy; 2024 AUTOMATED FAUCET SYSTEM
        </div>
      </footer>

      <style>{`
        .custom-scrollbar::-webkit-scrollbar {
          width: 4px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: transparent;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: rgba(255, 255, 255, 0.05);
          border-radius: 10px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: rgba(255, 255, 255, 0.1);
        }
      `}</style>
    </div>
  );
}
