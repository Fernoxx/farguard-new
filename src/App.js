import React, { useState, useEffect } from 'react';
import { Wallet, ChevronDown, CheckCircle, XCircle, Loader2, AlertTriangle, ExternalLink, Shield } from 'lucide-react';

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
    }
  };

  // ERC20 Transfer event signature for approval detection
  const ERC20_APPROVAL_TOPIC = '0x8c5be1e5ebec7d5bd14f71427d1e84f3dd0314c0f7b2291e5b200ac8c7c3b925';
  const ERC721_APPROVAL_TOPIC = '0x8c5be1e5ebec7d5bd14f71427d1e84f3dd0314c0f7b2291e5b200ac8c7c3b925';
  const ERC721_APPROVAL_ALL_TOPIC = '0x17307eab39ab6107e8899845ad3d59bd9653f200f220920489ca2b5937696c31';

  // Common spender addresses (DEXs, marketplaces, etc.)
  const knownSpenders = {
    '0x1111111254EEB25477B68fb85Ed929f73A960582': { name: '1inch Router', risk: 'medium' },
    '0xE592427A0AEce92De3Edee1F18E0157C05861564': { name: 'Uniswap V3 Router', risk: 'low' },
    '0x7a250d5630B4cF539739dF2C5dAcb4c659F2488D': { name: 'Uniswap V2 Router', risk: 'low' },
    '0x00000000000001ad428e4906aE43D8F9852d0dD6': { name: 'OpenSea Seaport', risk: 'medium' },
    '0x74de5d4FCbf63E00296fd95d33236B9794016631': { name: 'MetaMask Swap Router', risk: 'low' },
    '0x3fc91A3afd70395Cd496C647d5a6CC9D4B2b7FAD': { name: 'Uniswap Universal Router', risk: 'low' }
  };

  // Comprehensive approval fetching like revoke.cash
  const fetchRealApprovals = async (walletAddress, chainKey) => {
    setIsLoading(true);
    setError('');
    
    try {
      const config = chainConfigs[chainKey];
      let allApprovals = [];

      console.log(`Fetching approvals for ${walletAddress} on ${chainKey}...`);

      // Method 1: Get approval events from logs (like revoke.cash)
      const logApprovals = await fetchApprovalEvents(walletAddress, chainKey);
      allApprovals.push(...logApprovals);

      // Method 2: Check current allowances on popular tokens
      const currentApprovals = await fetchCurrentAllowances(walletAddress, chainKey);
      allApprovals.push(...currentApprovals);

      // Method 3: Check NFT approvals for all
      const nftApprovals = await fetchNFTApprovals(walletAddress, chainKey);
      allApprovals.push(...nftApprovals);

      // Remove duplicates and filter active approvals
      const uniqueApprovals = removeDuplicateApprovals(allApprovals);
      const activeApprovals = uniqueApprovals.filter(approval => 
        approval.allowance !== '0' && approval.allowance !== 'Revoked'
      );

      console.log(`Found ${activeApprovals.length} active approvals`);
      setApprovals(activeApprovals);

    } catch (error) {
      console.error('Error fetching real approvals:', error);
      setError(`Unable to fetch approvals. This might be due to API limits. Your wallet may have approvals that aren't visible right now.`);
      setApprovals([]);
    } finally {
      setIsLoading(false);
    }
  };

  // Fetch approval events using multiple methods
  const fetchApprovalEvents = async (walletAddress, chainKey) => {
    const approvals = [];
    
    try {
      // Use public RPC endpoints to get logs (like revoke.cash does)
      const config = chainConfigs[chainKey];
      
      // Get the latest block number
      const latestBlockResponse = await fetch(config.rpcUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          jsonrpc: '2.0',
          method: 'eth_blockNumber',
          params: [],
          id: 1
        })
      });
      
      const latestBlockData = await latestBlockResponse.json();
      const latestBlock = parseInt(latestBlockData.result, 16);
      const fromBlock = Math.max(0, latestBlock - 10000); // Last ~10k blocks
      
      console.log(`Scanning blocks ${fromBlock} to ${latestBlock} for approvals...`);

      // Get ERC20 Approval events where owner = walletAddress
      const approvalLogs = await fetchLogs(config.rpcUrl, {
        fromBlock: `0x${fromBlock.toString(16)}`,
        toBlock: 'latest',
        topics: [
          ERC20_APPROVAL_TOPIC, // Approval(owner, spender, value)
          `0x000000000000000000000000${walletAddress.slice(2).toLowerCase()}`, // owner = walletAddress
          null // any spender
        ]
      });

      console.log(`Found ${approvalLogs.length} approval events`);

      // Parse each approval event
      for (const log of approvalLogs) {
        try {
          const approval = await parseApprovalLog(log, walletAddress, chainKey);
          if (approval) {
            approvals.push(approval);
          }
        } catch (parseError) {
          console.log('Error parsing approval log:', parseError);
        }
      }

    } catch (error) {
      console.log('Error fetching approval events:', error);
    }
    
    return approvals;
  };

  // Fetch logs from RPC
  const fetchLogs = async (rpcUrl, params) => {
    try {
      const response = await fetch(rpcUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          jsonrpc: '2.0',
          method: 'eth_getLogs',
          params: [params],
          id: 1
        })
      });

      const data = await response.json();
      return data.result || [];
    } catch (error) {
      console.log('RPC logs request failed:', error);
      return [];
    }
  };

  // Parse individual approval log
  const parseApprovalLog = async (log, walletAddress, chainKey) => {
    try {
      const tokenAddress = log.address;
      const spenderAddress = '0x' + log.topics[2].slice(26); // Remove padding from spender
      const allowanceHex = log.data;
      
      // Skip zero approvals (revoked)
      if (allowanceHex === '0x0000000000000000000000000000000000000000000000000000000000000000') {
        return null;
      }

      // Get current allowance to verify it's still active
      const currentAllowance = await getCurrentAllowance(tokenAddress, walletAddress, spenderAddress, chainKey);
      if (!currentAllowance || currentAllowance === '0') {
        return null; // Already revoked
      }

      // Get token information
      const tokenInfo = await getTokenInfo(tokenAddress, chainKey);
      const spenderInfo = getSpenderInfo(spenderAddress);

      return {
        id: `${tokenAddress}-${spenderAddress}`,
        tokenName: tokenInfo?.name || 'Unknown Token',
        tokenSymbol: tokenInfo?.symbol || 'UNKNOWN',
        tokenAddress: tokenAddress.toLowerCase(),
        spenderAddress: spenderAddress.toLowerCase(),
        spenderName: spenderInfo.name,
        allowance: currentAllowance === '0xffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff' ? 'Unlimited' : formatAllowance(currentAllowance),
        type: 'ERC20',
        riskLevel: spenderInfo.risk,
        lastActivity: 'Recent',
        txHash: log.transactionHash,
        blockNumber: parseInt(log.blockNumber, 16)
      };

    } catch (error) {
      console.log('Error parsing approval log:', error);
      return null;
    }
  };

  // Get current allowance for a token
  const getCurrentAllowance = async (tokenAddress, ownerAddress, spenderAddress, chainKey) => {
    try {
      const config = chainConfigs[chainKey];
      
      const response = await fetch(config.rpcUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          jsonrpc: '2.0',
          method: 'eth_call',
          params: [{
            to: tokenAddress,
            data: `0xdd62ed3e${ownerAddress.slice(2).padStart(64, '0')}${spenderAddress.slice(2).padStart(64, '0')}` // allowance(owner, spender)
          }, 'latest'],
          id: 1
        })
      });

      const data = await response.json();
      return data.result;
    } catch (error) {
      console.log('Error getting current allowance:', error);
      return '0';
    }
  };

  // Check current allowances on popular tokens (like revoke.cash popular tokens list)
  const fetchCurrentAllowances = async (walletAddress, chainKey) => {
    const approvals = [];
    
    // Popular tokens per chain (like revoke.cash uses)
    const popularTokens = {
      ethereum: [
        { address: '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48', name: 'USD Coin', symbol: 'USDC' },
        { address: '0xdAC17F958D2ee523a2206206994597C13D831ec7', name: 'Tether USD', symbol: 'USDT' },
        { address: '0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2', name: 'Wrapped Ether', symbol: 'WETH' },
        { address: '0x6B175474E89094C44Da98b954EedeAC495271d0F', name: 'Dai Stablecoin', symbol: 'DAI' },
        { address: '0x514910771AF9Ca656af840dff83E8264EcF986CA', name: 'ChainLink Token', symbol: 'LINK' },
        { address: '0x1f9840a85d5aF5bf1D1762F925BDADdC4201F984', name: 'Uniswap', symbol: 'UNI' },
        { address: '0x7D1AfA7B718fb893dB30A3aBc0Cfc608AaCfeBB0', name: 'Polygon', symbol: 'MATIC' },
        { address: '0x95aD61b0a150d79219dCF64E1E6Cc01f0B64C4cE', name: 'Shiba Inu', symbol: 'SHIB' }
      ],
      base: [
        { address: '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913', name: 'USD Coin', symbol: 'USDC' },
        { address: '0x4200000000000000000000000000000000000006', name: 'Wrapped Ether', symbol: 'WETH' }
      ],
      arbitrum: [
        { address: '0xFF970A61A04b1cA14834A43f5dE4533eBDDB5CC8', name: 'USD Coin (Arb1)', symbol: 'USDC' },
        { address: '0x912CE59144191C1204E64559FE8253a0e49E6548', name: 'Arbitrum', symbol: 'ARB' },
        { address: '0x82aF49447D8a07e3bd95BD0d56f35241523fBab1', name: 'Wrapped Ether', symbol: 'WETH' }
      ]
    };

    const tokens = popularTokens[chainKey] || [];
    const commonSpenders = Object.keys(knownSpenders);

    console.log(`Checking ${tokens.length} popular tokens against ${commonSpenders.length} known spenders...`);

    for (const token of tokens) {
      for (const spenderAddress of commonSpenders) {
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
              allowance: allowance === '0xffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff' ? 'Unlimited' : formatAllowance(allowance),
              type: 'ERC20',
              riskLevel: spenderInfo.risk,
              lastActivity: 'Active',
              txHash: 'Current State',
              blockNumber: 'Current'
            });
          }
        } catch (error) {
          console.log(`Error checking ${token.symbol} allowance for ${spenderAddress}:`, error);
        }
      }
    }

    return approvals;
  };

  // Format allowance amount
  const formatAllowance = (allowanceHex) => {
    try {
      const allowanceBigInt = BigInt(allowanceHex);
      if (allowanceBigInt === BigInt('0xffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff')) {
        return 'Unlimited';
      }
      
      // Convert to readable format (simplified)
      const allowanceStr = allowanceBigInt.toString();
      if (allowanceStr.length > 18) {
        const formatted = allowanceStr.slice(0, -18) + '.' + allowanceStr.slice(-18, -15);
        return parseFloat(formatted).toFixed(2);
      }
      
      return allowanceStr;
    } catch (error) {
      return 'Limited';
    }
  };

  // Fetch NFT approvals
  const fetchNFTApprovals = async (walletAddress, chainKey) => {
    const approvals = [];
    
    try {
      const config = chainConfigs[chainKey];
      
      // Popular NFT collections per chain
      const popularNFTs = {
        ethereum: [
          { address: '0xBC4CA0EdA7647A8aB7C2061c2E118A18a93fE367', name: 'Bored Ape Yacht Club', symbol: 'BAYC' },
          { address: '0x60E4d786628Fea6478F785A6d7e704777c86a7c6', name: 'Mutant Ape Yacht Club', symbol: 'MAYC' },
          { address: '0xb47e3cd837dDF8e4c57F05d70Ab865de6e193BBB', name: 'CryptoPunks', symbol: 'PUNKS' },
          { address: '0xED5AF388653567Af2F388E6224dC7C4b3241C544', name: 'Azuki', symbol: 'AZUKI' }
        ],
        base: [],
        arbitrum: []
      };

      const nfts = popularNFTs[chainKey] || [];
      const nftMarketplaces = [
        '0x00000000000001ad428e4906aE43D8F9852d0dD6', // OpenSea Seaport
        '0x00000000000000ADc04C56Bf30aC9d3c0aAF14dC', // OpenSea Seaport 1.4
        '0x1E0049783F008A0085193E00003D00cd54003c71', // OpenSea Seaport 1.5
      ];

      for (const nft of nfts) {
        for (const marketplace of nftMarketplaces) {
          try {
            // Check isApprovedForAll(owner, operator)
            const response = await fetch(config.rpcUrl, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                jsonrpc: '2.0',
                method: 'eth_call',
                params: [{
                  to: nft.address,
                  data: `0xe985e9c5${walletAddress.slice(2).padStart(64, '0')}${marketplace.slice(2).padStart(64, '0')}` // isApprovedForAll(owner, operator)
                }, 'latest'],
                id: 1
              })
            });

            const data = await response.json();
            
            // If approved (returns true = 0x0000...0001)
            if (data.result && data.result === '0x0000000000000000000000000000000000000000000000000000000000000001') {
              const spenderInfo = getSpenderInfo(marketplace);
              
              approvals.push({
                id: `${nft.address}-${marketplace}`,
                tokenName: nft.name,
                tokenSymbol: nft.symbol,
                tokenAddress: nft.address.toLowerCase(),
                spenderAddress: marketplace.toLowerCase(),
                spenderName: spenderInfo.name,
                allowance: 'All NFTs',
                type: 'ERC721',
                riskLevel: spenderInfo.risk,
                lastActivity: 'Active',
                txHash: 'Current State',
                blockNumber: 'Current'
              });
            }
          } catch (error) {
            console.log(`Error checking NFT approval for ${nft.symbol}:`, error);
          }
        }
      }
    } catch (error) {
      console.log('Error fetching NFT approvals:', error);
    }

    return approvals;
  };

  // Remove duplicate approvals
  const removeDuplicateApprovals = (approvals) => {
    const seen = new Set();
    return approvals.filter(approval => {
      const key = `${approval.tokenAddress}-${approval.spenderAddress}`;
      if (seen.has(key)) {
        return false;
      }
      seen.add(key);
      return true;
    });
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
        // Check for ethereum provider more safely
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
          // Fallback to mock address for demo
          console.log('MetaMask not available, using demo mode');
          const mockAddress = '0x742d35Cc85E9dc30C91C2000000000000000001';
          setWalletAddress(mockAddress);
          setIsWalletConnected(true);
          setShowWalletModal(false);
        }
      } else {
        // For other wallet types, use mock addresses
        const mockAddress = `0x742d35Cc85E9dc30C91C200000000000000000${walletType === 'WalletConnect' ? '2' : '3'}`;
        setWalletAddress(mockAddress);
        setIsWalletConnected(true);
        setShowWalletModal(false);
      }
    } catch (error) {
      console.error('Wallet connection failed:', error);
      setError('Failed to connect wallet. Please try again.');
    }
  };

  // Real revoke approval transaction
  const handleRevokeApproval = async (approval) => {
    if (!window.ethereum) {
      setError('MetaMask not found. Cannot execute revoke transaction.');
      return;
    }

    setIsLoading(true);
    setError('');

    try {
      const provider = window.ethereum;
      
      // Switch to correct network if needed
      const currentChain = chainConfigs[selectedChain];
      await switchNetwork(currentChain.chainId);

      let txData;
      
      if (approval.type === 'ERC20') {
        // ERC20 approve(spender, 0) to revoke
        txData = {
          to: approval.tokenAddress,
          from: walletAddress,
          data: `0x095ea7b3${approval.spenderAddress.slice(2).padStart(64, '0')}${'0'.repeat(64)}`, // approve(spender, 0)
          gas: '0x15F90', // 90000 gas limit
        };
      } else if (approval.type === 'ERC721') {
        // ERC721 setApprovalForAll(operator, false)
        txData = {
          to: approval.tokenAddress,
          from: walletAddress,
          data: `0xa22cb465${approval.spenderAddress.slice(2).padStart(64, '0')}${'0'.repeat(63)}0`, // setApprovalForAll(operator, false)
          gas: '0x15F90',
        };
      }

      // Send transaction
      const txHash = await provider.request({
        method: 'eth_sendTransaction',
        params: [txData],
      });

      console.log('Revoke transaction sent:', txHash);
      
      // Wait for confirmation (simplified)
      await waitForTransaction(txHash);
      
      // Remove from UI after successful revoke
      setApprovals(prev => prev.filter(item => item.id !== approval.id));
      
      // Show success message
      alert(`Successfully revoked ${approval.tokenName} approval! Transaction: ${txHash}`);
      
    } catch (error) {
      console.error('Revoke transaction failed:', error);
      
      if (error.code === 4001) {
        setError('Transaction cancelled by user.');
      } else if (error.code === -32603) {
        setError('Transaction failed. Please check your wallet balance and try again.');
      } else {
        setError(`Revoke failed: ${error.message || 'Unknown error'}`);
      }
    } finally {
      setIsLoading(false);
    }
  };

  // Switch network helper
  const switchNetwork = async (chainId) => {
    try {
      await window.ethereum.request({
        method: 'wallet_switchEthereumChain',
        params: [{ chainId: `0x${chainId.toString(16)}` }],
      });
    } catch (switchError) {
      if (switchError.code === 4902) {
        // Network not added to wallet
        const config = Object.values(chainConfigs).find(c => c.chainId === chainId);
        if (config) {
          await window.ethereum.request({
            method: 'wallet_addEthereumChain',
            params: [{
              chainId: `0x${chainId.toString(16)}`,
              chainName: config.name,
              rpcUrls: [config.rpcUrl],
              blockExplorerUrls: [config.explorerUrl],
              nativeCurrency: {
                name: config.nativeCurrency,
                symbol: config.nativeCurrency,
                decimals: 18,
              },
            }],
          });
        }
      }
      throw switchError;
    }
  };

  // Wait for transaction confirmation
  const waitForTransaction = async (txHash) => {
    return new Promise((resolve, reject) => {
      const checkTransaction = async () => {
        try {
          const receipt = await window.ethereum.request({
            method: 'eth_getTransactionReceipt',
            params: [txHash],
          });
          
          if (receipt) {
            if (receipt.status === '0x1') {
              resolve(receipt);
            } else {
              reject(new Error('Transaction failed'));
            }
          } else {
            // Transaction still pending, check again in 2 seconds
            setTimeout(checkTransaction, 2000);
          }
        } catch (error) {
          reject(error);
        }
      };
      
      checkTransaction();
    });
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
                                  href={`${chainConfigs[selectedChain]?.explorerUrl}/address/${approval.tokenAddress}`}
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
                          <div className="text-xs text-purple-400">Last: {approval.lastActivity}</div>
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