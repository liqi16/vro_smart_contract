// SPDX-License-Identifier: MIT
pragma solidity >=0.4.22 <0.9.0;

import "./ManagerManager.sol";
import "./UserManager.sol";
import "./ConflictManager.sol";
import "./VoteManager.sol";
import "./ConflictLib.sol";

contract VRO {
    address public immutable deployer;
    ManagerManager public managerManager;
    UserManager public userManager;
    ConflictManager public conflictManager;
    VoteManager public voteManager;
    bool initialized = false;

    // 事件定义
    event ReportConflict(uint256 conflictID, string IP_Prefix, uint[] MOAS, address Validator, address Reporter);
    event ChangeValidator(uint256 conflictID, address PreviousValidator, address NewValidator);
    event RegisterVoter(uint256 conflictID, uint[] voters);
    event ConflictResolved(uint256 conflictID);
    event TestEvent(address sender, bytes4 sig, bytes data, uint blockNumber);
    
    constructor() {
        deployer = msg.sender;
    }

    modifier onlyDeployer() {
        require(msg.sender == deployer, "ER1");
        _;
    }

    function initialize(
    address _managerManagerAddr,
    address _userManagerAddr,
    address _conflictManagerAddr,
    address _voteManagerAddr
    ) public onlyDeployer {
        managerManager = ManagerManager(_managerManagerAddr);
        userManager = UserManager(_userManagerAddr);
        conflictManager = ConflictManager(_conflictManagerAddr);
        voteManager = VoteManager(_voteManagerAddr);
        initialized = true;
    }

    function isParticipant(uint asn) public view returns (bool) {
        return userManager.isParticipant(asn, msg.sender);
    }

    function isManager() public view returns (bool) {
        return managerManager.isManager(msg.sender);
    }

    function createManager(string memory _name, address _address) public onlyDeployer returns (bool) {
        return managerManager.createManager(_name, _address);
    }

    function createParticipant(uint _ASN) public returns (bool) {
        return userManager.createParticipant(msg.sender, _ASN);
    }

    function getAllManager() public view returns (address[] memory) {
        return managerManager.getAllManager();
    }

    function getAllParticipant() public view returns (uint[] memory) {
        return userManager.getAllParticipant();
    }

    function reportConflict(uint asn, string memory _IP_Prefix, uint[] memory _MOAS) public returns (uint) {
        require(isParticipant(asn) || isManager(), "ER2");
        address validatorAddress = managerManager.selectValidator();
        (uint conflictID,uint options) = conflictManager.reportConflict(_IP_Prefix, _MOAS, validatorAddress, msg.sender);
        voteManager.createVote(conflictID, options);
        userManager.incrementReportConflict(asn);
        managerManager.incrementOnGoingEvent(validatorAddress);
        emit ReportConflict(conflictID, _IP_Prefix, _MOAS, validatorAddress, msg.sender);
        return 0;
    }

    // 验证者确认冲突
    function validatorConfirmConflict(uint256 _conflictID) public {
        require(conflictManager.isValidator(_conflictID, msg.sender), "ER4"); 
        require(conflictManager.getStatus(_conflictID) == 0, "ER5"); 
        conflictManager.confirmConflict(_conflictID);
        // 在voteManager中注册验证者
        voteManager.registerValidator(_conflictID, msg.sender);
        // 更新管理者的统计信息
        managerManager.incrementOnGoingEvent(msg.sender);
    }

    function getVoteAddress(uint256 _voteId) public view returns (address) {
        return voteManager.getVoteAddress(_voteId);
    }

    function getCurrentConflictID() public view returns (uint) {
        return conflictManager.conflictCounter();
    }

    function getConflictVotersByID(uint256 _conflictID) public view returns (uint[] memory) {
        ConflictLib.Conflict memory conflict = conflictManager.getConflictByID(_conflictID);
        return conflict.Voters;
    }

    function getConlictByID(uint256 _conflictID) public view returns (ConflictLib.Conflict memory) {
        return conflictManager.getConflictByID(_conflictID);
    }

    // 验证者拒绝冲突
    function validatorRejectConflict(uint256 _conflictID) public {
        require(conflictManager.isValidator(_conflictID, msg.sender), "ER4"); 
        require(conflictManager.getStatus(_conflictID) == 0, "ER5");

        // 重新选择验证者
        address newValidator = managerManager.reSelectValidator(msg.sender);
        conflictManager.changeValidator(_conflictID, newValidator);
        // 更新管理者的统计信息
        managerManager.incrementRejectEvent(msg.sender);
        managerManager.decrementOnGoingEvent(msg.sender);
        managerManager.incrementOnGoingEvent(newValidator);

        // 触发事件
        emit ChangeValidator(_conflictID, msg.sender, newValidator);
    }

    // 验证者注册承诺
    function validatorRegisterCommitment(
        uint256 _conflictID,
        uint[] memory voters,
        uint256[] memory _uniqueHash,
        uint256[] memory _commitment
    ) public {
        require(conflictManager.isValidator(_conflictID, msg.sender), "ER4"); // 只有验证者可以注册承诺
        require(conflictManager.getStatus(_conflictID) == 1, "ER6"); // 冲突尚未被确认
        require(_uniqueHash.length == _commitment.length && _uniqueHash.length == voters.length, "ER7"); // 数组长度必须相等

        conflictManager.registerVoters(_conflictID, voters);

        // 在voteManager中注册承诺
        voteManager.registerCommitments(_conflictID, _uniqueHash, _commitment);

        // 更新用户的进行中投票计数
        for (uint i = 0; i < voters.length; i++) {
            userManager.incrementOnGoingVote(voters[i]);
        }

        conflictManager.updateStatus(_conflictID, 2); // 更新冲突状态为投票中
        emit RegisterVoter(_conflictID, voters);
    }

    // 投票者对冲突进行投票
    function voterVoteConflict(
        uint asn,
        uint256 _conflictID,
        uint _option,
        uint256 _nullifier,
        uint256 _root,
        uint[2] memory _proof_a,
        uint[2][2] memory _proof_b,
        uint[2] memory _proof_c
    ) public {
        require(isParticipant(asn) || isManager(), "ER2"); // 只有参与者或管理者可以投票
        require(conflictManager.getStatus(_conflictID) == 2, "ER9"); // 冲突必须处于投票状态
        uint options = conflictManager.getOptions(_conflictID);
        require(_option < options, "ER10"); // 无效的选项

        // 向voteManager提交投票
        voteManager.vote(
            _conflictID,
            _option,
            _nullifier,
            _root,
            _proof_a,
            _proof_b,
            _proof_c
        );

        userManager.incrementFinishedVote(asn);
        userManager.decrementOnGoingVote(asn);
    }


    // 获取某个选项的投票计数
    function getOptionCounter(uint256 _conflictID, uint _option) public view returns (uint) {
        return voteManager.getOptionCounter(_conflictID, _option);
    }

    // 获取总投票数
    function getOptionSum(uint256 _conflictID) public view returns (uint) {
        return voteManager.getTotalVotes(_conflictID);
    }

    // 获取冲突状态
    function getStatus(uint256 _conflictID) public view returns (uint) {
        return conflictManager.getStatus(_conflictID);
    }

    // 验证者解决冲突
    function validatorResolveConflict(uint256 _conflictID) public {
        require(conflictManager.isValidator(_conflictID, msg.sender), "ER4"); // 只有验证者可以解决
        require(conflictManager.getStatus(_conflictID) == 2, "ER11"); // 冲突必须处于投票状态

        uint options = conflictManager.getOptions(_conflictID);
        uint totalVotes = voteManager.getTotalVotes(_conflictID);
        uint[] memory optionCounts = new uint[](options);
        uint highestOption = 0;
        uint highestCount = 0;

        for (uint i = 0; i < options; i++) {
            uint count = voteManager.getOptionCounter(_conflictID, i);
            optionCounts[i] = count;
            if (count >= highestCount) {
                highestCount = count;
                highestOption = i;
            }
        }

        uint voterCount = conflictManager.getVoterCount(_conflictID);

        require(totalVotes > voterCount / 2, "ER12"); // 投票数不足
        conflictManager.resolveConflict(_conflictID, highestOption);
        conflictManager.updateStatus(_conflictID, 3); // 更新冲突状态为投票中
        // 更新管理者的统计信息
        managerManager.incrementFinishedEvent(msg.sender);
        managerManager.decrementOnGoingEvent(msg.sender);
        emit ConflictResolved(_conflictID);
    }

    // TestEventFunction
    function testEvent() public {
        emit TestEvent(msg.sender, msg.sig, msg.data, block.number);
    }
}
