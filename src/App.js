import React, { useState, useEffect } from 'react';
import { Wallet, ChevronDown, CheckCircle, XCircle, Loader2, AlertTriangle } from 'lucide-react';

function App() {
  const [selectedChain, setSelectedChain] = useState('ethereum');
  const [isWalletConnected, setIsWalletConnected] = useState(false);
  const [showWalletModal, setShowWalletModal] = useState(false);
  const [approvals, setApprovals] = useState([]);
  const [walletAddress, setWalletAddress] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  // Fetch real token approvals from blockchain
  const fetchApprovals = async (address, chainId) => {
    setIsLoading(true);
    setError('');
    
    try {
      // Using Etherscan API to get token transfers and approvals
      const apiKeys = {
        ethereum: 'YourEtherscanAPIKey',
        base: 'YourBasescanAPIKey',
        arbitrum: 'YourArbiscanAPIKey'
      };
      
      const apiUrls = {
        ethereum: 'https://api.etherscan.io/api',
        base: 'https://api.basescan.org/api',
        arbitrum: 'https://api.arbiscan.io/api'
      };
      
      // For demo purposes, we'll use mock data that simulates real approvals
      // In production, you'd call the actual APIs
      const mockApprovals = [
        {
          id: 1,
          name: 'USDC',
          symbol: 'USDC',
          contract: '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48',
          spender: '0x1111111254EEB25477B68fb85Ed929f73A960582', // 1inch
          amount: 'Unlimited',
          type: 'ERC20',
          lastUsed: '2024-07-10',
          riskLevel: 'high'
        },
        {
          id: 2,
          name: 'Bored Ape Yacht Club',
          symbol: 'BAYC',
          contract: '0xBC4CA0EdA7647A8aB7C2061c2E118A18a93fE367',
          spender: '0x00000000000001ad428e4906aE43D8F9852d0dD6', // Seaport
          amount: 'All NFTs',
          type: 'ERC721',
          lastUsed: '2024-07-08',
          riskLevel: 'medium'
        },
        {
          id: 3,
          name: 'Wrapped Ethereum',
          symbol: 'WETH',
          contract: '0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2',
          spender: '0x68b3465833fb72A70ecDF485E0e4C7bD8665Fc45', // Uniswap V3
          amount: '50.5 WETH',
          type: 'ERC20',
          lastUsed: '2024-07-09',
          riskLevel: 'low'
        }
      ];
      
      // Filter by selected chain
      const chainApprovals = chainId === 'ethereum' ? mockApprovals : 
                           chainId === 'base' ? mockApprovals.slice(0, 1) :
                           chainId === 'arbitrum' ? mockApprovals.slice(1, 2) : [];
      
      setApprovals(chainApprovals);
    } catch (err) {
      setError('Failed to fetch approvals. Please try again.');
      console.error('Error fetching approvals:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (isWalletConnected && walletAddress) {
      fetchApprovals(walletAddress, selectedChain);
    } else {
      setApprovals([]);
    }
  }, [isWalletConnected, walletAddress, selectedChain]);

  const handleConnectWallet = () => {
    setShowWalletModal(true);
  };

  const handleDisconnectWallet = () => {
    setIsWalletConnected(false);
    setShowWalletModal(false);
    setWalletAddress('');
    setApprovals([]);
    setError('');
  };

  const handleSelectWallet = async (walletType) => {
    console.log(`Connecting to ${walletType}...`);
    setError('');
    
    try {
      if (walletType === 'Farcaster') {
        console.log('Connecting to Farcaster wallet...');
        const mockAddress = '0x742d35Cc85E9dc30C91C2000000000000000000';
        setWalletAddress(mockAddress);
        setIsWalletConnected(true);
        setShowWalletModal(false);
        
      } else if (walletType === 'MetaMask') {
        if (typeof window !== 'undefined' && window.ethereum) {
          const accounts = await window.ethereum.request({ 
            method: 'eth_requestAccounts' 
          });
          setWalletAddress(accounts[0]);
          setIsWalletConnected(true);
          setShowWalletModal(false);
        } else {
          setError('MetaMask not found! Please install MetaMask.');
        }
      } else if (walletType === 'WalletConnect') {
        console.log('Connecting to WalletConnect...');
        const mockAddress = '0x742d35Cc85E9dc30C91C2000000000000000001';
        setWalletAddress(mockAddress);
        setIsWalletConnected(true);
        setShowWalletModal(false);
      } else {
        const mockAddress = '0x742d35Cc85E9dc30C91C2000000000000000002';
        setWalletAddress(mockAddress);
        setIsWalletConnected(true);
        setShowWalletModal(false);
      }
    } catch (error) {
      console.error('Wallet connection failed:', error);
      setError('Failed to connect wallet. Please try again.');
    }
  };

  const handleRevokeApproval = async (id) => {
    try {
      setIsLoading(true);
      // In production, this would call the revoke function on the smart contract
      console.log(`Revoking approval for ID: ${id}`);
      
      // Simulate transaction
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // Remove from UI
      setApprovals(approvals.filter(approval => approval.id !== id));
      
    } catch (error) {
      setError('Failed to revoke approval. Please try again.');
      console.error('Revoke failed:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const chains = [
    { name: 'Ethereum', value: 'ethereum', disabled: false },
    { name: 'Base', value: 'base', disabled: false },
    { name: 'Arbitrum', value: 'arbitrum', disabled: false },
    { name: 'Celo', value: 'celo', disabled: false },
    { name: 'Monad (Coming Soon)', value: 'monad', disabled: true },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-900 to-indigo-900 text-white flex flex-col items-center p-4 sm:p-6">
      {/* Header */}
      <header className="w-full max-w-4xl flex flex-col sm:flex-row items-center justify-between py-4 px-6 bg-purple-800 rounded-xl shadow-lg mb-8">
        <h1 className="text-3xl font-bold text-purple-200 mb-4 sm:mb-0">FarGuard</h1>
        <div className="flex flex-col sm:flex-row items-center space-y-4 sm:space-y-0 sm:space-x-4">
          {/* Wallet Address Display */}
          {isWalletConnected && walletAddress && (
            <div className="text-sm text-purple-300 font-mono">
              {walletAddress.substring(0, 6)}...{walletAddress.substring(walletAddress.length - 4)}
            </div>
          )}
          
          {/* Chain Selection Dropdown */}
          <div className="relative w-full sm:w-auto">
            <select
              className="appearance-none bg-purple-700 text-white py-2 px-4 pr-8 rounded-lg shadow-inner focus:outline-none focus:ring-2 focus:ring-purple-400 cursor-pointer w-full"
              value={selectedChain}
              onChange={(e) => setSelectedChain(e.target.value)}
              disabled={isLoading}
            >
              {chains.map((chain) => (
                <option key={chain.value} value={chain.value} disabled={chain.disabled}>
                  {chain.name}
                </option>
              ))}
            </select>
            <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-purple-200">
              <ChevronDown className="h-5 w-5" />
            </div>
          </div>

          {/* Wallet Connection Button */}
          <button
            onClick={isWalletConnected ? handleDisconnectWallet : handleConnectWallet}
            disabled={isLoading}
            className={`flex items-center justify-center px-6 py-2 rounded-lg font-semibold shadow-md transition-all duration-300 ease-in-out
              ${isWalletConnected ? 'bg-red-500 hover:bg-red-600' : 'bg-purple-600 hover:bg-purple-700'}
              ${isLoading ? 'opacity-50 cursor-not-allowed' : 'transform hover:scale-105'}
              focus:outline-none focus:ring-2 focus:ring-purple-400`}
          >
            {isLoading ? (
              <Loader2 className="w-5 h-5 mr-2 animate-spin" />
            ) : (
              <Wallet className="w-5 h-5 mr-2" />
            )}
            {isWalletConnected ? 'Disconnect Wallet' : 'Connect Wallet'}
          </button>
        </div>
      </header>

      {/* Main Content */}
      <main className="w-full max-w-4xl bg-purple-800 rounded-xl shadow-lg p-6">
        {/* Error Message */}
        {error && (
          <div className="mb-6 p-4 bg-red-900 border border-red-700 rounded-lg flex items-center">
            <AlertTriangle className="w-5 h-5 text-red-400 mr-3" />
            <span className="text-red-200">{error}</span>
          </div>
        )}

        {!isWalletConnected ? (
          <div className="flex flex-col items-center justify-center h-64 text-center">
            <p className="text-xl text-purple-300 mb-4">Connect your wallet to manage your token and NFT approvals.</p>
            <button
              onClick={handleConnectWallet}
              className="px-8 py-3 bg-purple-600 text-white rounded-lg font-semibold shadow-md transition-all duration-300 ease-in-out hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-purple-400 transform hover:scale-105"
            >
              Connect Wallet
            </button>
          </div>
        ) : (
          <div>
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold text-purple-200">
                Your Approvals ({chains.find(c => c.value === selectedChain)?.name})
              </h2>
              {isLoading && (
                <div className="flex items-center text-purple-300">
                  <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                  Loading approvals...
                </div>
              )}
            </div>
            
            {!isLoading && approvals.length === 0 ? (
              <div className="text-center text-purple-300 text-lg py-10">
                No active approvals found for {chains.find(c => c.value === selectedChain)?.name}.
              </div>
            ) : (
              <div className="overflow-x-auto rounded-lg shadow-inner">
                <table className="min-w-full bg-purple-700 rounded-lg">
                  <thead className="bg-purple-600">
                    <tr>
                      <th className="py-3 px-4 text-left text-sm font-medium text-purple-100 uppercase tracking-wider rounded-tl-lg">
                        Token/NFT
                      </th>
                      <th className="py-3 px-4 text-left text-sm font-medium text-purple-100 uppercase tracking-wider">
                        Spender
                      </th>
                      <th className="py-3 px-4 text-left text-sm font-medium text-purple-100 uppercase tracking-wider">
                        Amount
                      </th>
                      <th className="py-3 px-4 text-left text-sm font-medium text-purple-100 uppercase tracking-wider">
                        Risk
                      </th>
                      <th className="py-3 px-4 text-center text-sm font-medium text-purple-100 uppercase tracking-wider rounded-tr-lg">
                        Action
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-purple-600">
                    {approvals.map((approval) => (
                      <tr key={approval.id} className="hover:bg-purple-600 transition-colors duration-200">
                        <td className="py-3 px-4 whitespace-nowrap text-purple-200">
                          <div className="flex items-center">
                            {approval.type === 'ERC20' ? (
                              <CheckCircle className="w-4 h-4 mr-2 text-green-400" />
                            ) : (
                              <XCircle className="w-4 h-4 mr-2 text-blue-400" />
                            )}
                            <div>
                              <div className="font-medium">{approval.name}</div>
                              <div className="text-xs text-purple-400">{approval.symbol}</div>
                            </div>
                          </div>
                        </td>
                        <td className="py-3 px-4 whitespace-nowrap text-purple-300 text-sm font-mono">
                          {approval.spender.substring(0, 6)}...{approval.spender.substring(approval.spender.length - 4)}
                        </td>
                        <td className="py-3 px-4 whitespace-nowrap text-purple-200">
                          <div className="font-medium">{approval.amount}</div>
                          <div className="text-xs text-purple-400">Last used: {approval.lastUsed}</div>
                        </td>
                        <td className="py-3 px-4 whitespace-nowrap">
                          <span className={`px-2 py-1 text-xs font-semibold rounded-full ${
                            approval.riskLevel === 'high' ? 'bg-red-900 text-red-200' :
                            approval.riskLevel === 'medium' ? 'bg-yellow-900 text-yellow-200' :
                            'bg-green-900 text-green-200'
                          }`}>
                            {approval.riskLevel.toUpperCase()}
                          </span>
                        </td>
                        <td className="py-3 px-4 whitespace-nowrap text-center">
                          <button
                            onClick={() => handleRevokeApproval(approval.id)}
                            disabled={isLoading}
                            className="bg-red-500 hover:bg-red-600 disabled:opacity-50 disabled:cursor-not-allowed text-white px-4 py-2 rounded-lg font-semibold text-sm shadow-md transition-all duration-300 ease-in-out transform hover:scale-105 focus:outline-none focus:ring-2 focus:ring-red-400"
                          >
                            {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Revoke'}
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </main>

      {/* Wallet Connection Modal */}
      {showWalletModal && (
        <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center p-4 z-50">
          <div className="bg-purple-800 rounded-xl shadow-2xl p-6 w-full max-w-sm transform transition-all duration-300 ease-in-out">
            <h3 className="text-2xl font-bold text-purple-200 mb-6 text-center">Connect Your Wallet</h3>
            <div className="space-y-4">
              {/* Farcaster Wallet - Primary option */}
              <button
                onClick={() => handleSelectWallet('Farcaster')}
                className="w-full flex items-center justify-center py-3 bg-purple-600 hover:bg-purple-500 text-white rounded-lg font-semibold shadow-md transition-all duration-300 ease-in-out transform hover:scale-105 focus:outline-none focus:ring-2 focus:ring-purple-400 border-2 border-purple-400"
              >
                <div className="w-6 h-6 mr-3 rounded-full bg-purple-500 flex items-center justify-center text-xs font-bold text-white">
                  FC
                </div>
                Farcaster Wallet (Recommended)
              </button>
              
              <button
                onClick={() => handleSelectWallet('MetaMask')}
                className="w-full flex items-center justify-center py-3 bg-purple-700 hover:bg-purple-600 text-white rounded-lg font-semibold shadow-md transition-all duration-300 ease-in-out transform hover:scale-105 focus:outline-none focus:ring-2 focus:ring-purple-400"
              >
                <div className="w-6 h-6 mr-3 rounded-full bg-orange-500 flex items-center justify-center text-xs font-bold text-white">
                  MM
                </div>
                MetaMask
              </button>
              <button
                onClick={() => handleSelectWallet('WalletConnect')}
                className="w-full flex items-center justify-center py-3 bg-purple-700 hover:bg-purple-600 text-white rounded-lg font-semibold shadow-md transition-all duration-300 ease-in-out transform hover:scale-105 focus:outline-none focus:ring-2 focus:ring-purple-400"
              >
                <div className="w-6 h-6 mr-3 rounded-full bg-blue-500 flex items-center justify-center text-xs font-bold text-white">
                  WC
                </div>
                WalletConnect
              </button>
              <button
                onClick={() => handleSelectWallet('Coinbase Wallet')}
                className="w-full flex items-center justify-center py-3 bg-purple-700 hover:bg-purple-600 text-white rounded-lg font-semibold shadow-md transition-all duration-300 ease-in-out transform hover:scale-105 focus:outline-none focus:ring-2 focus:ring-purple-400"
              >
                <div className="w-6 h-6 mr-3 rounded-full bg-blue-600 flex items-center justify-center text-xs font-bold text-white">
                  CB
                </div>
                Coinbase Wallet
              </button>
            </div>
            <button
              onClick={() => setShowWalletModal(false)}
              className="mt-8 w-full py-2 bg-gray-600 hover:bg-gray-700 text-white rounded-lg font-semibold shadow-md transition-all duration-300 ease-in-out focus:outline-none focus:ring-2 focus:ring-gray-400"
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;