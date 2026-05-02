import { ethers } from "ethers";

export async function getUSDCBalance(walletAddress: string, provider: ethers.BrowserProvider) {
  const usdcAddress = import.meta.env.VITE_USDC_CONTRACT_ADDRESS || "0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238"; // Sepolia USDC
  const abi = [
    "function balanceOf(address owner) view returns (uint256)",
    "function decimals() view returns (uint8)"
  ];
  const contract = new ethers.Contract(usdcAddress, abi, provider);
  const [balance, decimals] = await Promise.all([
    contract.balanceOf(walletAddress),
    contract.decimals()
  ]);
  return ethers.formatUnits(balance, decimals);
}

export const shortenAddress = (address: string) => {
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
};
