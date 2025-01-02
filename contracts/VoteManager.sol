// SPDX-License-Identifier: MIT
pragma solidity >=0.4.22 <0.9.0;

import "./ZKTreeVote.sol";

contract VoteManager {
    struct VoteInstance {
        ZKTreeVote voteContract;
        bool exists;
    }

    mapping(uint256 => VoteInstance) public votes;
    uint32 immutable LEVEL = 20;
    address public addr;
    IVerifier verifier;
    address immutable deployer;
    address public vro_contract;
    bool public isInitialized;

    constructor() {
        deployer = msg.sender;
    }

    modifier onlyDeployer() {
        require(msg.sender == deployer, "ER1");
        _;
    }

    modifier onlyVRO() {
        require(isInitialized == true, "ER3");
        require(msg.sender == vro_contract, "ER2");
        _;
    }

    function initialize(address _vro_contract,address _addr, IVerifier _verifier) public onlyDeployer {
        vro_contract = _vro_contract;
        isInitialized = true;
        addr = _addr;
        verifier = _verifier;
    }

    function createVote(uint256 conflictID, uint options) public onlyVRO returns (bool) {
        ZKTreeVote newVote = new ZKTreeVote(LEVEL, addr, verifier, options);
        votes[conflictID] = VoteInstance(newVote, true);
        return true;
    }

    function getVoteAddress(uint256 conflictID) public view onlyVRO returns (address) {
        require(votes[conflictID].exists, "Vote does not exist");
        return address(votes[conflictID].voteContract);
    }

    function registerValidator(uint256 conflictID, address validator) public onlyVRO returns (bool) {
        require(votes[conflictID].exists, "Vote does not exist");
        votes[conflictID].voteContract.registerValidator(validator);
        return true;
    }

    function registerCommitments(uint256 conflictID, uint256[] memory _uniqueHash, uint256[] memory _commitment) public onlyVRO returns (bool) {
        require(votes[conflictID].exists, "Vote does not exist");
        require(_uniqueHash.length == _commitment.length, "Length of uniqueHash and commitment should be the same");
        for (uint i = 0; i < _uniqueHash.length; i++) {
            votes[conflictID].voteContract.registerCommitment(_uniqueHash[i], _commitment[i]);
        }
        return true;
    }

    function vote(uint256 conflictID, uint _option, uint _nullifier, uint _root, uint[2] memory _proof_a, uint[2][2] memory _proof_b, uint[2] memory _proof_c) public onlyVRO returns (bool) {
        require(votes[conflictID].exists, "Vote does not exist");
        votes[conflictID].voteContract.vote(_option, _nullifier, _root, _proof_a, _proof_b, _proof_c);
        return true;
    }

    function getOptionCounter(uint256 conflictID, uint option) public view onlyVRO returns (uint) {
        require(votes[conflictID].exists, "Vote does not exist");
        return votes[conflictID].voteContract.getOptionCounter(option);
    }

    function getTotalVotes(uint256 conflictID) public view onlyVRO returns (uint) {
        require(votes[conflictID].exists, "Vote does not exist");
        uint sumCount = 0;
		for (uint i = 0; i < votes[conflictID].voteContract.getOptions(); i++) {
			sumCount += votes[conflictID].voteContract.getOptionCounter(i);
		}
		return sumCount;
    }
}
