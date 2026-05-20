export const ORBIT_ABI = [
  'function balanceOf(address account) view returns (uint256)',
  'function enterOrbit(address driver, uint256 dataPoints) external',
  'function claimReward() external',
  'function totalRewards(address account) view returns (uint256)',
  'event OrbitEntered(address indexed driver, uint256 dataPoints, uint256 reward)',
];
