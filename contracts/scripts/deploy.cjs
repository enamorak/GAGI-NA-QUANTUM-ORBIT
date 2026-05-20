const hre = require('hardhat');

async function main() {
  const [deployer] = await hre.ethers.getSigners();
  const backendOracle = process.env.BACKEND_ORACLE_ADDRESS || deployer.address;

  const Factory = await hre.ethers.getContractFactory('GagiNaQuantumOrbit');
  const contract = await Factory.deploy(backendOracle);
  await contract.waitForDeployment();
  const address = await contract.getAddress();

  console.log('GagiNaQuantumOrbit deployed to:', address);
  console.log('Backend oracle:', backendOracle);
  console.log('Deployer:', deployer.address);
  console.log('Polygonscan: https://amoy.polygonscan.com/address/' + address);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
