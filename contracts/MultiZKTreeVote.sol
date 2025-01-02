// SPDX-License-Identifier: MIT
pragma solidity ^0.8.17;

import "./ZKTreeVote.sol";

contract MultiZKTreeVote {
    
    struct VoteInstance {
        ZKTreeVote voteContract;
        bool exists;
    }

    address public owner;
    mapping(uint256 => VoteInstance) public votes;
    uint256 public voteCounter = 0;

    constructor() {
        owner = msg.sender;
    }

    modifier onlyOwner() {
        require(msg.sender == owner, "Not the owner");
        _;
    }  

    event NewVoteCreated(uint256 voteId, address voteAddress);

    function createNewVote(uint32 _levels, address _addr, IVerifier _verifier, uint _numOptions) external onlyOwner {
        voteCounter++;
        ZKTreeVote newVote = new ZKTreeVote(_levels, _addr, _verifier, _numOptions);
        votes[voteCounter] = VoteInstance(newVote, true);
        emit NewVoteCreated(voteCounter, address(newVote));
    }

    function getVoteAddress(uint256 _voteId) public view returns (address) {
        require(votes[_voteId].exists, "Vote instance does not exist");
        return address(votes[_voteId].voteContract);
    }

    function registerValidator(uint256 _voteId, address _validator) external {
        require(votes[_voteId].exists, "Vote instance does not exist");
        votes[_voteId].voteContract.registerValidator(_validator);
    }

    function registerCommitment(uint256 _voteId, uint256 _uniqueHash, uint256 _commitment) external {
        require(votes[_voteId].exists, "Vote instance does not exist");
        votes[_voteId].voteContract.registerCommitment(_uniqueHash, _commitment);
    }

    function vote(
        uint256 _voteId,
        uint _option,
        uint256 _nullifier,
        uint256 _root,
        uint[2] memory _proof_a,
        uint[2][2] memory _proof_b,
        uint[2] memory _proof_c
    ) external {
        require(votes[_voteId].exists, "Vote instance does not exist");
        votes[_voteId].voteContract.vote(_option, _nullifier, _root, _proof_a, _proof_b, _proof_c);
    }

    function getOptionCounter(uint256 _voteId, uint _option) public view returns (uint) {
        require(votes[_voteId].exists, "Vote instance does not exist");
        return votes[_voteId].voteContract.getOptionCounter(_option);
    }
}
