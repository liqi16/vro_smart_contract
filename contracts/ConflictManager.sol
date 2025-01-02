// SPDX-License-Identifier: MIT
pragma solidity >=0.4.22 <0.9.0;

import "./ConflictLib.sol";

contract ConflictManager {
    mapping(uint256 => ConflictLib.Conflict) public conflicts;
    uint256 public conflictCounter = 0;
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

    function initialize(address _vro_contract) public onlyDeployer {
        vro_contract = _vro_contract;
        isInitialized = true;
    }

    // event ReportConflict(uint256 conflictID, string IP_Prefix, uint[] MOAS, address Validator, address Reporter);
    // event ChangeValidator(uint256 conflictID, address PreviousValidator, address NewValidator);

    function reportConflict(string memory _IP_Prefix, uint[] memory _MOAS, address validator, address reporter) public onlyVRO returns (uint,uint) {
        uint conflictID = conflictCounter;
        ConflictLib.Conflict memory newConflict = ConflictLib.CreateConflict(conflictID, _IP_Prefix, _MOAS, validator, reporter);
        uint options = newConflict.Options;
        conflicts[conflictID] = newConflict;
        conflictCounter = conflictCounter + 1;
        // emit ReportConflict(conflictID, _IP_Prefix, _MOAS, validator, reporter);
        return (conflictID, options);
    }

    function isValidator(uint256 conflictID, address addr) public view onlyVRO returns (bool) {
        return conflicts[conflictID].Validator == addr;
    }

    function getStatus(uint256 conflictID) public view onlyVRO returns (uint) {
        return conflicts[conflictID].Status;
    }

    function confirmConflict(uint256 conflictID) public onlyVRO {
        conflicts[conflictID].Status = 1;
    }

    function changeValidator(uint256 conflictID, address newValidator) public onlyVRO {
        // address previousValidator = conflicts[conflictID].Validator;
        conflicts[conflictID].Validator = newValidator;
        // emit ChangeValidator(conflictID, previousValidator, newValidator);
    }

    function registerVoters(uint256 conflictID, uint[] memory voters) public onlyVRO {
        for (uint i = 0; i < voters.length; i++) {
            conflicts[conflictID].Voters.push(voters[i]);
        }
    }

    function updateStatus(uint256 conflictID, uint status) public onlyVRO {
        conflicts[conflictID].Status = status;
    }

    function getOptions(uint256 conflictID) public view onlyVRO returns (uint) {
        return conflicts[conflictID].Options;
    }

    function getVoterCount(uint256 conflictID) public view onlyVRO returns (uint) {
        return conflicts[conflictID].Voters.length;
    }

    function resolveConflict(uint256 conflictID, uint option) public onlyVRO {
        conflicts[conflictID].Result = option;
    }

    function getConflictByID(uint256 conflictID) public view onlyVRO returns (ConflictLib.Conflict memory) {
        return conflicts[conflictID];
    }

    function getConflictResult(uint256 conflictID) public view onlyVRO returns (uint) {
        return conflicts[conflictID].Result;
    }

    function getConflictStatus(uint256 conflictID) public view onlyVRO returns (uint) {
        return conflicts[conflictID].Status;
    }

    function getVoterIndices(uint256 conflictID) public view onlyVRO returns (uint[] memory) {
        return conflicts[conflictID].Voters;
    }

}
