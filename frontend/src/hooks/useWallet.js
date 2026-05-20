import { useState, useCallback, useEffect } from 'react';
import { BrowserProvider, Contract } from 'ethers';
import { ORBIT_ABI } from '../contracts/abi';

const CHAIN_AMOY = '0x13882';

export function useWallet() {
  const [address, setAddress] = useState(null);
  const [balance, setBalance] = useState('0');
  const [connecting, setConnecting] = useState(false);
  const [error, setError] = useState(null);

  const contractAddress = import.meta.env.VITE_CONTRACT_ADDRESS;

  const refreshBalance = useCallback(
    async (addr) => {
      if (!addr) return;
      let demoTokens = 0;
      try {
        const { api } = await import('../api.js');
        const participant = await api.getParticipant(addr);
        demoTokens = participant?.tokens ?? 0;
      } catch {
        demoTokens = 0;
      }
      let chainTokens = 0;
      if (contractAddress && window.ethereum) {
        try {
          const provider = new BrowserProvider(window.ethereum);
          const contract = new Contract(contractAddress, ORBIT_ABI, provider);
          const onChain = await contract.balanceOf(addr);
          chainTokens = Math.floor(Number(onChain) / 1e18);
        } catch {
          /* demo uses backend tokens */
        }
      }
      setBalance(String(demoTokens + chainTokens));
    },
    [contractAddress]
  );

  const connect = useCallback(async () => {
    setConnecting(true);
    setError(null);
    try {
      if (!window.ethereum) {
        throw new Error('Install MetaMask or a Web3 wallet');
      }
      const provider = new BrowserProvider(window.ethereum);
      const network = await provider.getNetwork();
      if (network.chainId !== BigInt(80002) && contractAddress) {
        try {
          await window.ethereum.request({
            method: 'wallet_switchEthereumChain',
            params: [{ chainId: CHAIN_AMOY }],
          });
        } catch (switchErr) {
          if (switchErr.code === 4902) {
            await window.ethereum.request({
              method: 'wallet_addEthereumChain',
              params: [
                {
                  chainId: CHAIN_AMOY,
                  chainName: 'Polygon Amoy Testnet',
                  nativeCurrency: { name: 'POL', symbol: 'POL', decimals: 18 },
                  rpcUrls: ['https://rpc-amoy.polygon.technology'],
                  blockExplorerUrls: ['https://amoy.polygonscan.com'],
                },
              ],
            });
          }
        }
      }
      const accounts = await provider.send('eth_requestAccounts', []);
      const addr = accounts[0];
      setAddress(addr);
      await refreshBalance(addr);
    } catch (e) {
      setError(e.message);
    } finally {
      setConnecting(false);
    }
  }, [contractAddress, refreshBalance]);

  useEffect(() => {
    if (!window.ethereum) return;
    const onAccounts = (accounts) => {
      if (accounts.length) {
        setAddress(accounts[0]);
        refreshBalance(accounts[0]);
      } else {
        setAddress(null);
        setBalance('0');
      }
    };
    window.ethereum.on('accountsChanged', onAccounts);
    return () => window.ethereum.removeListener('accountsChanged', onAccounts);
  }, [refreshBalance]);

  const shortAddress = address
    ? `${address.slice(0, 6)}...${address.slice(-4)}`
    : null;

  return {
    address,
    shortAddress,
    balance,
    connecting,
    error,
    connect,
    refreshBalance,
    setBalance,
    isConnected: !!address,
  };
}

export function truncateWallet(w) {
  if (!w) return '—';
  return `${w.slice(0, 6)}...${w.slice(-4)}`;
}
