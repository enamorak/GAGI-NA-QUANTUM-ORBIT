// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @title GagiNaQuantumOrbit
 * @notice ORBIT reward token for GAGI NA QUANTUM ORBIT — SEABW 2026 hackathon MVP
 * @dev Backend-signed enterOrbit for demo; production uses Chainlink oracle + ZKP attestations
 */
contract GagiNaQuantumOrbit {
    string public constant name = "ORBIT";
    string public constant symbol = "ORBIT";
    uint8 public constant decimals = 18;

    address public owner;
    address public backendOracle;
    uint256 public rewardPerDataPoint = 1 ether;

    mapping(address => uint256) private _balances;
    mapping(address => uint256) public totalRewards;
    mapping(address => uint256) public dataPointsContributed;
    mapping(address => bool) public hasClaimed;

    uint256 private _totalSupply;

    event OrbitEntered(address indexed driver, uint256 dataPoints, uint256 reward);
    event RewardClaimed(address indexed driver, uint256 amount);
    event BackendOracleUpdated(address indexed oracle);

    modifier onlyOwner() {
        require(msg.sender == owner, "Not owner");
        _;
    }

    modifier onlyBackend() {
        require(msg.sender == backendOracle, "Not backend oracle");
        _;
    }

    constructor(address _backendOracle) {
        owner = msg.sender;
        backendOracle = _backendOracle;
    }

    function setBackendOracle(address _oracle) external onlyOwner {
        backendOracle = _oracle;
        emit BackendOracleUpdated(_oracle);
    }

    function setRewardPerDataPoint(uint256 _reward) external onlyOwner {
        rewardPerDataPoint = _reward;
    }

    /**
     * @notice Called by trusted backend after validating driver telemetry
     */
    function enterOrbit(address _driver, uint256 _dataPoints) external onlyBackend {
        require(_driver != address(0), "Invalid driver");
        require(_dataPoints > 0, "No data");

        uint256 reward = _dataPoints * rewardPerDataPoint;
        dataPointsContributed[_driver] += _dataPoints;
        totalRewards[_driver] += reward;
        _mint(_driver, reward);

        emit OrbitEntered(_driver, _dataPoints, reward);
    }

    /**
     * @notice One-time claim hook for future EIP-712 voucher flow
     */
    function claimReward() external {
        require(!hasClaimed[msg.sender], "Already claimed");
        uint256 pending = totalRewards[msg.sender];
        require(pending > 0, "Nothing to claim");
        hasClaimed[msg.sender] = true;
        emit RewardClaimed(msg.sender, pending);
    }

    function balanceOf(address account) external view returns (uint256) {
        return _balances[account];
    }

    function totalSupply() external view returns (uint256) {
        return _totalSupply;
    }

    function _mint(address to, uint256 amount) internal {
        _balances[to] += amount;
        _totalSupply += amount;
    }
}
