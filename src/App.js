import React, { useState, useEffect } from 'react';
import { Wallet, ChevronDown, CheckCircle, XCircle } from 'lucide-react';

function App() {
  const [selectedChain, setSelectedChain] = useState('ethereum');
  const [isWalletConnected, setIsWalletConnected] = useState(false);
  const [showWalletModal, setShowWalletModal] = useState(false);
  const [approvals, setApprovals] = useState([]);

  useEffect(() => {
    if (isWalletConnected) {
      setApprovals([
        { id: 1, name: 'USDC', contract: '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48', amount: 'Unlimited', type: 'Token' },
        { id: 2, name: 'BAYC', contract: '0xBC4CA0EdA7647A8aB7C2061c2E118A18a93fE367', amount: '1', type: 'NFT' },
        { id: 3, name: 'WETH', contract: '0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2', amount: '100 ETH', type: 'Token' },
        { id: 4, name: 'CryptoPunks', contract: '0xb47e3cd837dDF8e4c57F05d70Ab865de6e193BBB', amount: '1', type: 'NFT' },
        { id: 5, name: 'DAI', contract: '0x6B175474E89094C44Da98b954EedeAC495271d0F', amount: '500 DAI', type: 'Token' },
      ]);
    } else {
      setApprovals([]);
    }
  }, [isWalletConnected]);

  const handleConnectWallet = () => {
    setShowWalletModal(true);
  };

  const handleDisconnectWallet = () => {
    setIsWalletConnected(false);
    setShowWalletModal(false);
  };

  const handleSelectWallet = async (walletType) => {
    console.log(`Connecting to ${walletType}...`);
    
    try {
      if (walletType === 'Farcaster') {
        // Farcaster wallet integration - for now we'll simulate
        // In production, this would use Farcaster's wallet API
        console.log('Connecting to Farcaster wallet...');
        // Simulate wallet connection
        setTimeout(() => {
          setIsWalletConnected(true);
          setShowWalletModal(false);
        }, 1000);
      } else if (walletType === 'MetaMask') {
        // MetaMask integration
        if (window.ethereum) {
          await window.ethereum.request({ method: 'eth_requestAccounts' });
          setIsWalletConnected(true);
          setShowWalletModal(false);
        } else {
          alert('MetaMask not found! Please install MetaMask.');
        }
      } else {
        // Other wallets
        setIsWalletConnected(true);
        setShowWalletModal(false);
      }
    } catch (error) {
      console.error('Wallet connection failed:', error);
      alert('Failed to connect wallet. Please try again.');
    }
  };

  const handleRevokeApproval = (id) => {
    setApprovals(approvals.filter(approval => approval.id !== id));
    console.log(`Revoking approval for ID: ${id}`);
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
          {/* Chain Selection Dropdown */}
          <div className="relative w-full sm:w-auto">
            <select
              className="appearance-none bg-purple-700 text-white py-2 px-4 pr-8 rounded-lg shadow-inner focus:outline-none focus:ring-2 focus:ring-purple-400 cursor-pointer w-full"
              value={selectedChain}
              onChange={(e) => setSelectedChain(e.target.value)}
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
            className={`flex items-center justify-center px-6 py-2 rounded-lg font-semibold shadow-md transition-all duration-300 ease-in-out
              ${isWalletConnected ? 'bg-red-500 hover:bg-red-600' : 'bg-purple-600 hover:bg-purple-700'}
              focus:outline-none focus:ring-2 focus:ring-purple-400 transform hover:scale-105`}
          >
            <Wallet className="w-5 h-5 mr-2" />
            {isWalletConnected ? 'Disconnect Wallet' : 'Connect Wallet'}
          </button>
        </div>
      </header>

      {/* Main Content */}
      <main className="w-full max-w-4xl bg-purple-800 rounded-xl shadow-lg p-6">
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
            <h2 className="text-2xl font-bold text-purple-200 mb-6 text-center">
              Your Approvals ({chains.find(c => c.value === selectedChain)?.name})
            </h2>
            {approvals.length === 0 ? (
              <div className="text-center text-purple-300 text-lg py-10">
                No active approvals found for {chains.find(c => c.value === selectedChain)?.name}.
              </div>
            ) : (
              <div className="overflow-x-auto rounded-lg shadow-inner">
                <table className="min-w-full bg-purple-700 rounded-lg">
                  <thead className="bg-purple-600">
                    <tr>
                      <th className="py-3 px-4 text-left text-sm font-medium text-purple-100 uppercase tracking-wider rounded-tl-lg">
                        Name
                      </th>
                      <th className="py-3 px-4 text-left text-sm font-medium text-purple-100 uppercase tracking-wider">
                        Contract Address
                      </th>
                      <th className="py-3 px-4 text-left text-sm font-medium text-purple-100 uppercase tracking-wider">
                        Amount Approved
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
                            {approval.type === 'Token' ? (
                              <CheckCircle className="w-4 h-4 mr-2 text-green-400" />
                            ) : (
                              <XCircle className="w-4 h-4 mr-2 text-blue-400" />
                            )}
                            {approval.name}
                          </div>
                        </td>
                        <td className="py-3 px-4 whitespace-nowrap text-purple-300 text-sm font-mono">
                          {approval.contract.substring(0, 6)}...{approval.contract.substring(approval.contract.length - 4)}
                        </td>
                        <td className="py-3 px-4 whitespace-nowrap text-purple-200">
                          {approval.amount}
                        </td>
                        <td className="py-3 px-4 whitespace-nowrap text-center">
                          <button
                            onClick={() => handleRevokeApproval(approval.id)}
                            className="bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded-lg font-semibold text-sm shadow-md transition-all duration-300 ease-in-out transform hover:scale-105 focus:outline-none focus:ring-2 focus:ring-red-400"
                          >
                            Revoke
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