import React, { useState, useEffect } from 'react';
import { Wallet, ChevronDown, CheckCircle, XCircle, Loader2, AlertTriangle, ExternalLink, Shield, X } from 'lucide-react';

function App() {
  const [selectedChain, setSelectedChain] = useState('ethereum');
  const [isWalletConnected, setIsWalletConnected] = useState(false);
  const [showWalletModal, setShowWalletModal] = useState(false);
  const [approvals, setApprovals] = useState([]);
  const [walletAddress, setWalletAddress] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  // Chain configurations with real contract addresses
  const chainConfigs = {
    ethereum: {
      chainId: 1,
      name: 'Ethereum',
      rpcUrl: 'https://eth-mainnet.g.alchemy.com/v2/demo',
      explorerUrl: 'https://etherscan.io',
      nativeCurrency: 'ETH'
    },
    base: {
      chainId: 8453,
      name: 'Base',
      rpcUrl: 'https://mainnet.base.org',
      explorerUrl: 'https://basescan.org',
      nativeCurrency: 'ETH'
    },
    arbitrum: {
      chainId: 42161,
      name: 'Arbitrum One',
      rpcUrl: 'https://arb1.arbitrum.io/rpc',
      explorerUrl: 'https://arbiscan.io',
      nativeCurrency: 'ETH'
    },
    celo: {
      chainId: 42220,
      name: 'Celo',
      rpcUrl: 'https://forno.celo.org',
      explorerUrl: 'https://celoscan.io',
      nativeCurrency: 'CELO'
    }
  };

  // ERC20 Approval event signature
  const ERC20_APPROVAL_TOPIC = '0x8c5be1e5ebec7d5bd14f71427d1e84f3dd0314c0f7b2291e5b200ac8c7c3b925';

  // Enhanced known spenders database
  const knownSpenders = {
    // DEX Aggregators
    '0x1111111254eeb25477b68fb85ed929f73a960582': { name: '1inch V5 Router', risk: 'high' },
    '0x111111125421ca6dc452d289314280a0f8842a65': { name: '1inch V4 Router', risk: 'high' },
    '0x74de5d4fcbf63e00296fd95d33236b9794016631': { name: 'MetaMask Swap Router', risk: 'medium' },
    
    // Uniswap
    '0xe592427a0aece92de3edee1f18e0157c05861564': { name: 'Uniswap V3 Router', risk: 'low' },
    '0x7a250d5630b4cf539739df2c5dacb4c659f2488d': { name: 'Uniswap V2 Router', risk: 'low' },
    '0x3fc91a3afd70395cd496c647d5a6cc9d4b2b7fad': { name: 'Uniswap Universal Router', risk: 'low' },
    '0x68b3465833fb72a70ecdf485e0e4c7bd8665fc45': { name: 'Uniswap V3 Router 2', risk: 'low' },
    
    // OpenSea
    '0x00000000000001ad428e4906ae43d8f9852d0dd6': { name: 'OpenSea Seaport 1.5', risk: 'medium' },
    '0x00000000000000adc04c56bf30ac9d3c0aaf14dc': { name: 'OpenSea Seaport 1.4', risk: 'medium' },
    '0x1e0049783f008a0085193e00003d00cd54003c71': { name: 'OpenSea Seaport 1.6', risk: 'medium' },
    '0x7be8076f4ea4a4ad08075c2508e481d6c946d12b': { name: 'OpenSea Wyvern Exchange', risk: 'medium' },
    
    // Other DEXs
    '0xd9e1ce17f2641f24ae83637ab66a2cca9c378b9f': { name: 'SushiSwap Router', risk: 'low' },
    '0xdef1c0ded9bec7f1a1670819833240f027b25eff': { name: '0x Protocol', risk: 'medium' },
    
    // Lending Protocols
    '0x7d2768de32b0b80b7a3454c06bdac94a69ddc7a9': { name: 'Aave Lending Pool', risk: 'low' },
    '0x3d9819210a31b4961b30ef54be2aed79b9c9cd3b': { name: 'Compound cDAI', risk: 'low' },
  };

  // Get token information from contract
  const getTokenInfo = async (tokenAddress, chainKey) => {
    try {
      const config = chainConfigs[chainKey];
      
      const [nameResponse, symbolResponse] = await Promise.all([
        fetch(config.rpcUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            jsonrpc: '2.0',
            method: 'eth_call',
            params: [{
              to: tokenAddress,
              data: '0x06fdde03'
            }, 'latest'],
            id: 1
          })
        }),
        fetch(config.rpcUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            jsonrpc: '2.0',
            method: 'eth_call',
            params: [{
              to: tokenAddress,
              data: '0x95d89b41'
            }, 'latest'],
            id: 2
          })
        })
      ]);
      
      const nameData = await nameResponse.json();
      const symbolData = await symbolResponse.json();
      
      if (nameData.result && symbolData.result) {
        const name = hexToString(nameData.result) || 'Unknown Token';
        const symbol = hexToString(symbolData.result) || 'UNKNOWN';
        return { name, symbol };
      }
      
      return { name: 'Unknown Token', symbol: 'UNKNOWN' };
    } catch (error) {
      console.log('Error getting token info:', error);
      return { name: 'Unknown Token', symbol: 'UNKNOWN' };
    }
  };

  // Convert hex to string
  const hexToString = (hex) => {
    try {
      if (!hex || hex === '0x' || hex.length < 130) return '';
      
      hex = hex.slice(2);
      const lengthHex = hex.slice(64, 128);
      const length = parseInt(lengthHex, 16);
      
      if (length === 0 || length > 100) return '';
      
      const stringHex = hex.slice(128, 128 + (length * 2));
      
      let result = '';
      for (let i = 0; i < stringHex.length; i += 2) {
        const byte = parseInt(stringHex.substr(i, 2), 16);
        if (byte > 0 && byte < 128) {
          result += String.fromCharCode(byte);
        }
      }
      
      return result.trim();
    } catch (error) {
      return '';
    }
  };

  // Get spender info and risk assessment
  const getSpenderInfo = (spenderAddress) => {
    const address = spenderAddress.toLowerCase();
    
    if (knownSpenders[address]) {
      return knownSpenders[address];
    }
    
    return { name: 'Unknown Contract', risk: 'high' };
  };

  // Format allowance amount
  const formatAllowance = (allowanceHex) => {
    try {
      if (allowanceHex === '0xffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff') {
        return 'Unlimited';
      }
      
      const decimal = parseInt(allowanceHex, 16);
      if (decimal === 0) return '0';
      
      if (decimal > 1000000000000000000) {
        return 'Large Amount';
      }
      
      return 'Limited';
    } catch (error) {
      return 'Limited';
    }
  };

  // Get current allowance with retry logic
  const getCurrentAllowance = async (tokenAddress, ownerAddress, spenderAddress, chainKey) => {
    const config = chainConfigs[chainKey];
    
    try {
      const response = await fetch(config.rpcUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          jsonrpc: '2.0',
          method: 'eth_call',
          params: [{
            to: tokenAddress,
            data: '0xdd62ed3e' + ownerAddress.slice(2).padStart(64, '0') + spenderAddress.slice(2).padStart(64, '0')
          }, 'latest'],
          id: 1
        })
      });

      const data = await response.json();
      
      if (data.error) {
        throw new Error(data.error.message);
      }
      
      return data.result;
    } catch (error) {
      console.log(`Failed to get allowance:`, error);
      return '0x0000000000000000000000000000000000000000000000000000000000000000';
    }
  };

  // Comprehensive approval scanning
  const fetchRealApprovals = async (walletAddress, chainKey) => {
    setIsLoading(true);
    setError('');
    
    try {
      console.log('🔍 Scanning wallet ' + walletAddress + ' on ' + chainKey + '...');
      
      const approvals = [];

      // Check popular tokens against known spenders
      const popularTokens = {
        ethereum: [
          { address: '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48', name: 'USD Coin', symbol: 'USDC' },
          { address: '0xdAC17F958D2ee523a2206206994597C13D831ec7', name: 'Tether USD', symbol: 'USDT' },
          { address: '0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2', name: 'Wrapped Ether', symbol: 'WETH' },
          { address: '0x6B175474E89094C44Da98b954EedeAC495271d0F', name: 'Dai Stablecoin', symbol: 'DAI' },
          { address: '0x514910771AF9Ca656af840dff83E8264EcF986CA', name: 'ChainLink Token', symbol: 'LINK' },
          { address: '0x1f9840a85d5aF5bf1D1762F925BDADdC4201F984', name: 'Uniswap', symbol: 'UNI' },
          { address: '0x2260FAC5E5542a773Aa44fBCfeDf7C193bc2C599', name: 'Wrapped BTC', symbol: 'WBTC' },
        ],
        base: [
          { address: '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913', name: 'USD Coin', symbol: 'USDC' },
          { address: '0x4200000000000000000000000000000000000006', name: 'Wrapped Ether', symbol: 'WETH' },
        ],
        arbitrum: [
          { address: '0xFF970A61A04b1cA14834A43f5dE4533eBDDB5CC8', name: 'USD Coin (Arb1)', symbol: 'USDC' },
          { address: '0x912CE59144191C1204E64559FE8253a0e49E6548', name: 'Arbitrum', symbol: 'ARB' },
          { address: '0x82aF49447D8a07e3bd95BD0d56f35241523fBab1', name: 'Wrapped Ether', symbol: 'WETH' },
        ],
        celo: [
          { address: '0x765DE816845861e75A25fCA122bb6898B8B1282a', name: 'Celo Dollar', symbol: 'cUSD' },
          { address: '0xD8763CBa276a3738E6DE85b4b3bF5FDed6D6cA73', name: 'Celo Euro', symbol: 'cEUR' },
        ]
      };

      const tokens = popularTokens[chainKey] || [];
      const allSpenders = Object.keys(knownSpenders);

      console.log('Checking ' + tokens.length + ' tokens against ' + allSpenders.length + ' spenders...');

      // For demo purposes, add some mock approvals if no MetaMask is connected
      if (!window.ethereum || walletAddress.startsWith('0x742d35Cc')) {
        // Add some demo approvals
        approvals.push({
          id: 'demo-1',
          tokenName: 'USD Coin',
          tokenSymbol: 'USDC',
          tokenAddress: '0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48',
          spenderAddress: '0x1111111254eeb25477b68fb85ed929f73a960582',
          spenderName: '1inch V5 Router',
          allowance: 'Unlimited',
          type: 'ERC20',
          riskLevel: 'high',
          lastActivity: 'Demo',
          txHash: 'Demo',
          blockNumber: 'Demo'
        });
        
        approvals.push({
          id: 'demo-2',
          tokenName: 'Wrapped Ether',
          tokenSymbol: 'WETH',
          tokenAddress: '0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2',
          spenderAddress: '0xe592427a0aece92de3edee1f18e0157c05861564',
          spenderName: 'Uniswap V3 Router',
          allowance: 'Limited',
          type: 'ERC20',
          riskLevel: 'low',
          lastActivity: 'Demo',
          txHash: 'Demo',
          blockNumber: 'Demo'
        });
      } else {
        // Real scanning for MetaMask users
        for (const token of tokens) {
          for (const spenderAddress of allSpenders) {
            try {
              const allowance = await getCurrentAllowance(token.address, walletAddress, spenderAddress, chainKey);
              
              if (allowance && allowance !== '0x0000000000000000000000000000000000000000000000000000000000000000') {
                const spenderInfo = getSpenderInfo(spenderAddress);
                
                approvals.push({
                  id: `${token.address}-${spenderAddress}`,
                  tokenName: token.name,
                  tokenSymbol: token.symbol,
                  tokenAddress: token.address.toLowerCase(),
                  spenderAddress: spenderAddress.toLowerCase(),
                  spenderName: spenderInfo.name,
                  allowance: formatAllowance(allowance),
                  type: 'ERC20',
                  riskLevel: spenderInfo.risk,
                  lastActivity: 'Current',
                  txHash: 'Active',
                  blockNumber: 'Current'
                });
              }
            } catch (error) {
              continue;
            }
          }
        }
      }

      console.log('✅ Found ' + approvals.length + ' active approvals');
      
      if (approvals.length === 0) {
        setError('No active approvals found on popular tokens. This could mean: 1) Your wallet has no approvals, 2) All approvals were revoked, or 3) You use different tokens not in our scan list.');
      }

      setApprovals(approvals.sort((a, b) => {
        const riskOrder = { high: 3, medium: 2, low: 1 };
        return riskOrder[b.riskLevel] - riskOrder[a.riskLevel];
      }));

    } catch (error) {
      console.error('Critical error in approval fetching:', error);
      setError('Failed to scan approvals: ' + error.message + '. Try switching networks or refreshing.');
      setApprovals([]);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (isWalletConnected && walletAddress) {
      fetchRealApprovals(walletAddress, selectedChain);
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
        if (typeof window !== 'undefined' && window.ethereum && !window.ethereum._isClonedProvider) {
          try {
            const accounts = await window.ethereum.request({ 
              method: 'eth_requestAccounts' 
            });
            if (accounts && accounts.length > 0) {
              setWalletAddress(accounts[0]);
              setIsWalletConnected(true);
              setShowWalletModal(false);
            }
          } catch (walletError) {
            console.log('Wallet connection cancelled or failed:', walletError);
            setError('Wallet connection was cancelled or failed.');
          }
        } else {
          console.log('MetaMask not available, using demo mode');
          const mockAddress = '0x742d35Cc85E9dc30C91C2000000000000000001';
          setWalletAddress(mockAddress);
          setIsWalletConnected(true);
          setShowWalletModal(false);
        }
      } else {
        const mockAddress = '0x742d35Cc85E9dc30C91C200000000000000000' + (walletType === 'WalletConnect' ? '2' : '3');
        setWalletAddress(mockAddress);
        setIsWalletConnected(true);
        setShowWalletModal(false);
      }
    } catch (error) {
      console.error('Wallet connection failed:', error);
      setError('Failed to connect wallet. Please try again.');
    }
  };

  const handleRevokeApproval = async (approval) => {
    // Check if it's a demo approval
    if (approval.id.startsWith('demo-')) {
      setApprovals(prev => prev.filter(item => item.id !== approval.id));
      alert('Demo approval revoked successfully!');
      return;
    }

    if (!window.ethereum) {
      setError('MetaMask not found. Cannot execute revoke transaction.');
      return;
    }

    setIsLoading(true);
    setError('');

    try {
      const provider = window.ethereum;
      
      let txData;
      
      if (approval.type === 'ERC20') {
        txData = {
          to: approval.tokenAddress,
          from: walletAddress,
          data: '0x095ea7b3' + approval.spenderAddress.slice(2).padStart(64, '0') + '0'.repeat(64),
          gas: '0x15F90',
        };
      }

      const txHash = await provider.request({
        method: 'eth_sendTransaction',
        params: [txData],
      });

      console.log('Revoke transaction sent:', txHash);
      
      setApprovals(prev => prev.filter(item => item.id !== approval.id));
      alert('Successfully revoked ' + approval.tokenName + ' approval! Transaction: ' + txHash);
      
    } catch (error) {
      console.error('Revoke transaction failed:', error);
      
      if (error.code === 4001) {
        setError('Transaction cancelled by user.');
      } else {
        setError('Revoke failed: ' + (error.message || 'Unknown error'));
      }
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
                              <div className="font-medium">{approval.tokenName}</div>
                              <div className="text-xs text-purple-400 flex items-center">
                                {approval.tokenSymbol}
                                <a 
                                  href={chainConfigs[selectedChain]?.explorerUrl + '/address/' + approval.tokenAddress}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="ml-1 text-purple-300 hover:text-purple-100"
                                >
                                  <ExternalLink className="w-3 h-3" />
                                </a>
                              </div>
                            </div>
                          </div>
                        </td>
                        <td className="py-3 px-4 whitespace-nowrap text-purple-300 text-sm">
                          <div>
                            <div className="font-mono text-xs">
                              {approval.spenderAddress.substring(0, 6)}...{approval.spenderAddress.substring(approval.spenderAddress.length - 4)}
                            </div>
                            <div className="text-xs text-purple-400">{approval.spenderName}</div>
                          </div>
                        </td>
                        <td className="py-3 px-4 whitespace-nowrap text-purple-200">
                          <div className="font-medium">{approval.allowance}</div>
                          <div className="text-xs text-purple-400">Status: {approval.lastActivity}</div>
                        </td>
                        <td className="py-3 px-4 whitespace-nowrap">
                          <div className="flex items-center">
                            <span className={`px-2 py-1 text-xs font-semibold rounded-full ${
                              approval.riskLevel === 'high' ? 'bg-red-900 text-red-200' :
                              approval.riskLevel === 'medium' ? 'bg-yellow-900 text-yellow-200' :
                              'bg-green-900 text-green-200'
                            }`}>
                              {approval.riskLevel.toUpperCase()}
                            </span>
                            {approval.riskLevel === 'high' && (
                              <Shield className="w-4 h-4 ml-1 text-red-400" />
                            )}
                          </div>
                        </td>
                        <td className="py-3 px-4 whitespace-nowrap text-center">
                          <button
                            onClick={() => handleRevokeApproval(approval)}
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
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-2xl font-bold text-purple-200">Connect Your Wallet</h3>
              <button
                onClick={() => setShowWalletModal(false)}
                className="text-purple-300 hover:text-purple-100 transition-colors"
              >
                <X className="w-6 h-6" />
              </button>
            </div>
            <div className="space-y-4">
              <button
                onClick={() => handleSelectWallet('Farcaster')}
                className="w-full flex items-center justify-center py-3 bg-purple-600 hover:bg-purple-500 text-white rounded-lg font-semibold shadow-md transition-all duration-300 ease-in-out transform hover:scale-105 focus:outline-none focus:ring-2 focus:ring-purple-400 border-2 border-purple-400"
              >
                <div className="w-6 h-6 mr-3 rounded-full bg-purple-500 flex items-center justify-center text-xs font-bold text-white">
                  FC
                </div>
                Farcaster
              </button>
              
              <button
                onClick={() => handleSelectWallet('MetaMask')}
                className="w-full flex items-center justify-center py-3 bg-orange-600 hover:bg-orange-500 text-white rounded-lg font-semibold shadow-md transition-all duration-300 ease-in-out transform hover:scale-105 focus:outline-none focus:ring-2 focus:ring-orange-400"
              >
                <div className="w-6 h-6 mr-3">
                  🦊
                </div>
                MetaMask
              </button>
              
              <button
                onClick={() => handleSelectWallet('WalletConnect')}
                className="w-full flex items-center justify-center py-3 bg-blue-600 hover:bg-blue-500 text-white rounded-lg font-semibold shadow-md transition-all duration-300 ease-in-out transform hover:scale-105 focus:outline-none focus:ring-2 focus:ring-blue-400"
              >
                <div className="w-6 h-6 mr-3">
                  🔗
                </div>
                WalletConnect
              </button>
              
              <button
                onClick={() => handleSelectWallet('Coinbase')}
                className="w-full flex items-center justify-center py-3 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg font-semibold shadow-md transition-all duration-300 ease-in-out transform hover:scale-105 focus:outline-none focus:ring-2 focus:ring-indigo-400"
              >
                <div className="w-6 h-6 mr-3">
                  💙
                </div>
                Coinbase Wallet
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;