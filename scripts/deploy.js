// scripts/deploy.js
const circomlibjs = require("circomlibjs");
const { ethers } = require("hardhat");

async function main() {
  // 获取部署者账户
  const [deployer, ...accounts] = await ethers.getSigners();
  console.log('Deployer=', deployer.address);

  // 1. 部署 MiMCSponge 哈希合约
  const abi = await circomlibjs.mimcSpongecontract.abi;
  const bytecode = await circomlibjs.mimcSpongecontract.createCode("mimcsponge", 220);
  console.log(abi)
  const mimc_sponge_factory = await new ethers.ContractFactory(abi, bytecode, deployer);
  mimcContract = await mimc_sponge_factory.deploy();
  console.log('MiMCSponge=', mimcContract.address);

  // 2. 部署 Verifier 合约
  const Verifier = await ethers.getContractFactory("Verifier");
  const verifier = await Verifier.deploy();
  console.log("Verifier=", verifier.address);

  // 3. 部署库合约
  const UserLib = await ethers.getContractFactory("UserLib");
  const userLibrary = await UserLib.deploy();
  await userLibrary.deployed();
  console.log("UserLib=", userLibrary.address);

  const ConflictLib = await ethers.getContractFactory("ConflictLib");
  const conflictLibrary = await ConflictLib.deploy();
  await conflictLibrary.deployed();
  console.log("ConflictLib=", conflictLibrary.address);

  const Utils = await ethers.getContractFactory("Utils");
  const utilsLibrary = await Utils.deploy();
  await utilsLibrary.deployed();
  console.log("Utils=", utilsLibrary.address);

  const ManagerLib = await ethers.getContractFactory("ManagerLib");
  const managerLibrary = await ManagerLib.deploy();
  await managerLibrary.deployed();
  console.log("ManagerLib=", managerLibrary.address);

  // 4. 将库链接到管理合约
  // 在 Hardhat 中，需要在部署使用库的合约之前，通过在 getContractFactory 时指定 libraries 参数来链接库

  // 对于 UserManager 合约
  const UserManager = await ethers.getContractFactory("UserManager", {
    libraries: {
      UserLib: userLibrary.address
    }
  });
  const userManagerContract = await UserManager.deploy();
  await userManagerContract.deployed();
  console.log("UserManager=", userManagerContract.address);

  // 对于 ManagerManager 合约
  const ManagerManager = await ethers.getContractFactory("ManagerManager", {
    libraries: {
      ManagerLib: managerLibrary.address
    }
  });
  const managerManagerContract = await ManagerManager.deploy();
  await managerManagerContract.deployed();
  console.log("ManagerManager=", managerManagerContract.address);

  // 对于 ConflictManager 合约
  const ConflictManager = await ethers.getContractFactory("ConflictManager", {
    libraries: {
      ConflictLib: conflictLibrary.address
    }
  });
  const conflictManagerContract = await ConflictManager.deploy();
  await conflictManagerContract.deployed();
  console.log("ConflictManager=", conflictManagerContract.address);

  // 对于 VoteManager 合约（如果需要链接库的话）
  const VoteManager = await ethers.getContractFactory("VoteManager");
  const voteManagerContract = await VoteManager.deploy();
  await voteManagerContract.deployed();
  console.log("VoteManager=", voteManagerContract.address);

  // 5. 部署 VRO 合约
  const VRO = await ethers.getContractFactory("VRO");
  const vroContract = await VRO.deploy();
  await vroContract.deployed();
  console.log("VRO=", vroContract.address);

  // 6. 初始化管理合约，传入 VRO 合约地址
  await userManagerContract.initialize(vroContract.address);
  
  const rir_address_list = accounts.slice(0, 5).map(account => account.address);
  await managerManagerContract.initialize(vroContract.address, rir_address_list);
  await conflictManagerContract.initialize(vroContract.address);
  await voteManagerContract.initialize(vroContract.address, mimcContract.address, verifier.address);

  // 7. 初始化 VRO 合约，传入管理合约地址
  await vroContract.initialize(
    managerManagerContract.address,
    userManagerContract.address,
    conflictManagerContract.address,
    voteManagerContract.address
  );

  console.log("所有合约部署并初始化成功");
}

main()
  .then(() => process.exit(0))
  .catch(error => {
    console.error("部署过程中发生错误:", error);
    process.exit(1);
  });
