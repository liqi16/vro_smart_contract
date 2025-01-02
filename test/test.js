const { expect } = require("chai");
const { ethers } = require("hardhat");
const circomlibjs = require("circomlibjs");


describe("VRO Contract", function () {
  let vroContract, userManagerContract, managerManagerContract, conflictManagerContract, voteManagerContract,mimcContract;
  let deployer, addr1, addr2, addr3, addr4, addr5, addr6, addr7, addr8, addr9;

  beforeEach(async function () {

    // 获取地址
    [deployer, addr1, addr2, addr3, addr4, addr5, addr6, addr7, addr8, addr9] = await ethers.getSigners();

    // 1. 部署 MiMCSponge 哈希合约
    const abi = await circomlibjs.mimcSpongecontract.abi;
    const bytecode = await circomlibjs.mimcSpongecontract.createCode("mimcsponge", 220);
    // console.log(abi)
    const mimc = await new ethers.ContractFactory(abi, bytecode, deployer);
    mimcContract = await mimc.deploy();
    await mimcContract.deployed();
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
    userManagerContract = await UserManager.deploy();
    await userManagerContract.deployed();
    console.log("UserManager=", userManagerContract.address);

    // 对于 ManagerManager 合约
    const ManagerManager = await ethers.getContractFactory("ManagerManager", {
        libraries: {
        ManagerLib: managerLibrary.address
        }
    });
    managerManagerContract = await ManagerManager.deploy();
    await managerManagerContract.deployed();
    console.log("ManagerManager=", managerManagerContract.address);

    // 对于 ConflictManager 合约
    const ConflictManager = await ethers.getContractFactory("ConflictManager", {
        libraries: {
        ConflictLib: conflictLibrary.address
        }
    });
    conflictManagerContract = await ConflictManager.deploy();
    await conflictManagerContract.deployed();
    console.log("ConflictManager=", conflictManagerContract.address);

    // 对于 VoteManager 合约（如果需要链接库的话）
    const VoteManager = await ethers.getContractFactory("VoteManager");
    voteManagerContract = await VoteManager.deploy();
    await voteManagerContract.deployed();
    console.log("VoteManager=", voteManagerContract.address);

    // 5. 部署 VRO 合约
    const VRO = await ethers.getContractFactory("VRO");
    vroContract = await VRO.deploy();
    await vroContract.deployed();
    console.log("VRO=", vroContract.address);

    // 6. 初始化管理合约，传入 VRO 合约地址
    await userManagerContract.initialize(vroContract.address);
    const rir_address_list = [addr1.address, addr2.address, addr3.address, addr4.address, addr5.address]
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
  });
  

  describe("Deployment", function () {
    it("should set the deployer correctly", async function () {
        expect(await vroContract.deployer()).to.equal(deployer.address);
    });
      
    it("should initialize the contracts correctly", async function () {
    expect(await vroContract.managerManager()).to.equal(managerManagerContract.address);
    expect(await vroContract.userManager()).to.equal(userManagerContract.address);
    expect(await vroContract.conflictManager()).to.equal(conflictManagerContract.address);
    expect(await vroContract.voteManager()).to.equal(voteManagerContract.address);
    });
  });

  describe("Create and manage participants", function () {
    it("should allow creating a participant", async function () {
        await vroContract.connect(addr1).createParticipant(123);
        const participants = await vroContract.getAllParticipant();
        const participantNumbers = participants.map(p => p.toNumber());  // 将 BigNumber 转换为普通数字
        expect(participantNumbers).to.include(123);  // 比较普通数字
    });

    it("should return true for a valid participant", async function () {
      await vroContract.connect(addr1).createParticipant(123);
      expect(await vroContract.connect(addr1).isParticipant(123)).to.equal(true);
    });

    it("should not allow non-deployer to create a manager", async function () {
      await expect(
        vroContract.connect(addr1).createManager("Manager1", addr1.address)
      ).to.be.revertedWith("ER1");
    });

    it("should allow deployer to create a manager", async function () {
      await vroContract.connect(deployer).createManager("Manager1", addr6.address);
      const managers = await vroContract.getAllManager();
      expect(managers).to.include(addr6.address);
    });
  });

  describe("Conflict management", function () {
    it("should allow reporting a conflict by a participant", async function () {
      // 创建参与者
      await vroContract.connect(addr1).createParticipant(123);
      
      // Report Conflict
      await expect(
        vroContract.connect(addr1).reportConflict(123, "192.168.0.0/24", [1, 2, 3])
      ).to.emit(vroContract, "ReportConflict");
    });

    it("should allow validator to confirm conflict", async function () {
      await vroContract.connect(deployer).createManager("Manager1", addr1.address);
      await vroContract.connect(addr1).createParticipant(1);
      await vroContract.connect(addr2).createParticipant(2);
      // Report Conflict and then confirm as validator
      const tx = await vroContract.connect(addr2).reportConflict(2, "192.168.0.0/24", [1, 2, 3]);
      const receipt = await tx.wait();
      const event = receipt.events.find(event => event.event === "ReportConflict");
      let conflictID, ipPrefix, moas, validatorAddr, reporterAddr;
      if (event) {
        [conflictID, ipPrefix, moas, validatorAddr, reporterAddr] = event.args;
        console.log("ReportConflict Event:");
        console.log("Conflict ID:", conflictID.toString());
        console.log("IP Prefix:", ipPrefix);
        console.log("MOAS:", moas.map(e => e.toString()));
        console.log("Validator:", validatorAddr);
        console.log("Reporter:", reporterAddr);
      } else {
        console.log("ReportConflict event not found");
      }
      
      expect(await vroContract.getStatus(conflictID)).to.equal(0); // 状态应该为已确认

      //判断validator的地址是addr1-6中的哪一个
      let validator
      if (validatorAddr == addr1.address) {
        validator = addr1
      } else if (validatorAddr == addr2.address) {
        validator = addr2
      } else if (validatorAddr == addr3.address) {
        validator = addr3
      } else if (validatorAddr == addr4.address) {
        validator = addr4
      } else if (validatorAddr == addr5.address) {
        validator = addr5
      } else if (validatorAddr == addr6.address) {
        validator = addr6
      } else {
        console.log("Reporter not found")
      }

      await vroContract.connect(validator).validatorConfirmConflict(conflictID);

      // 验证冲突的状态是否正确更新
      expect(await vroContract.getStatus(conflictID)).to.equal(1); // 状态应该为已确认
    });

    it("should allow validator to reject conflict", async function () {
      await vroContract.connect(deployer).createManager("Manager1", addr1.address);
      await vroContract.connect(addr1).createParticipant(1);
      await vroContract.connect(addr2).createParticipant(2);
      // Report Conflict and then confirm as validator
      const tx = await vroContract.connect(addr2).reportConflict(2, "192.168.0.0/24", [1, 2, 3]);
      const receipt = await tx.wait();
      const event = receipt.events.find(event => event.event === "ReportConflict");
      let conflictID, ipPrefix, moas, validatorAddr, reporterAddr;
      if (event) {
        [conflictID, ipPrefix, moas, validatorAddr, reporterAddr] = event.args;
        console.log("ReportConflict Event:");
        console.log("Conflict ID:", conflictID.toString());
        console.log("IP Prefix:", ipPrefix);
        console.log("MOAS:", moas.map(e => e.toString()));
        console.log("Validator:", validatorAddr);
        console.log("Reporter:", reporterAddr);
      } else {
        console.log("ReportConflict event not found");
      }
      
      expect(await vroContract.getStatus(conflictID)).to.equal(0); // 状态应该为已确认

      //判断validator的地址是addr1-6中的哪一个
      let validator
      if (validatorAddr == addr1.address) {
        validator = addr1
      } else if (validatorAddr == addr2.address) {
        validator = addr2
      } else if (validatorAddr == addr3.address) {
        validator = addr3
      } else if (validatorAddr == addr4.address) {
        validator = addr4
      } else if (validatorAddr == addr5.address) {
        validator = addr5
      } else if (validatorAddr == addr6.address) {
        validator = addr6
      } else {
        console.log("Reporter not found")
      }
      // 验证是否触发了 ChangeValidator 事件
      await expect(
        vroContract.connect(validator).validatorRejectConflict(conflictID)
      ).to.emit(vroContract, "ChangeValidator");
    });
  });

  describe("Voting and Resolution", function () {
    it("should allow voter to vote on conflict", async function () {
      await vroContract.connect(deployer).createManager("Manager1", addr1.address);
      await vroContract.connect(addr7).createParticipant(1);
      await vroContract.connect(addr8).createParticipant(2);
      await vroContract.connect(addr9).createParticipant(3);
      // Report Conflict and then confirm as validator
      const tx = await vroContract.connect(addr2).reportConflict(2, "192.168.0.0/24", [1, 2, 3]);
      const receipt = await tx.wait();
      const event = receipt.events.find(event => event.event === "ReportConflict");
      let conflictID, ipPrefix, moas, validatorAddr, reporterAddr;
      if (event) {
        [conflictID, ipPrefix, moas, validatorAddr, reporterAddr] = event.args;
        console.log("ReportConflict Event:");
        console.log("Conflict ID:", conflictID.toString());
        console.log("IP Prefix:", ipPrefix);
        console.log("MOAS:", moas.map(e => e.toString()));
        console.log("Validator:", validatorAddr);
        console.log("Reporter:", reporterAddr);
      } else {
        console.log("ReportConflict event not found");
      }
      
      expect(await vroContract.getStatus(conflictID)).to.equal(0); // 状态应该为已确认

      //判断validator的地址是addr1-6中的哪一个
      let validator
      if (validatorAddr == addr1.address) {
        validator = addr1
        console.log("validator is addr1")
      } else if (validatorAddr == addr2.address) {
        validator = addr2
        console.log("validator is addr2")
      } else if (validatorAddr == addr3.address) {
        validator = addr3
        console.log("validator is addr3")
      } else if (validatorAddr == addr4.address) {
        validator = addr4
        console.log("validator is addr4")
      } else if (validatorAddr == addr5.address) {
        validator = addr5
        console.log("validator is addr5")
      } else if (validatorAddr == addr6.address) {
        validator = addr6
        console.log("validator is addr6")
      } else {
        console.log("Reporter not found")
      }

      
      
      await vroContract.connect(validator).validatorConfirmConflict(conflictID);

      //Validator generate commitment
      const zkTree = require("../scripts/zkTree");
      // console.log(zkTree);
      const commitment1 = await zkTree.generateCommitment()
      console.log("commitment1",commitment1);
      const commitment2 = await zkTree.generateCommitment()
      console.log("commitment2",commitment2);
      const commitment3 = await zkTree.generateCommitment()
      console.log("commitment3",commitment3);

      //function validatorRegisterCommitment(uint256 _conflictID,uint[] memory voters,uint256[] memory _uniqueHash,uint256[] memory _commitment)
      
      let voters = [1,2,3]
      let uniqueHashArray = [commitment1.nullifierHash,commitment2.nullifierHash, commitment3.nullifierHash]
      let commitmentsArray = [commitment1.commitment,commitment2.commitment,commitment3.commitment]

      console.log("mimcContract.address", (await voteManagerContract.addr()).toString())

      await expect(vroContract.connect(validator).validatorRegisterCommitment(conflictID, voters, uniqueHashArray, commitmentsArray)).to.emit(vroContract, "RegisterVoter");

      let status = await vroContract.getStatus(conflictID);

      console.log(status);

      expect(await vroContract.getStatus(conflictID)).to.equal(2); // 状态应该为已确认

      console.log("Conlict",await vroContract.getConlictByID(conflictID));

      const TREE_LEVELS = 20;

      const voteAddress = await vroContract.getVoteAddress(conflictID);

      // Votes
      const cd1 = await zkTree.calculateMerkleRootAndZKProof(voteAddress, addr7, TREE_LEVELS, commitment1, "scripts/verifier.zkey")
      
      //function voterVoteConflict(uint asn,uint256 _conflictID,uint _option,uint256 _nullifier,uint256 _root,uint[2] memory _proof_a,uint[2][2] memory _proof_b,uint[2] memory _proof_c)
      await vroContract.connect(addr7).voterVoteConflict(1,conflictID,1,cd1.nullifierHash,cd1.root,cd1.proof_a,cd1.proof_b,cd1.proof_c)

      const cd2 = await zkTree.calculateMerkleRootAndZKProof(voteAddress, addr8, TREE_LEVELS, commitment2, "scripts/verifier.zkey")
      await vroContract.connect(addr8).voterVoteConflict(2,conflictID,1,cd2.nullifierHash,cd2.root,cd2.proof_a,cd2.proof_b,cd2.proof_c)
      const cd3 = await zkTree.calculateMerkleRootAndZKProof(voteAddress, addr9, TREE_LEVELS, commitment3, "scripts/verifier.zkey")
      await vroContract.connect(addr9).voterVoteConflict(3,conflictID,2,cd3.nullifierHash,cd3.root,cd3.proof_a,cd3.proof_b,cd3.proof_c)

      expect(await vroContract.getOptionSum(conflictID)).to.equal(3);
    });

    it("should allow validator to resolve conflict", async function () {
      await vroContract.connect(deployer).createManager("Manager1", addr1.address);
      await vroContract.connect(addr7).createParticipant(1);
      await vroContract.connect(addr8).createParticipant(2);
      await vroContract.connect(addr9).createParticipant(3);
      // Report Conflict and then confirm as validator
      const tx = await vroContract.connect(addr2).reportConflict(2, "192.168.0.0/24", [1, 2, 3]);
      const receipt = await tx.wait();
      const event = receipt.events.find(event => event.event === "ReportConflict");
      let conflictID, ipPrefix, moas, validatorAddr, reporterAddr;
      if (event) {
        [conflictID, ipPrefix, moas, validatorAddr, reporterAddr] = event.args;
        console.log("ReportConflict Event:");
        console.log("Conflict ID:", conflictID.toString());
        console.log("IP Prefix:", ipPrefix);
        console.log("MOAS:", moas.map(e => e.toString()));
        console.log("Validator:", validatorAddr);
        console.log("Reporter:", reporterAddr);
      } else {
        console.log("ReportConflict event not found");
      }
      
      expect(await vroContract.getStatus(conflictID)).to.equal(0); // 状态应该为已确认

      //判断validator的地址是addr1-6中的哪一个
      let validator
      if (validatorAddr == addr1.address) {
        validator = addr1
        console.log("validator is addr1")
      } else if (validatorAddr == addr2.address) {
        validator = addr2
        console.log("validator is addr2")
      } else if (validatorAddr == addr3.address) {
        validator = addr3
        console.log("validator is addr3")
      } else if (validatorAddr == addr4.address) {
        validator = addr4
        console.log("validator is addr4")
      } else if (validatorAddr == addr5.address) {
        validator = addr5
        console.log("validator is addr5")
      } else if (validatorAddr == addr6.address) {
        validator = addr6
        console.log("validator is addr6")
      } else {
        console.log("Reporter not found")
      }

      
      
      await vroContract.connect(validator).validatorConfirmConflict(conflictID);

      //Validator generate commitment
      const zkTree = require("../scripts/zkTree");
      // console.log(zkTree);
      const commitment1 = await zkTree.generateCommitment()
      console.log("commitment1",commitment1);
      const commitment2 = await zkTree.generateCommitment()
      console.log("commitment2",commitment2);
      const commitment3 = await zkTree.generateCommitment()
      console.log("commitment3",commitment3);

      //function validatorRegisterCommitment(uint256 _conflictID,uint[] memory voters,uint256[] memory _uniqueHash,uint256[] memory _commitment)
      
      let voters = [1,2,3]
      let uniqueHashArray = [commitment1.nullifierHash,commitment2.nullifierHash, commitment3.nullifierHash]
      let commitmentsArray = [commitment1.commitment,commitment2.commitment,commitment3.commitment]

      console.log("mimcContract.address", (await voteManagerContract.addr()).toString())

      await expect(vroContract.connect(validator).validatorRegisterCommitment(conflictID, voters, uniqueHashArray, commitmentsArray)).to.emit(vroContract, "RegisterVoter");

      let status = await vroContract.getStatus(conflictID);

      console.log(status);

      expect(await vroContract.getStatus(conflictID)).to.equal(2); // 状态应该为已确认

      console.log("Conlict",await vroContract.getConlictByID(conflictID));

      const TREE_LEVELS = 20;

      const voteAddress = await vroContract.getVoteAddress(conflictID);

      // Votes
      const cd1 = await zkTree.calculateMerkleRootAndZKProof(voteAddress, addr7, TREE_LEVELS, commitment1, "scripts/verifier.zkey")
      
      //function voterVoteConflict(uint asn,uint256 _conflictID,uint _option,uint256 _nullifier,uint256 _root,uint[2] memory _proof_a,uint[2][2] memory _proof_b,uint[2] memory _proof_c)
      await vroContract.connect(addr7).voterVoteConflict(1,conflictID,1,cd1.nullifierHash,cd1.root,cd1.proof_a,cd1.proof_b,cd1.proof_c)

      const cd2 = await zkTree.calculateMerkleRootAndZKProof(voteAddress, addr8, TREE_LEVELS, commitment2, "scripts/verifier.zkey")
      await vroContract.connect(addr8).voterVoteConflict(2,conflictID,1,cd2.nullifierHash,cd2.root,cd2.proof_a,cd2.proof_b,cd2.proof_c)
      const cd3 = await zkTree.calculateMerkleRootAndZKProof(voteAddress, addr9, TREE_LEVELS, commitment3, "scripts/verifier.zkey")
      await vroContract.connect(addr9).voterVoteConflict(3,conflictID,2,cd3.nullifierHash,cd3.root,cd3.proof_a,cd3.proof_b,cd3.proof_c)

      expect(await vroContract.getOptionSum(conflictID)).to.equal(3);

      // Resolve Conflict
      await expect(
        vroContract.connect(validator).validatorResolveConflict(conflictID)).to.emit(vroContract, "ConflictResolved");
      
      // 验证冲突是否解决
      expect(await vroContract.getStatus(conflictID)).to.equal(3); // 冲突已解决
    });
  });
});
