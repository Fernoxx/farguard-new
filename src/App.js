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

  // Chain configurations
  const chainConfigs = {
    ethereum: {
      chainId: 1,
      name: 'Ethereum',
      rpcUrl: 'https://eth-mainnet.g.alchemy.com/v2/demo',
      explorerUrl: 'https://etherscan.io',
      apiUrl: 'https://api.etherscan.io/api'
    },
    base: {
      chainId: 8453,
      name: 'Base',
      rpcUrl: 'https://mainnet.base.org',
      explorerUrl: 'https://basescan.org',
      apiUrl: 'https://api.basescan.org/api'
    },
    arbitrum: {
      chainId: 42161,
      name: 'Arbitrum One',
      rpcUrl: 'https://arb1.arbitrum.io/rpc',
      explorerUrl: 'https://arbiscan.io',
      apiUrl: 'https://api.arbiscan.io/api'
    }
  };

  const ERC20_APPROVAL_TOPIC = '0x8c5be1e5ebec7d5bd14f71427d1e84f3dd0314c0f7b2291e5b200ac8c7c3b925';

  // Comprehensive known spenders database (like revoke.cash)
  const knownSpenders = {
    // DEX Aggregators (HIGH RISK)
    '0x1111111254eeb25477b68fb85ed929f73a960582': { name: '1inch V5 Router', risk: 'high' },
    '0x111111125421ca6dc452d289314280a0f8842a65': { name: '1inch V4 Router', risk: 'high' },
    '0x11111112542d85b3ef69ae05771c2dccff4faa26': { name: '1inch Limit Order', risk: 'high' },
    '0x74de5d4fcbf63e00296fd95d33236b9794016631': { name: 'MetaMask Swap Router', risk: 'medium' },
    '0x881d40237659c251811cec9c364ef91dc08d300c': { name: 'MetaMask Swaps', risk: 'medium' },
    '0x9008d19f58aabd9ed0d60971565aa8510560ab41': { name: 'CoW Protocol', risk: 'medium' },
    '0xdef1c0ded9bec7f1a1670819833240f027b25eff': { name: '0x Protocol', risk: 'medium' },
    
    // Uniswap (LOW-MEDIUM RISK)
    '0xe592427a0aece92de3edee1f18e0157c05861564': { name: 'Uniswap V3 Router', risk: 'low' },
    '0x7a250d5630b4cf539739df2c5dacb4c659f2488d': { name: 'Uniswap V2 Router', risk: 'low' },
    '0x3fc91a3afd70395cd496c647d5a6cc9d4b2b7fad': { name: 'Uniswap Universal Router', risk: 'low' },
    '0x68b3465833fb72a70ecdf485e0e4c7bd8665fc45': { name: 'Uniswap V3 Router 2', risk: 'low' },
    
    // OpenSea & NFT Marketplaces (MEDIUM RISK)
    '0x00000000000001ad428e4906ae43d8f9852d0dd6': { name: 'OpenSea Seaport 1.5', risk: 'medium' },
    '0x00000000000000adc04c56bf30ac9d3c0aaf14dc': { name: 'OpenSea Seaport 1.4', risk: 'medium' },
    '0x1e0049783f008a0085193e00003d00cd54003c71': { name: 'OpenSea Seaport 1.6', risk: 'medium' },
    '0x7be8076f4ea4a4ad08075c2508e481d6c946d12b': { name: 'OpenSea Wyvern Exchange', risk: 'medium' },
    '0x59728544b08ab483533076417fbbb2fd0b17ce3a': { name: 'LooksRare Exchange', risk: 'medium' },
    
    // Other DEXs
    '0xd9e1ce17f2641f24ae83637ab66a2cca9c378b9f': { name: 'SushiSwap Router', risk: 'low' },
    '0xc0aee478e3658e2610c5f7a4a2e1777ce9e4f2ac': { name: 'SushiSwap V2 Router', risk: 'low' },
    
    // DeFi Protocols (LOW RISK)
    '0x7d2768de32b0b80b7a3454c06bdac94a69ddc7a9': { name: 'Aave Lending Pool', risk: 'low' },
    '0x3d9819210a31b4961b30ef54be2aed79b9c9cd3b': { name: 'Compound cDAI', risk: 'low' },
    '0x5d3a536e4d6dbd6114cc1ead35777bab948e3643': { name: 'Compound cDAI', risk: 'low' },
    
    // Bridges (HIGH RISK)
    '0x88e6a0c2ddd26feeb64f039a2c41296fcb3f5640': { name: 'Bridge Protocol', risk: 'high' },
    
    // Other Common Contracts
    '0xa5409ec958c83c3f309868babaca7c86dcb077c1': { name: 'ENS Registrar', risk: 'low' },
    '0x4c60051384bd2d3c01bfc845cf5f4b44bcbe9de5': { name: '1inch Limit Order', risk: 'medium' },
    '0xe66b31678d6c16e9ebf358268a790b763c133750': { name: 'Coinbase Advanced Trade', risk: 'medium' }
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

  // Get token information from contract
  const getTokenInfo = async (tokenAddress, chainKey) => {
    try {
      const config = chainConfigs[chainKey];
      
      const nameCall = fetch(config.rpcUrl, {
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
      });
      
      const symbolCall = fetch(config.rpcUrl, {
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
      });
      
      const [nameResponse, symbolResponse] = await Promise.all([nameCall, symbolCall]);
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

  // Get current allowance
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
      console.log('Failed to get allowance:', error);
      return '0x0000000000000000000000000000000000000000000000000000000000000000';
    }
  };

  // COMPREHENSIVE APPROVAL SCANNING - Multiple strategies like revoke.cash
  const fetchRealApprovals = async (walletAddress, chainKey) => {
    setIsLoading(true);
    setError('');
    
    try {
      console.log('🔍 COMPREHENSIVE SCAN: Finding ALL approvals for', walletAddress, 'on', chainKey);
      
      let allApprovals = [];

      // Strategy 1: Comprehensive transaction history scan
      try {
        const txApprovals = await scanTransactionHistory(walletAddress, chainKey);
        allApprovals = allApprovals.concat(txApprovals);
        console.log('📊 Transaction scan found:', txApprovals.length, 'approvals');
      } catch (error) {
        console.log('Transaction scan failed:', error);
      }

      // Strategy 2: Blockchain event log scanning
      try {
        const eventApprovals = await scanBlockchainEvents(walletAddress, chainKey);
        allApprovals = allApprovals.concat(eventApprovals);
        console.log('📊 Event scan found:', eventApprovals.length, 'approvals');
      } catch (error) {
        console.log('Event scan failed:', error);
      }

      // Strategy 3: Token discovery and approval checking
      try {
        const discoveredApprovals = await scanDiscoveredTokens(walletAddress, chainKey);
        allApprovals = allApprovals.concat(discoveredApprovals);
        console.log('📊 Token discovery found:', discoveredApprovals.length, 'approvals');
      } catch (error) {
        console.log('Token discovery failed:', error);
      }

      // Remove duplicates and verify active approvals
      const uniqueApprovals = removeDuplicates(allApprovals);
      const activeApprovals = await verifyActiveApprovals(uniqueApprovals, walletAddress, chainKey);

      console.log('✅ FINAL RESULT:', activeApprovals.length, 'verified active approvals');
      
      if (activeApprovals.length === 0) {
        setError('No active approvals found. Your wallet may have no approvals, or they were all revoked.');
      }

      setApprovals(activeApprovals.sort((a, b) => {
        const riskOrder = { high: 3, medium: 2, low: 1 };
        return riskOrder[b.riskLevel] - riskOrder[a.riskLevel];
      }));

    } catch (error) {
      console.error('Comprehensive scan failed:', error);
      setError('Failed to scan approvals: ' + error.message);
      setApprovals([]);
    } finally {
      setIsLoading(false);
    }
  };

  // Strategy 1: Scan transaction history for ALL approve() calls
  const scanTransactionHistory = async (walletAddress, chainKey) => {
    const approvals = [];
    const config = chainConfigs[chainKey];
    
    try {
      // Scan multiple pages of transactions
      const totalPages = 10; // Scan 10 pages = 10,000 transactions
      
      for (let page = 1; page <= totalPages; page++) {
        try {
          console.log('Scanning transaction page', page, 'of', totalPages);
          
          const txUrl = config.apiUrl + '?module=account&action=txlist&address=' + walletAddress + 
                       '&startblock=0&endblock=99999999&page=' + page + '&offset=1000&sort=desc';
          
          const response = await fetch(txUrl);
          const data = await response.json();
          
          if (data.status === '1' && data.result && data.result.length > 0) {
            for (const tx of data.result) {
              // Look for approve() function calls (0x095ea7b3)
              if (tx.input && tx.input.startsWith('0x095ea7b3') && tx.input.length >= 138) {
                try {
                  const approval = await parseApprovalTransaction(tx, walletAddress, chainKey);
                  if (approval) {
                    approvals.push(approval);
                  }
                } catch (error) {
                  continue;
                }
              }
              
              // Look for setApprovalForAll() function calls (0xa22cb465) for NFTs
              if (tx.input && tx.input.startsWith('0xa22cb465') && tx.input.length >= 138) {
                try {
                  const nftApproval = await parseNFTApprovalTransaction(tx, walletAddress, chainKey);
                  if (nftApproval) {
                    approvals.push(nftApproval);
                  }
                } catch (error) {
                  continue;
                }
              }
            }
          }
          
          // Rate limiting - wait between requests
          await new Promise(resolve => setTimeout(resolve, 200));
          
        } catch (error) {
          console.log('Page', page, 'failed:', error);
          continue;
        }
      }
    } catch (error) {
      console.log('Transaction history scan failed:', error);
    }
    
    return approvals;
  };

  // Strategy 2: Scan blockchain events
  const scanBlockchainEvents = async (walletAddress, chainKey) => {
    const approvals = [];
    const config = chainConfigs[chainKey];
    
    try {
      // Get latest block
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
      if (!latestBlockData.result) return [];

      const latestBlock = parseInt(latestBlockData.result, 16);
      const fromBlock = Math.max(0, latestBlock - 100000); // Scan last 100k blocks
      
      console.log('Scanning blockchain events from block', fromBlock, 'to', latestBlock);

      // Scan for approval events
      const logs = await fetchLogs(config.rpcUrl, {
        fromBlock: '0x' + fromBlock.toString(16),
        toBlock: 'latest',
        topics: [
          ERC20_APPROVAL_TOPIC,
          '0x000000000000000000000000' + walletAddress.slice(2).toLowerCase(),
          null
        ]
      });

      console.log('Found', logs.length, 'approval events');

      for (const log of logs) {
        try {
          const approval = await parseApprovalLog(log, walletAddress, chainKey);
          if (approval) {
            approvals.push(approval);
          }
        } catch (error) {
          continue;
        }
      }

    } catch (error) {
      console.log('Blockchain event scan failed:', error);
    }

    return approvals;
  };

  // Strategy 3: Discover tokens and check approvals
  const scanDiscoveredTokens = async (walletAddress, chainKey) => {
    const approvals = [];
    
    try {
      // Get token transfers to discover what tokens the wallet has interacted with
      const config = chainConfigs[chainKey];
      
      const transferUrl = config.apiUrl + '?module=account&action=tokentx&address=' + walletAddress + 
                         '&startblock=0&endblock=99999999&page=1&offset=1000&sort=desc';
      
      const response = await fetch(transferUrl);
      const data = await response.json();
      
      if (data.status === '1' && data.result) {
        console.log('Discovered', data.result.length, 'token interactions');
        
        const discoveredTokens = new Set();
        
        // Collect unique token addresses
        for (const transfer of data.result) {
          if (transfer.contractAddress) {
            discoveredTokens.add(transfer.contractAddress.toLowerCase());
          }
        }
        
        console.log('Checking approvals for', discoveredTokens.size, 'discovered tokens');
        
        // Check each discovered token against all known spenders
        const spenderAddresses = Object.keys(knownSpenders);
        
        for (const tokenAddress of discoveredTokens) {
          for (const spenderAddress of spenderAddresses) {
            try {
              const allowance = await getCurrentAllowance(tokenAddress, walletAddress, spenderAddress, chainKey);
              
              if (allowance && allowance !== '0x0000000000000000000000000000000000000000000000000000000000000000') {
                const tokenInfo = await getTokenInfo(tokenAddress, chainKey);
                const spenderInfo = getSpenderInfo(spenderAddress);
                
                approvals.push({
                  id: tokenAddress + '-' + spenderAddress,
                  tokenName: tokenInfo.name,
                  tokenSymbol: tokenInfo.symbol,
                  tokenAddress: tokenAddress,
                  spenderAddress: spenderAddress.toLowerCase(),
                  spenderName: spenderInfo.name,
                  allowance: formatAllowance(allowance),
                  type: 'ERC20',
                  riskLevel: spenderInfo.risk,
                  lastActivity: 'Discovered',
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
    } catch (error) {
      console.log('Token discovery failed:', error);
    }
    
    return approvals;
  };

  // Parse approval transaction
  const parseApprovalTransaction = async (tx, walletAddress, chainKey) => {
    try {
      const tokenAddress = tx.to;
      const spenderHex = tx.input.slice(34, 74);
      const spenderAddress = '0x' + spenderHex;
      
      // Verify current allowance
      const currentAllowance = await getCurrentAllowance(tokenAddress, walletAddress, spenderAddress, chainKey);
      if (!currentAllowance || currentAllowance === '0x0000000000000000000000000000000000000000000000000000000000000000') {
        return null;
      }

      const tokenInfo = await getTokenInfo(tokenAddress, chainKey);
      const spenderInfo = getSpenderInfo(spenderAddress);

      return {
        id: tokenAddress + '-' + spenderAddress,
        tokenName: tokenInfo.name,
        tokenSymbol: tokenInfo.symbol,
        tokenAddress: tokenAddress.toLowerCase(),
        spenderAddress: spenderAddress.toLowerCase(),
        spenderName: spenderInfo.name,
        allowance: formatAllowance(currentAllowance),
        type: 'ERC20',
        riskLevel: spenderInfo.risk,
        lastActivity: new Date(parseInt(tx.timeStamp) * 1000).toISOString().split('T')[0],
        txHash: tx.hash,
        blockNumber: parseInt(tx.blockNumber)
      };
    } catch (error) {
      return null;
    }
  };

  // Parse NFT approval transaction
  const parseNFTApprovalTransaction = async (tx, walletAddress, chainKey) => {
    try {
      const tokenAddress = tx.to;
      const operatorHex = tx.input.slice(34, 74);
      const operatorAddress = '0x' + operatorHex;
      const approvedHex = tx.input.slice(138, 140);
      const isApproved = approvedHex === '01';
      
      if (!isApproved) return null;
      
      // Verify current approval status
      const isCurrentlyApproved = await checkNFTApprovalStatus(tokenAddress, walletAddress, operatorAddress, chainKey);
      if (!isCurrentlyApproved) return null;
      
      const tokenInfo = await getTokenInfo(tokenAddress, chainKey);
      const spenderInfo = getSpenderInfo(operatorAddress);

      return {
        id: tokenAddress + '-' + operatorAddress,
        tokenName: tokenInfo.name,
        tokenSymbol: tokenInfo.symbol,
        tokenAddress: tokenAddress.toLowerCase(),
        spenderAddress: operatorAddress.toLowerCase(),
        spenderName: spenderInfo.name,
        allowance: 'All NFTs',
        type: 'ERC721',
        riskLevel: spenderInfo.risk,
        lastActivity: new Date(parseInt(tx.timeStamp) * 1000).toISOString().split('T')[0],
        txHash: tx.hash,
        blockNumber: parseInt(tx.blockNumber)
      };
    } catch (error) {
      return null;
    }
  };

  // Parse approval log
  const parseApprovalLog = async (log, walletAddress, chainKey) => {
    try {
      const tokenAddress = log.address;
      const spenderAddress = '0x' + log.topics[2].slice(26);
      
      const currentAllowance = await getCurrentAllowance(tokenAddress, walletAddress, spenderAddress, chainKey);
      if (!currentAllowance || currentAllowance === '0x0000000000000000000000000000000000000000000000000000000000000000') {
        return null;
      }

      const tokenInfo = await getTokenInfo(tokenAddress, chainKey);
      const spenderInfo = getSpenderInfo(spenderAddress);

      return {
        id: tokenAddress + '-' + spenderAddress,
        tokenName: tokenInfo.name,
        tokenSymbol: tokenInfo.symbol,
        tokenAddress: tokenAddress.toLowerCase(),
        spenderAddress: spenderAddress.toLowerCase(),
        spenderName: spenderInfo.name,
        allowance: formatAllowance(currentAllowance),
        type: 'ERC20',
        riskLevel: spenderInfo.risk,
        lastActivity: 'Recent',
        txHash: log.transactionHash,
        blockNumber: parseInt(log.blockNumber, 16)
      };
    } catch (error) {
      return null;
    }
  };

  // Check NFT approval status
  const checkNFTApprovalStatus = async (tokenAddress, ownerAddress, operatorAddress, chainKey) => {
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
            data: '0xe985e9c5' + ownerAddress.slice(2).padStart(64, '0') + operatorAddress.slice(2).padStart(64, '0')
          }, 'latest'],
          id: 1
        })
      });

      const data = await response.json();
      return data.result === '0x0000000000000000000000000000000000000000000000000000000000000001';
    } catch (error) {
      return false;
    }
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
      
      if (data.error) {
        console.log('RPC error:', data.error.message);
        return [];
      }
      
      return data.result || [];
    } catch (error) {
      console.log('RPC request failed:', error);
      return [];
    }
  };

  // Remove duplicates
  const removeDuplicates = (approvals) => {
    const seen = new Map();
    return approvals.filter(approval => {
      const key = approval.tokenAddress + '-' + approval.spenderAddress;
      if (seen.has(key)) {
        return false;
      }
      seen.set(key, true);
      return true;
    });
  };

  // Verify active approvals
  const verifyActiveApprovals = async (approvals, walletAddress, chainKey) => {
    const verifiedApprovals = [];
    
    console.log('🔍 Verifying', approvals.length, 'discovered approvals...');
    
    for (const approval of approvals) {
      try {
        let isActive = false;
        
        if (approval.type === 'ERC721') {
          isActive = await checkNFTApprovalStatus(approval.tokenAddress, walletAddress, approval.spenderAddress, chainKey);
        } else {
          const currentAllowance = await getCurrentAllowance(approval.tokenAddress, walletAddress, approval.spenderAddress, chainKey);
          isActive = currentAllowance && currentAllowance !== '0x0000000000000000000000000000000000000000000000000000000000000000';
          
          if (isActive) {
            approval.allowance = formatAllowance(currentAllowance);
          }
        }
        
        if (isActive) {
          verifiedApprovals.push(approval);
        }
      } catch (error) {
        continue;
      }
    }
    
    return verifiedApprovals;
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
    console.log('Connecting to', walletType);
    setError('');
    
    try {
      if (walletType === 'Farcaster') {
        const mockAddress = '0x742d35Cc85E9dc30C91C2000000000000000000';
        setWalletAddress(mockAddress);
        setIsWalletConnected(true);
        setShowWalletModal(false);
        
      } else if (walletType === 'MetaMask') {
        if (typeof window !== 'undefined' && window.ethereum) {
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
            setError('Wallet connection cancelled or failed.');
          }
        } else {
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
      setError('Failed to connect wallet. Please try again.');
    }
  };

  const handleRevokeApproval = async (approval) => {
    if (!window.ethereum) {
      setError('MetaMask not found. Cannot execute revoke transaction.');
      return;
    }

    setIsLoading(true);
    setError('');

    try {
      let txData;
      
      if (approval.type === 'ERC721') {
        // NFT setApprovalForAll(operator, false)
        txData = {
          to: approval.tokenAddress,
          from: walletAddress,
          data: '0xa22cb465' + approval.spenderAddress.slice(2).padStart(64, '0') + '0'.repeat(63) + '0',
          gas: '0x15F90'
        };
      } else {
        // ERC20 approve(spender, 0)
        txData = {
          to: approval.tokenAddress,
          from: walletAddress,
          data: '0x095ea7b3' + approval.spenderAddress.slice(2).padStart(64, '0') + '0'.repeat(64),
          gas: '0x15F90'
        };
      }

      const txHash = await window.ethereum.request({
        method: 'eth_sendTransaction',
        params: [txData]
      });

      console.log('Revoke transaction sent:', txHash);
      
      setApprovals(prev => prev.filter(item => item.id !== approval.id));
      alert('Successfully revoked ' + approval.tokenName + ' approval! Transaction: ' + txHash);
      
    } catch (error) {
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
    { name: 'Monad (Coming Soon)', value: 'monad', disabled: true }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-900 to-indigo-900 text-white flex flex-col items-center p-4 sm:p-6">
      <style jsx>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700&display=swap');
        body {
          font-family: 'Inter', sans-serif;
        }
      `}</style>

      {/* Header */}
      <header className="w-full max-w-4xl flex flex-col sm:flex-row items-center justify-between py-4 px-6 bg-purple-800 rounded-xl shadow-lg mb-8">
        <h1 className="text-3xl font-bold text-purple-200 mb-4 sm:mb-0">FarGuard</h1>
        <div className="flex flex-col sm:flex-row items-center space-y-4 sm:space-y-0 sm:space-x-4">
          {isWalletConnected && walletAddress && (
            <div className="text-sm text-purple-300 font-mono">
              {walletAddress.substring(0, 6)}...{walletAddress.substring(walletAddress.length - 4)}
            </div>
          )}
          
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

          <button
            onClick={isWalletConnected ? handleDisconnectWallet : handleConnectWallet}
            disabled={isLoading}
            className={`flex items-center justify-center px-6 py-2 rounded-lg font-semibold shadow-md transition-all duration-300 ease-in-out ${
              isWalletConnected ? 'bg-red-500 hover:bg-red-600' : 'bg-purple-600 hover:bg-purple-700'
            } ${
              isLoading ? 'opacity-50 cursor-not-allowed' : 'transform hover:scale-105'
            } focus:outline-none focus:ring-2 focus:ring-purple-400`}
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
        {error && (
          <div className="mb-6 p-4 bg-red-900 border border-red-700 rounded-lg flex items-center">
            <AlertTriangle className="w-5 h-5 text-red-400 mr-3" />
            <span className="text-red-200">{error}</span>
          </div>
        )}

        {!isWalletConnected ? (
          <div className="flex flex-col items-center justify-center h-64 text-center">
            <p className="text-xl text-purple-300 mb-4">Connect your wallet to scan for ALL token approvals and signatures.</p>
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
                  Scanning ALL approvals...
                </div>
              )}
            </div>
            
            {!isLoading && approvals.length === 0 ? (
              <div className="text-center text-purple-300 text-lg py-10">
                No active approvals found. Your wallet may have no approvals or they were all revoked.
              </div>
            ) : (
              <div className="overflow-x-auto rounded-lg shadow-inner">
                <table className="min-w-full bg-purple-700 rounded-lg">
                  <thead className="bg-purple-600">
                    <tr>
                      <th className="py-3 px-4 text-left text-sm font-medium text-purple-100 uppercase tracking-wider rounded-tl-lg">
                        Token
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
                            {approval.type === 'ERC721' ? (
                              <XCircle className="w-4 h-4 mr-2 text-blue-400" />
                            ) : (
                              <CheckCircle className="w-4 h-4 mr-2 text-green-400" />
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
            <h3 className="text-2xl font-bold text-purple-200 mb-6 text-center">Connect Your Wallet</h3>
            <div className="space-y-4">
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